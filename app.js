/**
 * Smart Trip Budget Planner - Main Application Controller
 * Orchestrates algorithms, views, state management, and user interactions.
 */

import { StorageManager } from './components/storage.js';
import { BudgetCharts } from './components/charts.js';
import { BudgetOptimizer } from './components/budgetOptimizer.js';
import { RouteGraphVisualizer } from './components/routeGraph.js';
import { MatrixInspector } from './components/matrixInspector.js';
import { ItineraryPlanner } from './components/itineraryPlanner.js';
import { AlgorithmAnalysis } from './components/algorithmAnalysis.js';
import { runDijkstra } from './algorithms/dijkstra.js';
import { buildAdjacencyList, SAMPLE_TRIP } from './data/sampleData.js';

class AppController {
    constructor() {
        this.trips = StorageManager.getTrips();
        this.currentTrip = this.trips[0] || JSON.parse(JSON.stringify(SAMPLE_TRIP));
        this.currentView = 'dashboard';
        this.wizardStep = 1;
        this.tempTripDraft = null;

        // Visualizer instances
        this.routeGraph = null;
        this.matrixInspector = null;
        this.dijkstraResult = null;
        this.autoPlayInterval = null;

        this.init();
    }

    init() {
        // Initialize Components
        this.routeGraph = new RouteGraphVisualizer('svg-graph-container');
        this.matrixInspector = new MatrixInspector('floyd-warshall-container');

        // Setup DOM Listeners
        this.setupNavigation();
        this.setupHeaderActions();
        this.setupDashboardActions();
        this.setupWizard();
        this.setupModals();
        this.setupBudgetOptimizer();
        this.setupRoutePlanner();

        // Run full optimization pipeline on active trip
        this.runFullPipeline(false);
    }

    /**
     * Run complete optimization pipeline
     */
    runFullPipeline(showFeedback = true) {
        // 1. Budget & 0/1 Knapsack
        this.budgetResult = BudgetOptimizer.calculateTripBudget(this.currentTrip);

        // 2. TSP & Daily Itinerary
        const selectedActs = this.budgetResult.knapsackResult.selectedActivities || [];
        this.itineraryResult = ItineraryPlanner.generateOptimizedPlan(this.currentTrip, selectedActs);

        // 3. Update active UI displays
        this.updateSidebarActiveTrip();
        this.renderDashboard();
        this.renderBudgetOptimizerView();
        this.renderRoutePlannerView();
        this.renderItineraryView();
        this.renderSavedTripsView();

        if (this.currentView === 'algorithm-analysis') {
            AlgorithmAnalysis.renderAnalysis('algorithm-analysis-mount', this.currentTrip);
        }

        if (showFeedback) {
            this.showGlobalAlert(
                `✓ Algorithmic optimization completed! 0/1 Knapsack selected ${selectedActs.length} activities; TSP optimized ${this.itineraryResult.selectedLocationIds.length} stops.`,
                'success'
            );
        }
    }

    /* =========================================================================
       Navigation & View Routing
       ========================================================================= */
    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-item');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetView = btn.getAttribute('data-view');
                this.navigateTo(targetView);
            });
        });

        // Quick navigation links on dashboard
        document.querySelectorAll('.pill-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-target');
                this.navigateTo(target);
            });
        });

        // Mobile sidebar toggle
        const toggleBtn = document.getElementById('mobile-sidebar-toggle');
        const sidebar = document.getElementById('app-sidebar');
        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
            });
        }
    }

    navigateTo(viewId) {
        this.currentView = viewId;

        // Update Nav UI
        document.querySelectorAll('.nav-item').forEach(btn => {
            if (btn.getAttribute('data-view') === viewId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update View Panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            if (panel.id === `view-${viewId}`) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        // Update Breadcrumbs
        const viewTitleMap = {
            'dashboard': 'Dashboard',
            'create-trip': 'Trip Creation Wizard',
            'budget-optimizer': 'Budget & 0/1 Knapsack Optimizer',
            'route-planner': 'Route Planner & Graph Analytics',
            'itinerary': 'Daily Itinerary & TSP Planner',
            'algorithm-analysis': 'AOA Complexity Analysis & Benchmarks',
            'saved-trips': 'Saved Trips Management',
            'about': 'About Academic Project'
        };

        const titleEl = document.getElementById('current-view-title');
        if (titleEl) {
            titleEl.textContent = viewTitleMap[viewId] || 'Trip Planner';
        }

        // Trigger view-specific re-renders
        if (viewId === 'dashboard') {
            this.renderDashboard();
        } else if (viewId === 'route-planner') {
            this.renderRoutePlannerView();
        } else if (viewId === 'budget-optimizer') {
            this.renderBudgetOptimizerView();
        } else if (viewId === 'itinerary') {
            this.renderItineraryView();
        } else if (viewId === 'algorithm-analysis') {
            AlgorithmAnalysis.renderAnalysis('algorithm-analysis-mount', this.currentTrip);
        } else if (viewId === 'saved-trips') {
            this.renderSavedTripsView();
        }

        // Close mobile sidebar if open
        const sidebar = document.getElementById('app-sidebar');
        if (sidebar) sidebar.classList.remove('mobile-open');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setupHeaderActions() {
        const resetBtn = document.getElementById('btn-quick-sample');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset to standard "Udaipur Explorer" sample trip?')) {
                    this.currentTrip = StorageManager.resetToSample();
                    this.trips = StorageManager.getTrips();
                    this.runFullPipeline(true);
                    this.navigateTo('dashboard');
                }
            });
        }

        const newTripBtn = document.getElementById('btn-header-new-trip');
        if (newTripBtn) {
            newTripBtn.addEventListener('click', () => {
                this.startTripCreation();
            });
        }
    }

    setupDashboardActions() {
        const createBtn = document.getElementById('dash-btn-create');
        if (createBtn) {
            createBtn.addEventListener('click', () => {
                this.startTripCreation();
            });
        }

        const runDemoBtn = document.getElementById('dash-btn-run-demo');
        if (runDemoBtn) {
            runDemoBtn.addEventListener('click', () => {
                this.runFullPipeline(true);
            });
        }

        const viewKnapBtn = document.getElementById('dash-btn-view-knapsack');
        if (viewKnapBtn) {
            viewKnapBtn.addEventListener('click', () => {
                this.navigateTo('budget-optimizer');
            });
        }
    }

    /* =========================================================================
       Dashboard Rendering & Smart Insights
       ========================================================================= */
    renderDashboard() {
        if (!this.budgetResult) return;

        const {
            totalBudget,
            totalEstimatedSpending,
            remainingBudget,
            isExceeded,
            actualCosts,
            caps,
            knapsackResult
        } = this.budgetResult;

        const curr = this.currentTrip.currency || '₹';

        // Update KPIs
        document.getElementById('kpi-trip-name').textContent = this.currentTrip.name;
        document.getElementById('kpi-trip-meta').textContent = `${this.currentTrip.days} Days • ${this.currentTrip.travelers} Travelers`;
        document.getElementById('kpi-total-budget').textContent = `${curr}${totalBudget.toLocaleString('en-IN')}`;
        document.getElementById('kpi-estimated-cost').textContent = `${curr}${totalEstimatedSpending.toLocaleString('en-IN')}`;

        const remEl = document.getElementById('kpi-remaining-budget');
        const statusEl = document.getElementById('kpi-budget-status');
        if (isExceeded) {
            remEl.textContent = `-${curr}${Math.abs(remainingBudget).toLocaleString('en-IN')}`;
            remEl.className = 'kpi-value text-danger';
            statusEl.textContent = 'Exceeded Budget Limit!';
        } else {
            remEl.textContent = `${curr}${remainingBudget.toLocaleString('en-IN')}`;
            remEl.className = 'kpi-value text-success';
            statusEl.textContent = 'Within Target Fund';
        }

        document.getElementById('dash-optim-mode-badge').textContent = `${this.currentTrip.mode || 'Balanced'} Mode`;

        // Render Progress Bar
        const progressContainer = document.getElementById('dash-budget-progress-container');
        BudgetCharts.renderProgressBar(progressContainer, totalEstimatedSpending, totalBudget, curr);

        // Render Donut Chart
        const chartCanvas = document.getElementById('dash-budget-donut-canvas');
        const chartData = [
            { label: 'Accommodation', value: actualCosts.accommodation, color: '#3b82f6' },
            { label: 'Transportation', value: actualCosts.transportation, color: '#06b6d4' },
            { label: 'Activities', value: actualCosts.activities, color: '#10b981' },
            { label: 'Food & Dining', value: actualCosts.food, color: '#f59e0b' },
            { label: 'Local Travel', value: actualCosts.localTravel, color: '#8b5cf6' },
            { label: 'Emergency Buffer', value: actualCosts.emergency, color: '#64748b' }
        ];
        BudgetCharts.renderDonutChart(chartCanvas, chartData, curr);

        // Render Legend
        const legendContainer = document.getElementById('dash-budget-legend');
        legendContainer.innerHTML = chartData.map(item => `
            <div class="legend-item-row">
                <div class="legend-left">
                    <span class="legend-color-dot" style="background-color: ${item.color};"></span>
                    <span>${item.label}</span>
                </div>
                <span class="legend-amount">${curr}${item.value.toLocaleString('en-IN')}</span>
            </div>
        `).join('');

        // Factual Algorithmic Insights
        const insightsContainer = document.getElementById('dash-insights-list');
        const selectedActs = knapsackResult.selectedActivities || [];
        const rejectedCount = knapsackResult.rejectedActivities ? knapsackResult.rejectedActivities.length : 0;
        const tourDistance = this.itineraryResult ? this.itineraryResult.tspResult.totalDistance.toFixed(1) : '0.0';

        insightsContainer.innerHTML = `
            <div class="insight-item">
                <span class="insight-icon">✓</span>
                <div>
                    Selected activities utilize <strong>${curr}${knapsackResult.totalCost.toLocaleString('en-IN')}</strong> of the 
                    <strong>${curr}${caps.activities.toLocaleString('en-IN')}</strong> activity budget, securing <strong>${knapsackResult.totalValue} experience points</strong>.
                </div>
            </div>
            <div class="insight-item">
                <span class="insight-icon">✓</span>
                <div>
                    TSP Branch & Bound computed an exact optimal multi-stop tour covering <strong>${tourDistance} km</strong> across Udaipur highlights.
                </div>
            </div>
            <div class="insight-item">
                <span class="insight-icon">✓</span>
                <div>
                    <strong>${rejectedCount} candidate activities</strong> were excluded by 0/1 Knapsack DP because including them would exceed the activity budget.
                </div>
            </div>
            <div class="insight-item">
                <span class="insight-icon">✓</span>
                <div>
                    Floyd-Warshall evaluated <strong>${Math.pow(this.currentTrip.locations.length, 3)} subproblems</strong> (O(V³)) to precompute pairwise transit distances.
                </div>
            </div>
        `;

        // Render Selected Activities Grid
        const actGrid = document.getElementById('dash-selected-activities-grid');
        actGrid.innerHTML = selectedActs.map(act => `
            <div class="activity-card">
                <div class="act-card-header">
                    <h4 class="act-card-title">${act.name}</h4>
                    <span class="act-card-badge">★ ${act.experience}/10</span>
                </div>
                <div class="act-card-details">
                    <span>📍 ${act.location}</span>
                    <span>⏱ ${act.duration} hrs</span>
                    <span>${curr}${act.groupCost.toLocaleString('en-IN')} (group)</span>
                </div>
                <p class="act-card-desc">${act.description || ''}</p>
            </div>
        `).join('');
    }

    updateSidebarActiveTrip() {
        const nameEl = document.getElementById('sidebar-active-trip-name');
        const budgetEl = document.getElementById('sidebar-active-trip-budget');
        if (nameEl && this.currentTrip) {
            nameEl.textContent = this.currentTrip.name;
        }
        if (budgetEl && this.currentTrip) {
            const curr = this.currentTrip.currency || '₹';
            budgetEl.textContent = `${curr}${Number(this.currentTrip.budget).toLocaleString('en-IN')} • ${this.currentTrip.travelers} Travelers`;
        }
    }

    /* =========================================================================
       Budget Optimizer View
       ========================================================================= */
    setupBudgetOptimizer() {
        // Re-optimize button
        const reoptBtn = document.getElementById('btn-reoptimize-trigger');
        const bannerReoptBtn = document.getElementById('btn-banner-reoptimize');

        const triggerReopt = () => {
            const result = BudgetOptimizer.reoptimizeBudget(this.currentTrip);
            this.currentTrip = result.updatedTrip;
            StorageManager.saveTrip(this.currentTrip);
            this.runFullPipeline(false);
            this.showGlobalAlert(result.message, 'success');
        };

        if (reoptBtn) reoptBtn.addEventListener('click', triggerReopt);
        if (bannerReoptBtn) bannerReoptBtn.addEventListener('click', triggerReopt);

        // Reset Allocations
        const resetAllocBtn = document.getElementById('btn-reset-allocations');
        if (resetAllocBtn) {
            resetAllocBtn.addEventListener('click', () => {
                this.currentTrip.budgetAllocation = {
                    transportation: 16,
                    accommodation: 28,
                    food: 20,
                    activities: 20,
                    localTravel: 8,
                    emergency: 8
                };
                StorageManager.saveTrip(this.currentTrip);
                this.runFullPipeline(false);
                this.showGlobalAlert('Budget allocations reset to smart defaults.', 'success');
            });
        }

        // Apply Allocations
        const applyAllocBtn = document.getElementById('btn-apply-allocations');
        if (applyAllocBtn) {
            applyAllocBtn.addEventListener('click', () => {
                StorageManager.saveTrip(this.currentTrip);
                this.runFullPipeline(true);
            });
        }
    }

    renderBudgetOptimizerView() {
        if (!this.budgetResult) return;

        const {
            caps,
            isExceeded,
            exceededBy,
            knapsackResult,
            transportAnalysis
        } = this.budgetResult;

        const curr = this.currentTrip.currency || '₹';

        // Budget Overflow Banner
        const banner = document.getElementById('budget-overflow-banner');
        const overflowText = document.getElementById('overflow-amount-text');
        if (banner) {
            if (isExceeded) {
                banner.classList.remove('hidden');
                overflowText.textContent = `Estimated spending exceeds budget by ${curr}${exceededBy.toLocaleString('en-IN')}. Click below to dynamically re-optimize.`;
            } else {
                banner.classList.add('hidden');
            }
        }

        // Render Category Sliders
        const slidersContainer = document.getElementById('budget-sliders-container');
        const alloc = this.currentTrip.budgetAllocation;
        const categories = [
            { key: 'accommodation', label: 'Accommodation', icon: '🏨' },
            { key: 'transportation', label: 'Transportation', icon: '🚆' },
            { key: 'activities', label: 'Activities', icon: '🎟️' },
            { key: 'food', label: 'Food & Dining', icon: '🍽️' },
            { key: 'localTravel', label: 'Local Travel', icon: '🚕' },
            { key: 'emergency', label: 'Emergency Buffer', icon: '🛡️' }
        ];

        slidersContainer.innerHTML = categories.map(cat => {
            const pct = alloc[cat.key] || 0;
            const amount = Math.round((this.currentTrip.budget * pct) / 100);
            return `
                <div class="slider-item">
                    <div class="slider-item-header">
                        <span class="slider-category-name">${cat.icon} ${cat.label}</span>
                        <span class="slider-val-tag" id="label-alloc-${cat.key}">${pct}% (${curr}${amount.toLocaleString('en-IN')})</span>
                    </div>
                    <input type="range" class="custom-range" min="0" max="60" value="${pct}" data-key="${cat.key}" id="slider-alloc-${cat.key}">
                </div>
            `;
        }).join('');

        // Attach slider change events with auto-normalization
        slidersContainer.querySelectorAll('.custom-range').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const key = e.target.getAttribute('data-key');
                this.currentTrip.budgetAllocation[key] = Number(e.target.value);
                const sum = Object.values(this.currentTrip.budgetAllocation).reduce((a, b) => a + b, 0);
                const badge = document.getElementById('alloc-sum-badge');
                if (badge) {
                    badge.textContent = `Sum: ${sum}%`;
                    badge.className = sum === 100 ? 'badge badge-blue' : 'badge badge-accent';
                }
                const amt = Math.round((this.currentTrip.budget * Number(e.target.value)) / 100);
                document.getElementById(`label-alloc-${key}`).textContent = `${e.target.value}% (${curr}${amt.toLocaleString('en-IN')})`;
            });
        });

        // Transport Optimizer Details
        const transportBox = document.getElementById('transport-optimizer-details');
        if (transportAnalysis && transportAnalysis.selectedTransport) {
            const chosen = transportAnalysis.selectedTransport;
            transportBox.innerHTML = `
                <div class="transport-card-active">
                    <div class="flex-between">
                        <div>
                            <h4 class="font-bold text-white text-base">${chosen.name}</h4>
                            <span class="text-xs text-muted">${chosen.description}</span>
                        </div>
                        <span class="badge badge-optimal">Recommended by Greedy</span>
                    </div>
                    <div class="kpi-grid mt-4" style="grid-template-columns: 1fr 1fr; margin-bottom: 0;">
                        <div class="tsp-metric-box">
                            <span class="tsp-metric-title">Cost for ${this.currentTrip.travelers} Travelers</span>
                            <span class="tsp-metric-val">${curr}${chosen.totalCost.toLocaleString('en-IN')}</span>
                        </div>
                        <div class="tsp-metric-box">
                            <span class="tsp-metric-title">Duration</span>
                            <span class="tsp-metric-val">${chosen.timeHours} Hours</span>
                        </div>
                    </div>
                    <div class="text-xs text-muted mt-4">
                        <strong>Strategy:</strong> ${transportAnalysis.strategy}
                    </div>
                </div>
            `;
        }

        // Knapsack Header Stats
        document.getElementById('knapsack-budget-display').textContent = `${curr}${caps.activities.toLocaleString('en-IN')}`;
        document.getElementById('knapsack-runtime').textContent = `${knapsackResult.executionTime.toFixed(2)} ms`;
        document.getElementById('knapsack-total-value').textContent = `${knapsackResult.totalValue} pts`;

        // Knapsack Selected List
        const selectedList = document.getElementById('knapsack-selected-list');
        selectedList.innerHTML = (knapsackResult.selectedActivities || []).map(act => `
            <div class="knapsack-act-card selected">
                <div>
                    <div class="act-info-title">${act.name}</div>
                    <div class="act-info-sub">📍 ${act.location} • ⏱ ${act.duration}h • ★ ${act.experience}/10</div>
                </div>
                <div class="act-meta-val">
                    ${curr}${act.groupCost.toLocaleString('en-IN')}
                </div>
            </div>
        `).join('') || '<div class="text-muted text-sm">No activities could fit within this budget.</div>';

        // Knapsack Rejected List
        const rejectedList = document.getElementById('knapsack-rejected-list');
        rejectedList.innerHTML = (knapsackResult.rejectedActivities || []).map(act => `
            <div class="knapsack-act-card rejected">
                <div>
                    <div class="act-info-title">${act.name}</div>
                    <div class="act-info-sub">📍 ${act.location} • Cost: ${curr}${act.groupCost.toLocaleString('en-IN')} • ★ ${act.experience}/10</div>
                    <div class="act-reason-tag">Reason: ${act.reason}</div>
                </div>
                <div class="act-meta-val text-danger">
                    Excluded
                </div>
            </div>
        `).join('') || '<div class="text-muted text-sm">All available activities were selected!</div>';

        // Greedy Comparison Box
        const greedyCompBody = document.getElementById('knapsack-greedy-comparison-body');
        if (knapsackResult.greedyComparison) {
            const gr = knapsackResult.greedyComparison;
            const diff = knapsackResult.totalValue - gr.totalValue;
            greedyCompBody.innerHTML = `
                <div class="grid-2-cols" style="gap: 16px;">
                    <div>
                        <strong>0/1 Knapsack Dynamic Programming:</strong>
                        <div>Total Value Achieved: <strong class="text-success">${knapsackResult.totalValue} pts</strong> (Cost: ${curr}${knapsackResult.totalCost.toLocaleString('en-IN')})</div>
                        <div class="text-xs text-muted">Explores optimal substructure across subproblems DP[i][w].</div>
                    </div>
                    <div>
                        <strong>Greedy Value/Cost Ratio Heuristic:</strong>
                        <div>Total Value Achieved: <strong>${gr.totalValue} pts</strong> (Cost: ${curr}${gr.totalCost.toLocaleString('en-IN')})</div>
                        <div class="text-xs text-muted">Locally sorts items by (value/cost) density. ${diff > 0 ? `<strong class="text-accent">DP outperformed Greedy by ${diff} points!</strong>` : 'Greedy matched DP on this instance.'}</div>
                    </div>
                </div>
            `;
        }

        // DP Table Sampling
        const dpWrapper = document.getElementById('knapsack-dp-table-wrapper');
        if (knapsackResult.dpTableSummary) {
            const { rows, columns } = knapsackResult.dpTableSummary;
            dpWrapper.innerHTML = `
                <table class="dp-matrix">
                    <thead>
                        <tr>
                            <th>Activity (i)</th>
                            <th>Cost</th>
                            <th>Value</th>
                            ${columns.map(c => `<th>w=${curr}${c.actualBudget}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td style="text-align: left;"><strong>${r.itemName}</strong></td>
                                <td>${r.itemCost > 0 ? curr + r.itemCost : '-'}</td>
                                <td>${r.itemValue > 0 ? r.itemValue : '-'}</td>
                                ${r.cells.map(c => `<td class="dp-cell ${c.isPicked ? 'picked' : ''}">${c.value}</td>`).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    }

    /* =========================================================================
       Route Planner & Graph Analytics
       ========================================================================= */
    setupRoutePlanner() {
        const runDijkBtn = document.getElementById('btn-run-dijkstra');
        if (runDijkBtn) {
            runDijkBtn.addEventListener('click', () => {
                this.executeDijkstra();
            });
        }

        // Stepper controls
        const prevBtn = document.getElementById('btn-step-prev');
        const nextBtn = document.getElementById('btn-step-next');
        const autoBtn = document.getElementById('btn-step-autoplay');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.routeGraph) {
                    this.routeGraph.prevStep((step, idx, total) => this.onDijkstraStepUpdate(step, idx, total));
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.routeGraph) {
                    this.routeGraph.nextStep((step, idx, total) => this.onDijkstraStepUpdate(step, idx, total));
                }
            });
        }

        if (autoBtn) {
            autoBtn.addEventListener('click', () => {
                if (this.autoPlayInterval) {
                    clearInterval(this.autoPlayInterval);
                    this.autoPlayInterval = null;
                    autoBtn.textContent = '▶ Auto Play';
                } else {
                    autoBtn.textContent = '⏸ Pause';
                    this.autoPlayInterval = setInterval(() => {
                        if (!this.routeGraph || this.routeGraph.stepIndex >= this.routeGraph.dijkstraResult.stepLog.length - 1) {
                            clearInterval(this.autoPlayInterval);
                            this.autoPlayInterval = null;
                            autoBtn.textContent = '▶ Auto Play';
                            return;
                        }
                        this.routeGraph.nextStep((step, idx, total) => this.onDijkstraStepUpdate(step, idx, total));
                    }, 650);
                }
            });
        }
    }

    renderRoutePlannerView() {
        // Render SVG Graph
        if (this.routeGraph) {
            this.routeGraph.setTrip(this.currentTrip);
        }

        // Render Floyd-Warshall Inspector
        if (this.matrixInspector) {
            this.matrixInspector.computeAndRender(this.currentTrip);
        }

        // Populate Dijkstra Selects
        const startSelect = document.getElementById('dijkstra-start-select');
        const endSelect = document.getElementById('dijkstra-end-select');
        const locations = this.currentTrip.locations || [];

        if (startSelect && endSelect) {
            const opts = locations.map(l => `<option value="${l.id}">${l.id} (${l.category})</option>`).join('');
            startSelect.innerHTML = opts;
            endSelect.innerHTML = opts;
            if (locations.length > 1) {
                endSelect.selectedIndex = 1;
            }
        }
    }

    executeDijkstra() {
        const startNode = document.getElementById('dijkstra-start-select').value;
        const endNode = document.getElementById('dijkstra-end-select').value;
        const resultBox = document.getElementById('dijkstra-result-box');

        if (!startNode || !endNode) {
            resultBox.innerHTML = `<div class="text-danger">Please select both start and destination locations.</div>`;
            return;
        }

        const graph = buildAdjacencyList(this.currentTrip.locations, this.currentTrip.connections);

        try {
            this.dijkstraResult = runDijkstra(graph, startNode, endNode);
            const res = this.dijkstraResult;

            if (res.unreachable) {
                resultBox.innerHTML = `
                    <div class="text-danger font-semibold">⚠️ ${res.message}</div>
                    <div class="text-xs text-muted mt-2">Dijkstra explored ${res.visitedNodes.length} nodes before determining no connected path exists.</div>
                `;
                return;
            }

            resultBox.innerHTML = `
                <div class="text-success font-bold text-base mb-2">✓ ${res.message}</div>
                <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 0;">
                    <div class="tsp-metric-box">
                        <span class="tsp-metric-title">Total Distance</span>
                        <span class="tsp-metric-val">${res.distance.toFixed(1)} km</span>
                    </div>
                    <div class="tsp-metric-box">
                        <span class="tsp-metric-title">Transit Time</span>
                        <span class="tsp-metric-val">${Math.round(res.travelTime)} mins</span>
                    </div>
                    <div class="tsp-metric-box">
                        <span class="tsp-metric-title">Heap Execution</span>
                        <span class="tsp-metric-val">${res.executionTime.toFixed(2)} ms</span>
                    </div>
                </div>
            `;

            // Highlight path on SVG
            if (this.routeGraph) {
                this.routeGraph.highlightDijkstraPath(res.path);
                this.routeGraph.startDijkstraStepper(res, (step, idx, total) => {
                    this.onDijkstraStepUpdate(step, idx, total);
                });

                // Enable stepper buttons
                document.getElementById('btn-step-prev').disabled = false;
                document.getElementById('btn-step-next').disabled = false;
                document.getElementById('btn-step-autoplay').disabled = false;
            }
        } catch (e) {
            resultBox.innerHTML = `<div class="text-danger">Error running Dijkstra: ${e.message}</div>`;
        }
    }

    onDijkstraStepUpdate(step, idx, total) {
        const ind = document.getElementById('stepper-step-indicator');
        const log = document.getElementById('stepper-log-message');
        if (ind) ind.textContent = `Step ${idx + 1} / ${total}`;
        if (log && step) {
            log.textContent = `[${step.type}] ${step.message}`;
        }
    }

    /* =========================================================================
       Daily Itinerary & TSP View
       ========================================================================= */
    renderItineraryView() {
        if (!this.itineraryResult) return;

        const { selectedLocationIds, tspResult, dailySchedule } = this.itineraryResult;

        // TSP Stops Count Badge
        document.getElementById('tsp-stops-count').textContent = `${selectedLocationIds.length} Stops`;

        // TSP Solution Metrics
        const metricsContainer = document.getElementById('tsp-solution-metrics');
        metricsContainer.innerHTML = `
            <div class="tsp-metric-box">
                <span class="tsp-metric-title">Branch & Bound Tour</span>
                <span class="tsp-metric-val text-success">${tspResult.totalDistance.toFixed(1)} km</span>
            </div>
            <div class="tsp-metric-box">
                <span class="tsp-metric-title">States Explored</span>
                <span class="tsp-metric-val">${tspResult.nodesExplored} states</span>
            </div>
            <div class="tsp-metric-box">
                <span class="tsp-metric-title">Branches Pruned</span>
                <span class="tsp-metric-val text-primary">${tspResult.branchesPruned} branches</span>
            </div>
            <div class="tsp-metric-box">
                <span class="tsp-metric-title">Runtime</span>
                <span class="tsp-metric-val">${tspResult.executionTime.toFixed(2)} ms</span>
            </div>
        `;

        // Tour Breadcrumb
        const breadcrumbEl = document.getElementById('tsp-tour-breadcrumb');
        breadcrumbEl.innerHTML = `
            <strong>Optimized Visiting Sequence:</strong>
            ${tspResult.tour.map((stop, idx) => `
                <span class="chip">${idx + 1}. ${stop}</span>
                ${idx < tspResult.tour.length - 1 ? ' ➔ ' : ''}
            `).join('')}
        `;

        // Daily Schedule Cards
        const daysContainer = document.getElementById('itinerary-days-container');
        daysContainer.innerHTML = dailySchedule.map(day => `
            <div class="timeline-day-card">
                <div class="day-card-header">
                    <h3 class="day-title">${day.title}</h3>
                    <span class="badge badge-cyan">${day.events.filter(e => e.type === 'ACTIVITY').length} Highlights</span>
                </div>
                <div class="timeline-events-list">
                    ${day.events.map(event => `
                        <div class="timeline-event">
                            <span class="event-dot ${event.type.toLowerCase()}"></span>
                            <div class="event-time">${event.time}</div>
                            <div class="event-card">
                                <div class="event-title">
                                    ${event.type === 'TRANSIT' ? `🚗 ${event.from} → ${event.to} (${event.distance.toFixed(1)} km)` :
                                      event.type === 'FOOD' ? `🍽️ ${event.title}` :
                                      event.type === 'LEISURE' ? `🌙 ${event.title}` : `📍 ${event.title}`}
                                </div>
                                <div class="event-desc">${event.description} • Duration: ${event.durationMins} mins</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /* =========================================================================
       Saved Trips View
       ========================================================================= */
    renderSavedTripsView() {
        const container = document.getElementById('saved-trips-container');
        if (!container) return;

        this.trips = StorageManager.getTrips();

        container.innerHTML = this.trips.map(trip => {
            const isActive = trip.id === this.currentTrip.id;
            const curr = trip.currency || '₹';
            return `
                <div class="trip-card ${isActive ? 'border-primary' : ''}">
                    <div class="trip-card-header">
                        <div>
                            <h4 class="trip-card-title">${trip.name}</h4>
                            <div class="trip-card-meta">${trip.days} Days • ${trip.travelers} Travelers • ${trip.mode} Mode</div>
                        </div>
                        ${isActive ? '<span class="badge badge-cyan">Active</span>' : ''}
                    </div>
                    <div class="trip-card-costs">
                        <div>
                            <span class="text-xs text-muted">Budget:</span>
                            <strong>${curr}${Number(trip.budget).toLocaleString('en-IN')}</strong>
                        </div>
                        <div>
                            <span class="text-xs text-muted">Locations:</span>
                            <strong>${trip.locations ? trip.locations.length : 0} spots</strong>
                        </div>
                    </div>
                    <div class="trip-card-actions">
                        <button class="btn btn-primary btn-sm btn-open-trip" data-id="${trip.id}">Open</button>
                        <button class="btn btn-secondary btn-sm btn-duplicate-trip" data-id="${trip.id}">Copy</button>
                        <button class="btn btn-secondary btn-sm btn-rename-trip" data-id="${trip.id}">Rename</button>
                        ${this.trips.length > 1 ? `<button class="btn btn-danger btn-sm btn-delete-trip" data-id="${trip.id}">Delete</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        // Saved trip action handlers
        container.querySelectorAll('.btn-open-trip').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const t = StorageManager.getTripById(id);
                if (t) {
                    this.currentTrip = t;
                    this.runFullPipeline(true);
                    this.navigateTo('dashboard');
                }
            });
        });

        container.querySelectorAll('.btn-duplicate-trip').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const copy = StorageManager.duplicateTrip(id);
                if (copy) {
                    this.currentTrip = copy;
                    this.runFullPipeline(true);
                    this.navigateTo('dashboard');
                }
            });
        });

        container.querySelectorAll('.btn-rename-trip').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const newName = prompt('Enter new trip name:');
                if (newName && newName.trim()) {
                    StorageManager.renameTrip(id, newName);
                    if (this.currentTrip.id === id) {
                        this.currentTrip.name = newName.trim();
                    }
                    this.renderSavedTripsView();
                    this.updateSidebarActiveTrip();
                }
            });
        });

        container.querySelectorAll('.btn-delete-trip').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                if (confirm('Delete this trip?')) {
                    this.trips = StorageManager.deleteTrip(id);
                    if (this.currentTrip.id === id) {
                        this.currentTrip = this.trips[0];
                    }
                    this.runFullPipeline(false);
                    this.renderSavedTripsView();
                }
            });
        });

        const exportBtn = document.getElementById('btn-export-trips');
        if (exportBtn) {
            exportBtn.onclick = () => StorageManager.exportTripsJSON();
        }

        const newBtn = document.getElementById('btn-saved-new-trip');
        if (newBtn) {
            newBtn.onclick = () => this.startTripCreation();
        }
    }

    /* =========================================================================
       Create Trip Wizard
       ========================================================================= */
    startTripCreation() {
        this.tempTripDraft = JSON.parse(JSON.stringify(this.currentTrip));
        this.tempTripDraft.id = 'trip-' + Date.now();
        this.tempTripDraft.name = 'New Custom Trip';
        this.wizardStep = 1;

        // Populate step 1
        document.getElementById('input-trip-name').value = this.tempTripDraft.name;
        document.getElementById('input-travelers').value = this.tempTripDraft.travelers;
        document.getElementById('input-days').value = this.tempTripDraft.days;
        document.getElementById('input-budget').value = this.tempTripDraft.budget;

        this.updateWizardView();
        this.navigateTo('create-trip');
    }

    setupWizard() {
        // Mode cards
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                if (this.tempTripDraft) {
                    this.tempTripDraft.mode = card.getAttribute('data-mode');
                }
            });
        });

        // Step Navigation Buttons
        document.getElementById('wizard-btn-to-2').onclick = () => this.goToWizardStep(2);
        document.getElementById('wizard-btn-back-1').onclick = () => this.goToWizardStep(1);

        document.getElementById('wizard-btn-to-3').onclick = () => this.goToWizardStep(3);
        document.getElementById('wizard-btn-back-2').onclick = () => this.goToWizardStep(2);

        document.getElementById('wizard-btn-to-4').onclick = () => this.goToWizardStep(4);
        document.getElementById('wizard-btn-back-3').onclick = () => this.goToWizardStep(3);

        document.getElementById('wizard-btn-to-5').onclick = () => this.goToWizardStep(5);
        document.getElementById('wizard-btn-back-4').onclick = () => this.goToWizardStep(4);

        // Execute All Optimization
        document.getElementById('wizard-btn-run-all').onclick = () => {
            // Save draft as current trip
            this.currentTrip = JSON.parse(JSON.stringify(this.tempTripDraft));
            StorageManager.saveTrip(this.currentTrip);
            this.runFullPipeline(true);
            this.navigateTo('dashboard');
        };

        // Stepper clickable steps
        document.querySelectorAll('.wizard-step').forEach(stepEl => {
            stepEl.addEventListener('click', () => {
                const s = Number(stepEl.getAttribute('data-step'));
                this.goToWizardStep(s);
            });
        });
    }

    goToWizardStep(step) {
        if (!this.tempTripDraft) this.startTripCreation();

        // Validate on step 1
        if (this.wizardStep === 1) {
            const name = document.getElementById('input-trip-name').value.trim();
            const travelers = Number(document.getElementById('input-travelers').value);
            const days = Number(document.getElementById('input-days').value);
            const budget = Number(document.getElementById('input-budget').value);

            if (!name || travelers <= 0 || days <= 0 || budget <= 0) {
                alert('Please enter valid positive values for all basic details.');
                return;
            }

            this.tempTripDraft.name = name;
            this.tempTripDraft.travelers = travelers;
            this.tempTripDraft.days = days;
            this.tempTripDraft.budget = budget;
        }

        this.wizardStep = step;
        this.updateWizardView();
    }

    updateWizardView() {
        // Stepper header
        document.querySelectorAll('.wizard-step').forEach(el => {
            const s = Number(el.getAttribute('data-step'));
            if (s === this.wizardStep) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });

        // Panes
        document.querySelectorAll('.wizard-pane').forEach((pane, idx) => {
            if (idx + 1 === this.wizardStep) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        // Populate table for current step
        if (this.wizardStep === 2) this.renderWizardLocations();
        if (this.wizardStep === 3) this.renderWizardConnections();
        if (this.wizardStep === 4) this.renderWizardActivities();
        if (this.wizardStep === 5) this.renderWizardReview();
    }

    renderWizardLocations() {
        const tbody = document.getElementById('tbody-locations');
        tbody.innerHTML = this.tempTripDraft.locations.map((loc, idx) => `
            <tr>
                <td><strong>${loc.id}</strong></td>
                <td><span class="badge badge-blue">${loc.category}</span></td>
                <td>${loc.description || '-'}</td>
                <td>
                    ${this.tempTripDraft.locations.length > 2 ? `
                        <button class="btn btn-danger btn-sm" onclick="window.__app.deleteWizardLocation(${idx})">Delete</button>
                    ` : '<span class="text-xs text-muted">Minimum 2 locations</span>'}
                </td>
            </tr>
        `).join('');
    }

    deleteWizardLocation(idx) {
        const loc = this.tempTripDraft.locations[idx];
        this.tempTripDraft.locations.splice(idx, 1);
        // remove dangling connections & activities
        this.tempTripDraft.connections = this.tempTripDraft.connections.filter(c => c.from !== loc.id && c.to !== loc.id);
        this.tempTripDraft.activities = this.tempTripDraft.activities.filter(a => a.location !== loc.id);
        this.renderWizardLocations();
    }

    renderWizardConnections() {
        const tbody = document.getElementById('tbody-connections');
        tbody.innerHTML = this.tempTripDraft.connections.map((conn, idx) => `
            <tr>
                <td><strong>${conn.from}</strong></td>
                <td><strong>${conn.to}</strong></td>
                <td>${conn.distance} km</td>
                <td>${conn.time} mins</td>
                <td>${conn.mode}</td>
                <td>${conn.bidirectional ? 'Bidirectional (↔)' : 'One-way (➔)'}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="window.__app.deleteWizardConnection(${idx})">Delete</button>
                </td>
            </tr>
        `).join('');
    }

    deleteWizardConnection(idx) {
        this.tempTripDraft.connections.splice(idx, 1);
        this.renderWizardConnections();
    }

    renderWizardActivities() {
        const tbody = document.getElementById('tbody-activities');
        const travelers = this.tempTripDraft.travelers || 2;
        tbody.innerHTML = this.tempTripDraft.activities.map((act, idx) => {
            const groupCost = (Number(act.costPerPerson) || 0) * travelers;
            return `
                <tr>
                    <td><strong>${act.name}</strong></td>
                    <td>${act.location}</td>
                    <td>₹${act.costPerPerson}</td>
                    <td>₹${groupCost.toLocaleString('en-IN')}</td>
                    <td>${act.duration}h</td>
                    <td>★ ${act.experience}/10</td>
                    <td>
                        <button class="btn btn-danger btn-sm" onclick="window.__app.deleteWizardActivity(${idx})">Delete</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    deleteWizardActivity(idx) {
        this.tempTripDraft.activities.splice(idx, 1);
        this.renderWizardActivities();
    }

    renderWizardReview() {
        const reviewEl = document.getElementById('wizard-review-summary');
        const draft = this.tempTripDraft;
        reviewEl.innerHTML = `
            <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 20px;">
                <div class="kpi-card">
                    <div class="kpi-info">
                        <span class="kpi-label">Trip Name</span>
                        <span class="kpi-value" style="font-size: 16px;">${draft.name}</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <span class="kpi-label">Travelers & Duration</span>
                        <span class="kpi-value" style="font-size: 16px;">${draft.travelers} people • ${draft.days} days</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <span class="kpi-label">Total Budget</span>
                        <span class="kpi-value" style="font-size: 16px;">₹${draft.budget.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-info">
                        <span class="kpi-label">Mode</span>
                        <span class="kpi-value" style="font-size: 16px;">${draft.mode}</span>
                    </div>
                </div>
            </div>
            <div class="grid-2-cols">
                <div class="content-card">
                    <h4 class="font-bold text-white mb-2">Graph Network</h4>
                    <p class="text-xs text-muted mb-4">${draft.locations.length} Locations • ${draft.connections.length} Weighted Connections</p>
                    <div class="route-chips">
                        ${draft.locations.map(l => `<span class="chip">${l.id}</span>`).join('')}
                    </div>
                </div>
                <div class="content-card">
                    <h4 class="font-bold text-white mb-2">Candidate Activities</h4>
                    <p class="text-xs text-muted mb-4">${draft.activities.length} candidate activities ready for 0/1 Knapsack optimization</p>
                    <div class="route-chips">
                        ${draft.activities.map(a => `<span class="chip">${a.name} (★${a.experience})</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    /* =========================================================================
       Modals for Adding Location, Connection, Activity
       ========================================================================= */
    setupModals() {
        // Expose app instance globally for inline button callbacks
        window.__app = this;

        // Location Modal
        const btnAddLoc = document.getElementById('btn-modal-add-loc');
        const modalLoc = document.getElementById('modal-location');
        const closeLoc = document.getElementById('btn-close-modal-loc');
        const cancelLoc = document.getElementById('btn-cancel-modal-loc');
        const saveLoc = document.getElementById('btn-save-modal-loc');

        if (btnAddLoc) btnAddLoc.onclick = () => modalLoc.classList.remove('hidden');
        if (closeLoc) closeLoc.onclick = () => modalLoc.classList.add('hidden');
        if (cancelLoc) cancelLoc.onclick = () => modalLoc.classList.add('hidden');

        if (saveLoc) {
            saveLoc.onclick = () => {
                const id = document.getElementById('input-loc-id').value.trim();
                const category = document.getElementById('select-loc-category').value;
                const desc = document.getElementById('input-loc-desc').value.trim();

                if (!id) {
                    alert('Please enter a location name/ID.');
                    return;
                }
                if (this.tempTripDraft.locations.some(l => l.id.toLowerCase() === id.toLowerCase())) {
                    alert('A location with this name already exists.');
                    return;
                }

                this.tempTripDraft.locations.push({ id, name: id, category, description: desc });
                modalLoc.classList.add('hidden');
                document.getElementById('input-loc-id').value = '';
                this.renderWizardLocations();
            };
        }

        // Connection Modal
        const btnAddConn = document.getElementById('btn-modal-add-conn');
        const modalConn = document.getElementById('modal-connection');
        const closeConn = document.getElementById('btn-close-modal-conn');
        const cancelConn = document.getElementById('btn-cancel-modal-conn');
        const saveConn = document.getElementById('btn-save-modal-conn');

        if (btnAddConn) {
            btnAddConn.onclick = () => {
                const fromSel = document.getElementById('select-conn-from');
                const toSel = document.getElementById('select-conn-to');
                const opts = this.tempTripDraft.locations.map(l => `<option value="${l.id}">${l.id}</option>`).join('');
                fromSel.innerHTML = opts;
                toSel.innerHTML = opts;
                if (this.tempTripDraft.locations.length > 1) toSel.selectedIndex = 1;
                modalConn.classList.remove('hidden');
            };
        }
        if (closeConn) closeConn.onclick = () => modalConn.classList.add('hidden');
        if (cancelConn) cancelConn.onclick = () => modalConn.classList.add('hidden');

        if (saveConn) {
            saveConn.onclick = () => {
                const from = document.getElementById('select-conn-from').value;
                const to = document.getElementById('select-conn-to').value;
                const dist = Number(document.getElementById('input-conn-dist').value);
                const time = Number(document.getElementById('input-conn-time').value);
                const mode = document.getElementById('select-conn-mode').value;
                const bidi = document.getElementById('check-conn-bidirectional').checked;

                if (from === to) {
                    alert('Origin and destination cannot be the same location.');
                    return;
                }
                if (dist <= 0 || time <= 0) {
                    alert('Distance and time must be positive numbers.');
                    return;
                }

                this.tempTripDraft.connections.push({
                    from,
                    to,
                    distance: dist,
                    time,
                    mode,
                    bidirectional: bidi
                });
                modalConn.classList.add('hidden');
                this.renderWizardConnections();
            };
        }

        // Activity Modal
        const btnAddAct = document.getElementById('btn-modal-add-act');
        const modalAct = document.getElementById('modal-activity');
        const closeAct = document.getElementById('btn-close-modal-act');
        const cancelAct = document.getElementById('btn-cancel-modal-act');
        const saveAct = document.getElementById('btn-save-modal-act');

        if (btnAddAct) {
            btnAddAct.onclick = () => {
                const locSel = document.getElementById('select-act-location');
                locSel.innerHTML = this.tempTripDraft.locations.map(l => `<option value="${l.id}">${l.id}</option>`).join('');
                modalAct.classList.remove('hidden');
            };
        }
        if (closeAct) closeAct.onclick = () => modalAct.classList.add('hidden');
        if (cancelAct) cancelAct.onclick = () => modalAct.classList.add('hidden');

        if (saveAct) {
            saveAct.onclick = () => {
                const name = document.getElementById('input-act-name').value.trim();
                const cost = Number(document.getElementById('input-act-cost').value);
                const duration = Number(document.getElementById('input-act-duration').value);
                const exp = Number(document.getElementById('input-act-experience').value);
                const loc = document.getElementById('select-act-location').value;
                const cat = document.getElementById('select-act-category').value;
                const desc = document.getElementById('input-act-desc').value.trim();

                if (!name || cost < 0 || duration <= 0 || exp < 1 || exp > 10) {
                    alert('Please enter valid activity details with experience score 1 to 10.');
                    return;
                }

                this.tempTripDraft.activities.push({
                    id: 'act-' + Date.now(),
                    name,
                    costPerPerson: cost,
                    duration,
                    experience: exp,
                    location: loc,
                    category: cat,
                    description: desc
                });
                modalAct.classList.add('hidden');
                document.getElementById('input-act-name').value = '';
                this.renderWizardActivities();
            };
        }
    }

    /* =========================================================================
       Global Alerts
       ========================================================================= */
    showGlobalAlert(message, type = 'success') {
        const box = document.getElementById('global-alert-box');
        if (!box) return;

        box.textContent = message;
        box.className = `global-alert ${type}`;
        box.classList.remove('hidden');

        setTimeout(() => {
            box.classList.add('hidden');
        }, 5000);
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AppController();
});

/**
 * Route Graph Component
 * Interactive SVG graph visualization for locations, connections,
 * Dijkstra path highlighting, and step-by-step algorithmic playback.
 */

import { runDijkstra } from '../algorithms/dijkstra.js';
import { buildAdjacencyList } from '../data/sampleData.js';

export class RouteGraphVisualizer {
    constructor(svgContainerId) {
        this.container = document.getElementById(svgContainerId);
        this.trip = null;
        this.highlightedPath = [];
        this.stepIndex = -1;
        this.dijkstraResult = null;
        this.playbackTimer = null;

        // Default layout coordinates for locations
        this.nodeCoordinates = {
            'Hotel': { x: 180, y: 190 },
            'City Palace': { x: 380, y: 120 },
            'Lake Pichola': { x: 560, y: 140 },
            'Fateh Sagar': { x: 540, y: 320 },
            'Museum': { x: 360, y: 280 },
            'Market': { x: 200, y: 360 },
            'Railway Station': { x: 70, y: 270 }
        };
    }

    setTrip(trip) {
        this.trip = trip;
        this.ensureCoordinates();
        this.render();
    }

    ensureCoordinates() {
        if (!this.trip || !this.trip.locations) return;
        const total = this.trip.locations.length;
        const centerX = 360;
        const centerY = 240;
        const radius = 170;

        this.trip.locations.forEach((loc, index) => {
            if (!this.nodeCoordinates[loc.id]) {
                const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
                this.nodeCoordinates[loc.id] = {
                    x: Math.round(centerX + radius * Math.cos(angle)),
                    y: Math.round(centerY + radius * Math.sin(angle))
                };
            }
        });
    }

    render(options = {}) {
        if (!this.container || !this.trip) return;

        const {
            activeStart = null,
            activeEnd = null,
            activeStep = null,
            highlightPath = this.highlightedPath || []
        } = options;

        const locations = this.trip.locations || [];
        const connections = this.trip.connections || [];

        const pathEdgeSet = new Set();
        if (highlightPath && highlightPath.length > 1) {
            for (let i = 0; i < highlightPath.length - 1; i++) {
                pathEdgeSet.add(`${highlightPath[i]}--${highlightPath[i + 1]}`);
                pathEdgeSet.add(`${highlightPath[i + 1]}--${highlightPath[i]}`);
            }
        }

        // SVG Dimensions
        const width = 720;
        const height = 480;

        let svgContent = `
            <svg viewBox="0 0 ${width} ${height}" class="route-graph-svg" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.8"/>
                        <stop offset="100%" stop-color="#06b6d4" stop-opacity="0.8"/>
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3.5" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                <!-- Background grid -->
                <rect width="${width}" height="${height}" fill="#0b1329" rx="12" />
                <g class="grid-lines" opacity="0.12">
                    ${Array.from({ length: 9 }).map((_, i) => `<line x1="${(i + 1) * 80}" y1="0" x2="${(i + 1) * 80}" y2="${height}" stroke="#38bdf8" stroke-dasharray="3,3" />`).join('')}
                    ${Array.from({ length: 6 }).map((_, i) => `<line x1="0" y1="${(i + 1) * 80}" x2="${width}" y2="${(i + 1) * 80}" stroke="#38bdf8" stroke-dasharray="3,3" />`).join('')}
                </g>

                <!-- Edges Layer -->
                <g class="graph-edges">
        `;

        // Render Connections
        connections.forEach(conn => {
            const u = this.nodeCoordinates[conn.from];
            const v = this.nodeCoordinates[conn.to];
            if (!u || !v) return;

            const isPathEdge = pathEdgeSet.has(`${conn.from}--${conn.to}`);
            const strokeColor = isPathEdge ? '#38bdf8' : '#334155';
            const strokeWidth = isPathEdge ? 4.5 : 2;
            const filterAttr = isPathEdge ? 'filter="url(#glow)"' : '';

            // Midpoint for label
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2;

            svgContent += `
                <g class="edge-group ${isPathEdge ? 'active-path-edge' : ''}">
                    <line x1="${u.x}" y1="${u.y}" x2="${v.x}" y2="${v.y}"
                          stroke="${strokeColor}" stroke-width="${strokeWidth}"
                          stroke-linecap="round" ${filterAttr} />
                    <rect x="${midX - 22}" y="${midY - 11}" width="44" height="20" rx="4"
                          fill="#0f172a" stroke="${isPathEdge ? '#38bdf8' : '#1e293b'}" stroke-width="1" />
                    <text x="${midX}" y="${midY + 3}" text-anchor="middle" font-size="10"
                          font-family="JetBrains Mono, monospace" fill="${isPathEdge ? '#38bdf8' : '#94a3b8'}" font-weight="600">
                        ${conn.distance}km
                    </text>
                </g>
            `;
        });

        svgContent += `</g><!-- Nodes Layer --><g class="graph-nodes">`;

        // Render Nodes
        locations.forEach(loc => {
            const coord = this.nodeCoordinates[loc.id];
            if (!coord) return;

            const isStart = activeStart === loc.id;
            const isEnd = activeEnd === loc.id;
            const isInPath = highlightPath.includes(loc.id);
            const isStepActive = activeStep && activeStep.node === loc.id;

            let fillColor = '#1e293b';
            let strokeColor = '#475569';
            let strokeWidth = 2.5;

            if (isStepActive) {
                fillColor = '#f59e0b';
                strokeColor = '#fef08a';
                strokeWidth = 4;
            } else if (isStart) {
                fillColor = '#10b981';
                strokeColor = '#a7f3d0';
                strokeWidth = 3.5;
            } else if (isEnd) {
                fillColor = '#ef4444';
                strokeColor = '#fecaca';
                strokeWidth = 3.5;
            } else if (isInPath) {
                fillColor = '#0284c7';
                strokeColor = '#7dd3fc';
                strokeWidth = 3.5;
            }

            // Category badge icon
            const catIcon = loc.category === 'Accommodation' ? '🏨' :
                loc.category === 'Transport' ? '🚉' :
                loc.category === 'Shopping' ? '🛍️' :
                loc.category === 'Food' ? '🍽️' : '📍';

            svgContent += `
                <g class="node-group" data-node-id="${loc.id}" style="cursor: pointer;">
                    <circle cx="${coord.x}" cy="${coord.y}" r="22"
                            fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />
                    <text x="${coord.x}" y="${coord.y + 4}" text-anchor="middle" font-size="12">
                        ${catIcon}
                    </text>
                    <rect x="${coord.x - 48}" y="${coord.y + 26}" width="96" height="18" rx="4"
                          fill="#0f172a" fill-opacity="0.9" stroke="#1e293b" />
                    <text x="${coord.x}" y="${coord.y + 39}" text-anchor="middle" font-size="10.5"
                          font-family="Inter, sans-serif" font-weight="600" fill="#f1f5f9">
                        ${loc.id}
                    </text>
                </g>
            `;
        });

        svgContent += `</g></svg>`;

        this.container.innerHTML = svgContent;

        // Attach click listeners to nodes
        const nodeEls = this.container.querySelectorAll('.node-group');
        nodeEls.forEach(el => {
            el.addEventListener('click', () => {
                const nodeId = el.getAttribute('data-node-id');
                if (options.onNodeClick) {
                    options.onNodeClick(nodeId);
                }
            });
        });
    }

    highlightDijkstraPath(path) {
        this.highlightedPath = path;
        this.render({ highlightPath: path });
    }

    startDijkstraStepper(dijkstraResult, onStepChange) {
        this.dijkstraResult = dijkstraResult;
        this.stepIndex = 0;
        this.updateStep(onStepChange);
    }

    nextStep(onStepChange) {
        if (!this.dijkstraResult || !this.dijkstraResult.stepLog) return;
        if (this.stepIndex < this.dijkstraResult.stepLog.length - 1) {
            this.stepIndex++;
            this.updateStep(onStepChange);
        }
    }

    prevStep(onStepChange) {
        if (!this.dijkstraResult || !this.dijkstraResult.stepLog) return;
        if (this.stepIndex > 0) {
            this.stepIndex--;
            this.updateStep(onStepChange);
        }
    }

    updateStep(onStepChange) {
        const step = this.dijkstraResult.stepLog[this.stepIndex];
        const visitedSoFar = this.dijkstraResult.stepLog
            .slice(0, this.stepIndex + 1)
            .filter(s => s.type === 'VISIT_NODE')
            .map(s => s.node);

        this.render({
            activeStep: step,
            highlightPath: visitedSoFar
        });

        if (onStepChange) {
            onStepChange(step, this.stepIndex, this.dijkstraResult.stepLog.length);
        }
    }
}

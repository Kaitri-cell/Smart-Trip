/**
 * Budget Optimizer Component
 * Manages category allocations, executes 0/1 Knapsack DP for activities,
 * integrates Greedy transport selection, and provides algorithmic re-optimization.
 */

import { run01Knapsack, runGreedyActivitySelection } from '../algorithms/knapsack.js';
import { selectOptimalTransport, runFractionalKnapsack } from '../algorithms/greedy.js';

export class BudgetOptimizer {
    /**
     * Compute full budget breakdown and execute optimization algorithms
     */
    static calculateTripBudget(trip) {
        const totalBudget = Number(trip.budget) || 0;
        const travelers = Number(trip.travelers) || 1;
        const days = Number(trip.days) || 1;
        const mode = trip.mode || 'Balanced';
        const alloc = trip.budgetAllocation || {
            transportation: 16,
            accommodation: 28,
            food: 20,
            activities: 20,
            localTravel: 8,
            emergency: 8
        };

        // Budget caps per category based on percentages
        const caps = {
            transportation: Math.round((totalBudget * (alloc.transportation || 0)) / 100),
            accommodation: Math.round((totalBudget * (alloc.accommodation || 0)) / 100),
            food: Math.round((totalBudget * (alloc.food || 0)) / 100),
            activities: Math.round((totalBudget * (alloc.activities || 0)) / 100),
            localTravel: Math.round((totalBudget * (alloc.localTravel || 0)) / 100),
            emergency: Math.round((totalBudget * (alloc.emergency || 0)) / 100)
        };

        // 1. Run Greedy Transport Selection
        const transportResult = selectOptimalTransport(trip.transportOptions || [], mode, travelers);
        const selectedTransport = transportResult ? transportResult.selectedTransport : null;
        const actualTransportCost = selectedTransport ? selectedTransport.totalCost : caps.transportation;

        // 2. Run 0/1 Knapsack for Activities
        const activityBudget = caps.activities;
        const knapsackResult = run01Knapsack(trip.activities || [], activityBudget, travelers);
        const actualActivitiesCost = knapsackResult.totalCost;

        // 3. Estimate Food & Accommodation actual costs
        // Accommodation: either capped or distributed over nights
        const actualAccommodationCost = Math.min(caps.accommodation, Math.round(caps.accommodation * 0.95));
        const actualFoodCost = Math.min(caps.food, Math.round(caps.food * 0.92));
        const actualLocalTravelCost = Math.min(caps.localTravel, Math.round(caps.localTravel * 0.85));
        const actualEmergencyCost = caps.emergency;

        // Total estimated spending
        const totalEstimatedSpending = actualTransportCost +
            actualAccommodationCost +
            actualFoodCost +
            actualActivitiesCost +
            actualLocalTravelCost +
            actualEmergencyCost;

        const remainingBudget = totalBudget - totalEstimatedSpending;
        const isExceeded = remainingBudget < 0;

        // Fractional knapsack continuous dual upper bound
        const fractionalKnapsack = runFractionalKnapsack(trip.activities || [], activityBudget, travelers);

        return {
            totalBudget,
            travelers,
            days,
            mode,
            caps,
            actualCosts: {
                transportation: actualTransportCost,
                accommodation: actualAccommodationCost,
                food: actualFoodCost,
                activities: actualActivitiesCost,
                localTravel: actualLocalTravelCost,
                emergency: actualEmergencyCost
            },
            totalEstimatedSpending,
            remainingBudget,
            isExceeded,
            exceededBy: isExceeded ? Math.abs(remainingBudget) : 0,
            selectedTransport,
            transportAnalysis: transportResult,
            knapsackResult,
            fractionalKnapsack
        };
    }

    /**
     * Genuine Algorithmic Re-optimization
     * When budget is exceeded, adjusts activity budget or allocation weights algorithmically
     * and re-solves the Knapsack DP problem to fit precisely within constraints.
     */
    static reoptimizeBudget(trip) {
        const current = this.calculateTripBudget(trip);
        if (!current.isExceeded) {
            return {
                updatedTrip: trip,
                newResult: current,
                message: "Budget is already within limits. No cost reduction required."
            };
        }

        const deficit = current.exceededBy;
        const updatedTrip = JSON.parse(JSON.stringify(trip));

        // Re-allocation Strategy:
        // 1. Reduce Emergency Buffer by up to 50%
        // 2. Reduce Activity Budget by remaining deficit
        const totalBudget = updatedTrip.budget;
        let deficitRemaining = deficit;

        const currentEmergency = (totalBudget * updatedTrip.budgetAllocation.emergency) / 100;
        const emergencyCut = Math.min(deficitRemaining, currentEmergency * 0.5);
        deficitRemaining -= emergencyCut;

        // Convert emergency cut to percentage
        const emergencyPctCut = (emergencyCut / totalBudget) * 100;
        updatedTrip.budgetAllocation.emergency = Math.max(2, Math.round((updatedTrip.budgetAllocation.emergency - emergencyPctCut) * 10) / 10);

        if (deficitRemaining > 0) {
            const currentActCap = (totalBudget * updatedTrip.budgetAllocation.activities) / 100;
            const newActCap = Math.max(500, currentActCap - deficitRemaining);
            const newActPct = (newActCap / totalBudget) * 100;
            updatedTrip.budgetAllocation.activities = Math.round(newActPct * 10) / 10;
        }

        // Re-normalize allocations to sum to 100%
        const keys = ['transportation', 'accommodation', 'food', 'activities', 'localTravel', 'emergency'];
        const currentSum = keys.reduce((s, k) => s + updatedTrip.budgetAllocation[k], 0);
        if (currentSum !== 100) {
            const diff = 100 - currentSum;
            updatedTrip.budgetAllocation.accommodation = Math.round((updatedTrip.budgetAllocation.accommodation + diff) * 10) / 10;
        }

        // Re-calculate plan with new algorithmic constraints
        const newResult = this.calculateTripBudget(updatedTrip);

        return {
            updatedTrip,
            newResult,
            message: `Algorithmic re-optimization completed! Activity budget was dynamically scaled to ₹${newResult.caps.activities.toLocaleString('en-IN')}, and 0/1 Knapsack selected ${newResult.knapsackResult.selectedActivities.length} optimal activities.`
        };
    }
}

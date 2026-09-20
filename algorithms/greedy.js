/**
 * Greedy Optimization Algorithms
 *
 * Implements:
 * 1. Multi-criteria Transportation Selection Greedy Strategy
 * 2. Fractional Knapsack Greedy Strategy (Theoretical Upper Bound)
 *
 * Academic Notes:
 * - A greedy algorithm builds up a solution piece by piece, always choosing the next piece
 *   that offers the most immediate benefit (greedy choice property).
 * - Greedy is PROVABLY OPTIMAL for the Fractional Knapsack problem.
 * - Greedy is a HEURISTIC (suboptimal) for 0/1 Knapsack and TSP.
 */

export function selectOptimalTransport(options, mode = 'Balanced', travelers = 1) {
    if (!options || options.length === 0) return null;

    const evaluated = options.map(opt => {
        const totalCost = (Number(opt.costPerPerson) || 0) * travelers;
        const timeHours = Number(opt.durationHours) || 1;
        return {
            ...opt,
            totalCost,
            timeHours
        };
    });

    const maxCost = Math.max(...evaluated.map(o => o.totalCost), 1);
    const minCost = Math.min(...evaluated.map(o => o.totalCost), 0);
    const maxTime = Math.max(...evaluated.map(o => o.timeHours), 1);
    const minTime = Math.min(...evaluated.map(o => o.timeHours), 0.1);

    // Weights according to user's selected optimization mode
    let weightCost = 0.5;
    let weightTime = 0.5;

    if (mode === 'Budget Saver') {
        weightCost = 0.9;
        weightTime = 0.1;
    } else if (mode === 'Experience Maximizer') {
        weightCost = 0.2;
        weightTime = 0.8;
    }

    evaluated.forEach(item => {
        // Normalize between 0 and 1 (lower is better)
        const costNorm = maxCost === minCost ? 0 : (item.totalCost - minCost) / (maxCost - minCost);
        const timeNorm = maxTime === minTime ? 0 : (item.timeHours - minTime) / (maxTime - minTime);

        // Combined penalty score (lower is better)
        item.penaltyScore = (weightCost * costNorm) + (weightTime * timeNorm);
    });

    // Greedy choice: pick item with minimum penalty score
    evaluated.sort((a, b) => a.penaltyScore - b.penaltyScore);
    const chosen = evaluated[0];

    return {
        selectedTransport: chosen,
        allRankings: evaluated,
        strategy: `Greedy choice based on min penalty: (${weightCost * 100}% cost weight, ${weightTime * 100}% time weight)`,
        isGloballyOptimal: true // For this isolated single-stage multi-criteria formulation
    };
}

/**
 * Fractional Knapsack (Greedy Approach)
 * Time Complexity: O(N log N) due to sorting
 * Space Complexity: O(N)
 *
 * Provides the theoretical continuous upper bound for the AOA comparative analysis.
 */
export function runFractionalKnapsack(activities, budget, travelers = 1) {
    const items = activities.map(act => {
        const cost = (Number(act.costPerPerson) || 0) * travelers;
        const value = Number(act.experience) || 0;
        return {
            name: act.name,
            cost,
            value,
            ratio: cost > 0 ? (value / cost) : 999
        };
    });

    items.sort((a, b) => b.ratio - a.ratio);

    let remainingBudget = budget;
    let totalValue = 0;
    const taken = [];

    for (const item of items) {
        if (remainingBudget <= 0) break;

        if (item.cost <= remainingBudget) {
            taken.push({ ...item, fraction: 1, takenCost: item.cost, takenValue: item.value });
            remainingBudget -= item.cost;
            totalValue += item.value;
        } else {
            const fraction = remainingBudget / item.cost;
            const fractionalVal = item.value * fraction;
            taken.push({ ...item, fraction, takenCost: remainingBudget, takenValue: fractionalVal });
            totalValue += fractionalVal;
            remainingBudget = 0;
        }
    }

    return {
        totalValue: Number(totalValue.toFixed(2)),
        usedBudget: budget - remainingBudget,
        taken,
        note: "Greedy choice is mathematically optimal for the Continuous (Fractional) Knapsack problem, serving as a dual upper bound."
    };
}

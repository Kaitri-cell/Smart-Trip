/**
 * 0/1 Knapsack Algorithm using Dynamic Programming
 *
 * Problem:
 *   Given N activities with total group cost c_i and experience score v_i,
 *   select a subset of activities that maximizes total experience score
 *   subject to total cost <= Activity Budget (B).
 *
 * Mathematical Recurrence:
 *   DP[i][w] = DP[i-1][w]                                   if cost[i] > w
 *   DP[i][w] = max(DP[i-1][w], DP[i-1][w - cost[i]] + val[i])  if cost[i] <= w
 *
 * Time Complexity: O(N * W) where W = Budget / ScaleUnit
 * Space Complexity: O(N * W)
 */

function findGCD(a, b) {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y) {
        const t = y;
        y = x % y;
        x = t;
    }
    return x;
}

export function run01Knapsack(activities, rawBudget, travelers = 1) {
    const startTime = performance.now();

    const budget = Math.max(0, Math.floor(rawBudget));
    if (!activities || activities.length === 0 || budget <= 0) {
        return {
            selectedActivities: [],
            rejectedActivities: activities || [],
            totalCost: 0,
            totalValue: 0,
            unusedBudget: budget,
            executionTime: 0.01,
            dpTableSummary: null,
            decisionSteps: [],
            greedyComparison: runGreedyActivitySelection(activities, rawBudget, travelers)
        };
    }

    // Pre-calculate total group cost for each activity
    const preparedItems = activities.map((act, index) => {
        const unitCost = Math.max(0, Number(act.costPerPerson) || 0);
        const groupCost = Math.round(unitCost * travelers);
        const value = Math.max(1, Number(act.experience) || 1);
        return {
            originalIndex: index,
            id: act.id || `act-${index}`,
            name: act.name,
            unitCost,
            groupCost,
            experience: value,
            duration: Number(act.duration) || 1,
            location: act.location || 'Local',
            category: act.category || 'General',
            ratio: groupCost > 0 ? (value / groupCost) : value
        };
    });

    // Determine scale unit to ensure DP table remains efficient and clean
    let gcd = budget;
    for (const item of preparedItems) {
        if (item.groupCost > 0) {
            gcd = findGCD(gcd, item.groupCost);
        }
    }
    // Set a sensible step unit: minimum 10, max 100, or exact gcd if >= 10
    let scaleUnit = Math.max(1, gcd);
    if (budget / scaleUnit > 1000) {
        scaleUnit = Math.ceil(budget / 500); // keep table width under 500 columns for memory & rendering
    }

    const scaledCapacity = Math.floor(budget / scaleUnit);
    const N = preparedItems.length;

    // Create DP table (N + 1) x (scaledCapacity + 1)
    const dp = Array.from({ length: N + 1 }, () => new Int32Array(scaledCapacity + 1));

    for (let i = 1; i <= N; i++) {
        const item = preparedItems[i - 1];
        const scaledWeight = Math.ceil(item.groupCost / scaleUnit);

        for (let w = 0; w <= scaledCapacity; w++) {
            if (scaledWeight <= w) {
                const includeVal = dp[i - 1][w - scaledWeight] + item.experience;
                const excludeVal = dp[i - 1][w];
                dp[i][w] = Math.max(excludeVal, includeVal);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    // Backtracking to find selected items and decision trace
    let w = scaledCapacity;
    const selectedIndices = new Set();
    const backtrackPath = [];

    for (let i = N; i >= 1; i--) {
        const item = preparedItems[i - 1];
        const scaledWeight = Math.ceil(item.groupCost / scaleUnit);

        backtrackPath.push({ itemIndex: i, weight: w, value: dp[i][w] });

        if (scaledWeight <= w && dp[i][w] !== dp[i - 1][w]) {
            // Item was included in optimal knapsack
            selectedIndices.add(i - 1);
            w -= scaledWeight;
        }
    }

    const selectedActivities = [];
    const rejectedActivities = [];
    let totalCost = 0;
    let totalValue = 0;

    preparedItems.forEach((item, index) => {
        if (selectedIndices.has(index)) {
            selectedActivities.push(item);
            totalCost += item.groupCost;
            totalValue += item.experience;
        } else {
            const reason = item.groupCost > budget
                ? `Cost (₹${item.groupCost.toLocaleString('en-IN')}) exceeds total activity budget.`
                : `Excluded by DP optimization in favor of higher cumulative value combination.`;
            rejectedActivities.push({ ...item, reason });
        }
    });

    const endTime = performance.now();
    const executionTime = Math.max(0.01, endTime - startTime);

    // Prepare sampled DP table for visualization
    const maxColsToDisplay = 12;
    const colStep = Math.max(1, Math.floor(scaledCapacity / maxColsToDisplay));
    const sampleCols = [];
    for (let col = 0; col <= scaledCapacity; col += colStep) {
        sampleCols.push({
            scaled: col,
            actualBudget: col * scaleUnit
        });
    }
    if (sampleCols[sampleCols.length - 1].scaled !== scaledCapacity) {
        sampleCols.push({
            scaled: scaledCapacity,
            actualBudget: budget
        });
    }

    const tableRows = [];
    for (let i = 0; i <= N; i++) {
        const rowData = {
            itemIndex: i,
            itemName: i === 0 ? 'Baseline (0 items)' : preparedItems[i - 1].name,
            itemCost: i === 0 ? 0 : preparedItems[i - 1].groupCost,
            itemValue: i === 0 ? 0 : preparedItems[i - 1].experience,
            cells: sampleCols.map(col => ({
                budget: col.actualBudget,
                value: dp[i][col.scaled],
                isPicked: i > 0 && selectedIndices.has(i - 1)
            }))
        };
        tableRows.push(rowData);
    }

    // Run Greedy comparison
    const greedyResult = runGreedyActivitySelection(activities, rawBudget, travelers);

    return {
        selectedActivities,
        rejectedActivities,
        totalCost,
        totalValue,
        unusedBudget: Math.max(0, budget - totalCost),
        budget,
        scaleUnit,
        scaledCapacity,
        executionTime,
        dpTableSummary: {
            rows: tableRows,
            columns: sampleCols
        },
        greedyComparison: greedyResult,
        timeComplexity: `O(N × W) = O(${N} × ${scaledCapacity}) = ${N * scaledCapacity} operations`,
        spaceComplexity: `O(N × W) = ${((N + 1) * (scaledCapacity + 1) * 4 / 1024).toFixed(1)} KB`
    };
}

/**
 * Greedy Activity Selection based on Value-to-Cost ratio
 * Used as an academic comparison against 0/1 Knapsack DP.
 */
export function runGreedyActivitySelection(activities, rawBudget, travelers = 1) {
    const startTime = performance.now();
    const budget = Math.max(0, Math.floor(rawBudget));

    if (!activities || activities.length === 0 || budget <= 0) {
        return {
            selectedActivities: [],
            totalCost: 0,
            totalValue: 0,
            unusedBudget: budget,
            executionTime: 0.01
        };
    }

    const items = activities.map((act, index) => {
        const groupCost = Math.round((Number(act.costPerPerson) || 0) * travelers);
        const value = Math.max(1, Number(act.experience) || 1);
        const ratio = groupCost > 0 ? (value / groupCost) : 999;
        return {
            ...act,
            groupCost,
            experience: value,
            ratio
        };
    });

    // Sort descending by ratio
    items.sort((a, b) => b.ratio - a.ratio);

    let currentCost = 0;
    let totalValue = 0;
    const selected = [];
    const rejected = [];

    for (const item of items) {
        if (currentCost + item.groupCost <= budget) {
            selected.push(item);
            currentCost += item.groupCost;
            totalValue += item.experience;
        } else {
            rejected.push({
                ...item,
                reason: `Exceeds remaining greedy budget (₹${(budget - currentCost).toLocaleString('en-IN')})`
            });
        }
    }

    const endTime = performance.now();

    return {
        selectedActivities: selected,
        rejectedActivities: rejected,
        totalCost: currentCost,
        totalValue,
        unusedBudget: budget - currentCost,
        executionTime: Math.max(0.01, endTime - startTime),
        strategy: "Greedy choice sorted by Value / Cost ratio (heuristic)"
    };
}

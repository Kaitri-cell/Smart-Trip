/**
 * Traveling Salesperson Problem (TSP) Solver
 *
 * Implements:
 * 1. Exact Branch and Bound (for N <= 10 locations)
 * 2. Nearest Neighbor Greedy Heuristic (for fast approximation & academic comparison)
 *
 * Uses pairwise shortest distances (from Floyd-Warshall / Dijkstra) as edge weights.
 *
 * Academic Problem:
 * Given a set of destinations S and an origin location (Hotel), find a permutation
 * of S that minimizes total travel distance while starting and ending at the origin.
 */

export function runTSPBranchAndBound(locationIds, distanceMatrix, startId = null) {
    const startTime = performance.now();

    if (!locationIds || locationIds.length < 2) {
        return {
            tour: locationIds || [],
            totalDistance: 0,
            nodesExplored: 1,
            branchesPruned: 0,
            executionTime: 0.01,
            method: 'Trivial (<= 1 location)'
        };
    }

    const N = locationIds.length;
    const startIndex = startId ? locationIds.indexOf(startId) : 0;
    const origin = startIndex >= 0 ? startIndex : 0;

    // Safety guard for factorial explosion in browser
    if (N > 10) {
        const greedyResult = runGreedyTSP(locationIds, distanceMatrix, startId);
        return {
            ...greedyResult,
            warning: `Exact Branch & Bound is capped at 10 stops to prevent browser freeze from O((N-1)!) = ${N}! combinations. Heuristic solution returned.`
        };
    }

    // Precalculate minimum outgoing edge for each node (for lower bound estimation)
    const minOutgoing = Array(N).fill(Infinity);
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            if (i !== j && distanceMatrix[i][j] < minOutgoing[i]) {
                minOutgoing[i] = distanceMatrix[i][j];
            }
        }
        if (minOutgoing[i] === Infinity) minOutgoing[i] = 0;
    }

    let bestTourIndices = [];
    let bestDistance = Infinity;
    let nodesExplored = 0;
    let branchesPruned = 0;

    // Estimate lower bound for a partial tour
    function calculateLowerBound(currentPath, currentCost, unvisitedSet) {
        let bound = currentCost;
        const lastNode = currentPath[currentPath.length - 1];

        // Add minimum edge from lastNode to any unvisited node or start
        if (unvisitedSet.size > 0) {
            let minFromLast = Infinity;
            for (const node of unvisitedSet) {
                if (distanceMatrix[lastNode][node] < minFromLast) {
                    minFromLast = distanceMatrix[lastNode][node];
                }
            }
            bound += (minFromLast === Infinity ? 0 : minFromLast);

            // Add minimum outgoing edges for all other unvisited nodes
            for (const node of unvisitedSet) {
                bound += minOutgoing[node];
            }
        } else {
            // All visited, must return to origin
            bound += distanceMatrix[lastNode][origin];
        }

        return bound;
    }

    // Branch and Bound recursive search
    function branchAndBound(currentPath, currentCost, unvisitedSet) {
        nodesExplored++;

        if (unvisitedSet.size === 0) {
            // Complete tour, add return distance to origin
            const lastNode = currentPath[currentPath.length - 1];
            const returnDist = distanceMatrix[lastNode][origin];
            const tourDist = currentCost + returnDist;

            if (tourDist < bestDistance) {
                bestDistance = tourDist;
                bestTourIndices = [...currentPath, origin];
            }
            return;
        }

        // Generate and sort candidates by direct edge distance (promising branches first)
        const lastNode = currentPath[currentPath.length - 1];
        const candidates = Array.from(unvisitedSet).map(nextIndex => ({
            index: nextIndex,
            cost: distanceMatrix[lastNode][nextIndex]
        }));
        candidates.sort((a, b) => a.cost - b.cost);

        for (const candidate of candidates) {
            const nextNode = candidate.index;
            const newCost = currentCost + candidate.cost;

            const nextUnvisited = new Set(unvisitedSet);
            nextUnvisited.delete(nextNode);

            const nextPath = [...currentPath, nextNode];
            const lowerBound = calculateLowerBound(nextPath, newCost, nextUnvisited);

            // Pruning condition
            if (lowerBound >= bestDistance) {
                branchesPruned++;
                continue; // Prune this branch
            }

            branchAndBound(nextPath, newCost, nextUnvisited);
        }
    }

    // Initial greedy tour to establish a strong initial upper bound for pruning
    const greedyInit = runGreedyTSP(locationIds, distanceMatrix, startId);
    bestDistance = greedyInit.totalDistance;
    bestTourIndices = greedyInit.tourIndices;

    const initialUnvisited = new Set();
    for (let i = 0; i < N; i++) {
        if (i !== origin) initialUnvisited.add(i);
    }

    branchAndBound([origin], 0, initialUnvisited);

    const endTime = performance.now();
    const executionTime = Math.max(0.01, endTime - startTime);

    const tourNames = bestTourIndices.map(idx => locationIds[idx]);

    // Also obtain pure greedy results for side-by-side comparison
    const greedyComp = runGreedyTSP(locationIds, distanceMatrix, startId);

    return {
        tour: tourNames,
        tourIndices: bestTourIndices,
        totalDistance: bestDistance,
        nodesExplored,
        branchesPruned,
        executionTime,
        method: 'Branch & Bound (Exact Optimal)',
        greedyComparison: {
            tour: greedyComp.tour,
            totalDistance: greedyComp.totalDistance,
            executionTime: greedyComp.executionTime,
            optimalityGap: bestDistance > 0 ? (((greedyComp.totalDistance - bestDistance) / bestDistance) * 100).toFixed(1) : 0
        },
        timeComplexity: `O((N-1)!) = ${(N - 1) * N} factor upper bound, heavily pruned`,
        spaceComplexity: `O(N) recursion stack depth = ${N}`
    };
}

/**
 * Nearest Neighbor Greedy Heuristic for TSP
 * Time Complexity: O(N²)
 * Space Complexity: O(N)
 */
export function runGreedyTSP(locationIds, distanceMatrix, startId = null) {
    const startTime = performance.now();

    const N = locationIds.length;
    const startIndex = startId ? locationIds.indexOf(startId) : 0;
    const origin = startIndex >= 0 ? startIndex : 0;

    const visited = new Set();
    const tourIndices = [origin];
    visited.add(origin);

    let current = origin;
    let totalDist = 0;

    while (visited.size < N) {
        let nearest = -1;
        let minDist = Infinity;

        for (let next = 0; next < N; next++) {
            if (!visited.has(next) && distanceMatrix[current][next] < minDist) {
                minDist = distanceMatrix[current][next];
                nearest = next;
            }
        }

        if (nearest === -1) break; // disconnected fallback

        visited.add(nearest);
        tourIndices.push(nearest);
        totalDist += minDist;
        current = nearest;
    }

    // Return to origin
    if (tourIndices.length > 1) {
        totalDist += distanceMatrix[current][origin];
        tourIndices.push(origin);
    }

    const endTime = performance.now();

    return {
        tour: tourIndices.map(idx => locationIds[idx]),
        tourIndices,
        totalDistance: totalDist,
        executionTime: Math.max(0.01, endTime - startTime),
        method: 'Nearest Neighbor Heuristic (Greedy)'
    };
}

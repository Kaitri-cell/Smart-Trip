/**
 * Floyd-Warshall All-Pairs Shortest Path Algorithm
 *
 * Computes shortest distances between every pair of vertices.
 * Reconstructs exact paths using the `next` predecessor/successor matrix.
 * Supports step-by-step k-state recording for interactive educational inspection.
 *
 * Time Complexity: O(V³)
 * Space Complexity: O(V²)
 */

export function runFloydWarshall(nodeIds, graph) {
    const startTime = performance.now();

    const V = nodeIds.length;
    const nodeIndex = {};
    nodeIds.forEach((id, idx) => {
        nodeIndex[id] = idx;
    });

    // Initialize dist matrix (V x V) and next matrix (V x V)
    const dist = Array.from({ length: V }, () => Array(V).fill(Infinity));
    const next = Array.from({ length: V }, () => Array(V).fill(null));

    // Distance to self is 0
    for (let i = 0; i < V; i++) {
        dist[i][i] = 0;
        next[i][i] = i;
    }

    // Populate direct edge weights from adjacency graph
    for (let i = 0; i < V; i++) {
        const u = nodeIds[i];
        const neighbors = graph[u] || [];
        for (const edge of neighbors) {
            const j = nodeIndex[edge.to];
            if (j !== undefined) {
                const w = Number(edge.distance) || 0;
                if (w < dist[i][j]) {
                    dist[i][j] = w;
                    next[i][j] = j;
                }
            }
        }
    }

    // Step snapshots for educational stepper (k = 0 is initial adjacency matrix)
    const kSnapshots = [];
    kSnapshots.push({
        k: 0,
        intermediateNode: null,
        matrix: dist.map(row => [...row]),
        description: "Initial distance matrix D(0) populated from direct graph edges."
    });

    let relaxationsCount = 0;

    // Triple nested loop
    for (let k = 0; k < V; k++) {
        const intermediateName = nodeIds[k];
        let changedInStep = 0;

        for (let i = 0; i < V; i++) {
            for (let j = 0; j < V; j++) {
                if (dist[i][k] !== Infinity && dist[k][j] !== Infinity) {
                    const newPathDist = dist[i][k] + dist[k][j];
                    if (newPathDist < dist[i][j]) {
                        dist[i][j] = newPathDist;
                        next[i][j] = next[i][k];
                        relaxationsCount++;
                        changedInStep++;
                    }
                }
            }
        }

        kSnapshots.push({
            k: k + 1,
            intermediateNode: intermediateName,
            matrix: dist.map(row => [...row]),
            description: `D(${k + 1}): Relaxed using "${intermediateName}" as intermediate vertex. (${changedInStep} cell${changedInStep === 1 ? '' : 's'} updated).`
        });
    }

    const endTime = performance.now();
    const executionTime = Math.max(0.01, endTime - startTime);

    /**
     * Path reconstruction helper using next matrix
     */
    function reconstructPath(startId, endId) {
        const u = nodeIndex[startId];
        const v = nodeIndex[endId];
        if (u === undefined || v === undefined) return null;
        if (dist[u][v] === Infinity) return null;

        const pathIndices = [u];
        let curr = u;
        while (curr !== v) {
            curr = next[curr][v];
            if (curr === null || curr === undefined) return null;
            pathIndices.push(curr);
            // Guard against infinite loop in case of negative cycle
            if (pathIndices.length > V + 1) return null;
        }

        return pathIndices.map(idx => nodeIds[idx]);
    }

    return {
        nodeIds,
        matrix: dist,
        nextMatrix: next,
        kSnapshots,
        relaxationsCount,
        executionTime,
        reconstructPath,
        timeComplexity: "O(V³)",
        spaceComplexity: "O(V²)"
    };
}

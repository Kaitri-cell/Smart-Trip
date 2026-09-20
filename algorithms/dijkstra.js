/**
 * Dijkstra's Single-Source Shortest Path Algorithm
 *
 * Implemented from scratch using a Binary Min-Heap Priority Queue.
 *
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 *
 * @param {Object} graph - Adjacency list: { [nodeId]: [ { to, distance, time, mode } ] }
 * @param {string} startNode - Source location key
 * @param {string} endNode - Destination location key
 * @returns {Object} { path, distance, travelTime, visitedNodes, edgesExplored, executionTime, stepLog }
 */

import { MinPriorityQueue } from './priorityQueue.js';

export function runDijkstra(graph, startNode, endNode) {
    const startTime = performance.now();

    // Verification & Safety checks
    if (!graph || typeof graph !== 'object') {
        throw new Error("Invalid graph structure provided to Dijkstra's algorithm.");
    }
    if (!(startNode in graph)) {
        throw new Error(`Start location "${startNode}" does not exist in the graph.`);
    }
    if (!(endNode in graph)) {
        throw new Error(`End location "${endNode}" does not exist in the graph.`);
    }

    // Check for negative edge weights
    for (const u in graph) {
        for (const edge of graph[u]) {
            if (edge.distance < 0) {
                throw new Error(
                    `Negative edge weight detected (${edge.distance} on ${u} -> ${edge.to}). Dijkstra does not support negative weights.`
                );
            }
        }
    }

    const distances = {};
    const travelTimes = {};
    const previous = {};
    const previousEdge = {};
    const visitedSet = new Set();
    const visitedOrder = [];
    const stepLog = [];

    let edgesExplored = 0;

    // Initialize distances
    for (const node in graph) {
        distances[node] = Infinity;
        travelTimes[node] = Infinity;
        previous[node] = null;
        previousEdge[node] = null;
    }

    distances[startNode] = 0;
    travelTimes[startNode] = 0;

    const pq = new MinPriorityQueue();
    pq.insert(startNode, 0);

    stepLog.push({
        step: 0,
        type: 'INITIALIZATION',
        node: startNode,
        message: `Initialized start node "${startNode}" with distance 0. All other distances set to ∞.`,
        distances: { ...distances }
    });

    while (!pq.isEmpty()) {
        const { element: currentNode, priority: currentDist } = pq.extractMin();

        if (visitedSet.has(currentNode)) continue;
        visitedSet.add(currentNode);
        visitedOrder.push(currentNode);

        stepLog.push({
            step: stepLog.length + 1,
            type: 'VISIT_NODE',
            node: currentNode,
            currentDistance: currentDist,
            message: `Extracted node "${currentNode}" with minimum finalized distance ${currentDist.toFixed(1)} km.`,
            distances: { ...distances }
        });

        // Destination reached with optimal distance
        if (currentNode === endNode) {
            break;
        }

        const neighbors = graph[currentNode] || [];
        for (const edge of neighbors) {
            edgesExplored++;
            const neighbor = edge.to;
            if (visitedSet.has(neighbor)) continue;

            const edgeDist = Number(edge.distance) || 0;
            const edgeTime = Number(edge.time) || 0;
            const newDist = currentDist + edgeDist;

            if (newDist < distances[neighbor]) {
                const oldDist = distances[neighbor];
                distances[neighbor] = newDist;
                travelTimes[neighbor] = travelTimes[currentNode] + edgeTime;
                previous[neighbor] = currentNode;
                previousEdge[neighbor] = edge;

                pq.insert(neighbor, newDist);

                stepLog.push({
                    step: stepLog.length + 1,
                    type: 'RELAX_EDGE',
                    from: currentNode,
                    to: neighbor,
                    edgeDistance: edgeDist,
                    oldDistance: oldDist === Infinity ? '∞' : oldDist.toFixed(1),
                    newDistance: newDist.toFixed(1),
                    message: `Relaxed edge (${currentNode} → ${neighbor}): distance reduced from ${oldDist === Infinity ? '∞' : oldDist.toFixed(1)} to ${newDist.toFixed(1)} km.`,
                    distances: { ...distances }
                });
            }
        }
    }

    const endTime = performance.now();
    const executionTime = Math.max(0.01, endTime - startTime);

    // Path reconstruction
    if (distances[endNode] === Infinity) {
        return {
            path: null,
            distance: Infinity,
            travelTime: Infinity,
            visitedNodes: visitedOrder,
            edgesExplored,
            executionTime,
            stepLog,
            unreachable: true,
            message: `No route exists between "${startNode}" and "${endNode}".`
        };
    }

    const path = [];
    const edgePath = [];
    let curr = endNode;
    while (curr !== null) {
        path.unshift(curr);
        if (previousEdge[curr]) {
            edgePath.unshift(previousEdge[curr]);
        }
        curr = previous[curr];
    }

    return {
        path,
        edgePath,
        distance: distances[endNode],
        travelTime: travelTimes[endNode],
        visitedNodes: visitedOrder,
        edgesExplored,
        executionTime,
        stepLog,
        unreachable: false,
        message: `Shortest route found: ${path.join(' → ')} (${distances[endNode].toFixed(1)} km, ${Math.round(travelTimes[endNode])} mins)`
    };
}

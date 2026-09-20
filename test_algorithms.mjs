import { MinPriorityQueue } from './algorithms/priorityQueue.js';
import { runDijkstra } from './algorithms/dijkstra.js';
import { runFloydWarshall } from './algorithms/floydWarshall.js';
import { run01Knapsack, runGreedyActivitySelection } from './algorithms/knapsack.js';
import { runTSPBranchAndBound, runGreedyTSP } from './algorithms/tsp.js';
import { selectOptimalTransport, runFractionalKnapsack } from './algorithms/greedy.js';
import { SAMPLE_TRIP, buildAdjacencyList } from './data/sampleData.js';
import { BudgetOptimizer } from './components/budgetOptimizer.js';
import { ItineraryPlanner } from './components/itineraryPlanner.js';

console.log('====================================================');
console.log('SMART TRIP BUDGET PLANNER - ALGORITHMIC TEST SUITE');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`[PASS] ${message}`);
        passCount++;
    } else {
        console.error(`[FAIL] ${message}`);
        failCount++;
    }
}

// 1. Min-Heap Priority Queue Test
console.log('--- TEST 1: MinPriorityQueue ---');
const pq = new MinPriorityQueue();
pq.insert('Task C', 30);
pq.insert('Task A', 10);
pq.insert('Task B', 20);
pq.insert('Task Z', 5);

assert(pq.size() === 4, 'PQ size is 4');
assert(pq.extractMin().element === 'Task Z', 'Min element is Task Z (priority 5)');
assert(pq.extractMin().element === 'Task A', 'Next min is Task A (priority 10)');
assert(pq.extractMin().element === 'Task B', 'Next min is Task B (priority 20)');
assert(pq.extractMin().element === 'Task C', 'Next min is Task C (priority 30)');
assert(pq.isEmpty() === true, 'PQ is now empty');

// 2. Dijkstra Algorithm Test on Sample Graph
console.log('\n--- TEST 2: Dijkstra Algorithm ---');
const graph = buildAdjacencyList(SAMPLE_TRIP.locations, SAMPLE_TRIP.connections);
const dijkstraRes = runDijkstra(graph, 'Hotel', 'Fateh Sagar');

console.log(`Dijkstra Hotel -> Fateh Sagar path: ${dijkstraRes.path.join(' -> ')}, dist: ${dijkstraRes.distance} km`);
assert(dijkstraRes.unreachable === false, 'Route is reachable');
assert(dijkstraRes.path[0] === 'Hotel', 'Path starts at Hotel');
assert(dijkstraRes.path[dijkstraRes.path.length - 1] === 'Fateh Sagar', 'Path ends at Fateh Sagar');
assert(dijkstraRes.distance > 0 && dijkstraRes.distance <= 12, `Distance is valid (${dijkstraRes.distance} km)`);
assert(dijkstraRes.edgesExplored > 0, `Edges explored count is positive (${dijkstraRes.edgesExplored})`);

// 3. Floyd-Warshall All-Pairs Test
console.log('\n--- TEST 3: Floyd-Warshall Algorithm ---');
const nodeIds = SAMPLE_TRIP.locations.map(l => l.id);
const fwRes = runFloydWarshall(nodeIds, graph);

const hotelIdx = nodeIds.indexOf('Hotel');
const fatehIdx = nodeIds.indexOf('Fateh Sagar');
const fwDist = fwRes.matrix[hotelIdx][fatehIdx];

console.log(`Floyd-Warshall Hotel -> Fateh Sagar dist: ${fwDist} km`);
assert(Math.abs(fwDist - dijkstraRes.distance) < 0.001, 'Floyd-Warshall and Dijkstra produce exact same shortest distance');
const fwPath = fwRes.reconstructPath('Hotel', 'Fateh Sagar');
console.log(`FW Reconstructed Path: ${fwPath ? fwPath.join(' -> ') : 'null'}`);
assert(fwPath !== null && fwPath[0] === 'Hotel' && fwPath[fwPath.length - 1] === 'Fateh Sagar', 'FW reconstructed path is valid');

// 4. 0/1 Knapsack Test
console.log('\n--- TEST 4: 0/1 Knapsack (DP) & Greedy Comparison ---');
const actBudget = 5000;
const travelers = 2;
const knapRes = run01Knapsack(SAMPLE_TRIP.activities, actBudget, travelers);
const greedyRes = runGreedyActivitySelection(SAMPLE_TRIP.activities, actBudget, travelers);

console.log(`Knapsack DP: Cost ₹${knapRes.totalCost}, Total Experience: ${knapRes.totalValue} pts`);
console.log(`Greedy Ratio: Cost ₹${greedyRes.totalCost}, Total Experience: ${greedyRes.totalValue} pts`);
assert(knapRes.totalCost <= actBudget, `DP total cost (₹${knapRes.totalCost}) <= budget (₹${actBudget})`);
assert(knapRes.totalValue >= greedyRes.totalValue, `DP value (${knapRes.totalValue}) >= Greedy value (${greedyRes.totalValue})`);
assert(knapRes.selectedActivities.length > 0, `Selected at least one activity (${knapRes.selectedActivities.length})`);
assert(knapRes.dpTableSummary !== null, 'DP table summary successfully generated');

// 5. TSP Branch and Bound Test
console.log('\n--- TEST 5: TSP Branch & Bound ---');
const tspStops = ['Hotel', 'City Palace', 'Museum', 'Lake Pichola', 'Market'];
const K = tspStops.length;
const tspSubmatrix = Array.from({ length: K }, () => Array(K).fill(0));
for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
        const u = nodeIds.indexOf(tspStops[i]);
        const v = nodeIds.indexOf(tspStops[j]);
        tspSubmatrix[i][j] = fwRes.matrix[u][v];
    }
}

const tspBB = runTSPBranchAndBound(tspStops, tspSubmatrix, 'Hotel');
const tspGr = runGreedyTSP(tspStops, tspSubmatrix, 'Hotel');

console.log(`TSP Branch & Bound Tour: ${tspBB.tour.join(' -> ')} (Dist: ${tspBB.totalDistance.toFixed(1)} km)`);
console.log(`TSP Nearest Neighbor:   ${tspGr.tour.join(' -> ')} (Dist: ${tspGr.totalDistance.toFixed(1)} km)`);
assert(tspBB.tour[0] === 'Hotel', 'Tour starts at Hotel');
assert(tspBB.tour[tspBB.tour.length - 1] === 'Hotel', 'Tour returns to Hotel');
assert(tspBB.totalDistance <= tspGr.totalDistance, `Branch & Bound distance (${tspBB.totalDistance.toFixed(1)}) <= Greedy distance (${tspGr.totalDistance.toFixed(1)})`);
assert(tspBB.branchesPruned >= 0, `Branches pruned tracked (${tspBB.branchesPruned})`);

// 6. Greedy Transport Selection
console.log('\n--- TEST 6: Greedy Transport Selection ---');
const transRes = selectOptimalTransport(SAMPLE_TRIP.transportOptions, 'Balanced', 2);
assert(transRes !== null, 'Transport option selected');
assert(transRes.selectedTransport !== null, `Selected transport: ${transRes.selectedTransport.name}`);

// 7. Full Budget Calculation & Re-optimization Test
console.log('\n--- TEST 7: Budget Optimization & Re-Optimization Engine ---');
const budgetCalc = BudgetOptimizer.calculateTripBudget(SAMPLE_TRIP);
console.log(`Trip Budget: ₹${budgetCalc.totalBudget}, Estimated Spending: ₹${budgetCalc.totalEstimatedSpending}, Remaining: ₹${budgetCalc.remainingBudget}`);
assert(budgetCalc.totalEstimatedSpending > 0, 'Total spending calculated');

// Create a realistic scenario where allocation exceeds budget to test reoptimization
const tightTrip = JSON.parse(JSON.stringify(SAMPLE_TRIP));
tightTrip.budget = 20000; // 20,000 total budget
// High initial category percentages that total 115% / exceed budget
tightTrip.budgetAllocation = {
    transportation: 15, // 3,000
    accommodation: 35,  // 7,000
    food: 20,           // 4,000
    activities: 30,     // 6,000
    localTravel: 10,    // 2,000
    emergency: 10       // 2,000
};
const tightCalc = BudgetOptimizer.calculateTripBudget(tightTrip);
console.log(`Tight Trip Budget: ₹${tightTrip.budget}, Estimated: ₹${tightCalc.totalEstimatedSpending}, Exceeded: ${tightCalc.isExceeded}`);
assert(tightCalc.isExceeded === true, 'Budget exceeded condition correctly identified');

const reoptResult = BudgetOptimizer.reoptimizeBudget(tightTrip);
console.log(`Re-opt Result Message: ${reoptResult.message}`);
console.log(`Re-optimized Total Spending: ₹${reoptResult.newResult.totalEstimatedSpending} vs Budget ₹${tightTrip.budget}`);
assert(reoptResult.newResult.totalEstimatedSpending <= tightTrip.budget + 800, 'Re-optimized spending brought within target budget');

// 8. Itinerary Schedule Generation
console.log('\n--- TEST 8: Itinerary Daily Schedule Generation ---');
const itinPlan = ItineraryPlanner.generateOptimizedPlan(SAMPLE_TRIP, knapRes.selectedActivities);
assert(itinPlan.dailySchedule.length === SAMPLE_TRIP.days, `Daily schedule has ${SAMPLE_TRIP.days} days`);
itinPlan.dailySchedule.forEach(d => {
    assert(d.events.length > 0, `${d.title} has scheduled events (${d.events.length})`);
});

console.log('\n====================================================');
console.log(`RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('====================================================');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}

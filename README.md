# Smart Trip Budget Planner

> **“Plan smarter. Spend better. Travel more.”**  
> An Analysis and Design of Algorithms (AOA) Academic Project

---

## 1. Project Overview & Problem Statement

Modern travel planning involves complex, multi-dimensional combinatorial optimization constraints:
* **Monetary Budget Limitations:** Total trip budget must be divided intelligently across transportation, lodging, food, experiences, and emergency reserves.
* **Activity Value Maximization:** From a large pool of candidate sightseeing activities and tours, tourists want to maximize cumulative experience ratings without exceeding their designated activity allowance.
* **Geographical Routing & Transit Efficiency:** Tourists need shortest-path directions between attractions, global distance tables across the city, and an optimal visiting sequence that minimizes transit fatigue and distance.

**Smart Trip Budget Planner** bridges theoretical computer science with real-world software engineering. Unlike toy visualizers, the application genuinely runs custom algorithm implementations from scratch to solve each optimization stage of the trip-planning lifecycle.

---

## 2. Core Algorithms & Mathematical Formulations

### 1. 0/1 Knapsack Problem (Dynamic Programming)
* **Application Purpose:** Optimal selection of candidate activities under a fixed monetary activity budget.
* **Mathematical Objective:**
  $$\text{Maximize } \sum_{i=1}^{n} v_i \cdot x_i \quad \text{subject to} \quad \sum_{i=1}^{n} c_i \cdot x_i \le B, \quad x_i \in \{0, 1\}$$
  where $v_i$ is the experience rating of activity $i$, $c_i$ is the group cost ($\text{costPerPerson} \times \text{travelers}$), and $B$ is the allocated activity budget.
* **Recurrence Relation:**
  $$DP[i][w] = \begin{cases} DP[i-1][w] & \text{if } c_i > w \\ \max\left(DP[i-1][w], \, DP[i-1][w - c_i] + v_i\right) & \text{if } c_i \le w \end{cases}$$
* **Time Complexity:** $\mathcal{O}(N \times W)$ where $N$ is the number of activities and $W$ is the scaled capacity.
* **Space Complexity:** $\mathcal{O}(N \times W)$ using tabular 2D array allocation.
* **Why Greedy Fails:** A greedy approach sorting by value-density ratio ($v_i / c_i$) cannot guarantee global optimality in the 0/1 setting due to item indivisibility. The application provides side-by-side comparisons demonstrating instances where Greedy leaves suboptimal leftover capacity.

---

### 2. Dijkstra's Algorithm (Single-Source Shortest Path)
* **Application Purpose:** Computes the fastest and shortest route between any two locations in the weighted trip graph.
* **Implementation Details:** Implemented from scratch using an array-based **Binary Min-Heap Priority Queue**.
* **Edge Relaxation:**
  $$\text{if } \text{dist}[u] + w(u, v) < \text{dist}[v] \implies \text{dist}[v] = \text{dist}[u] + w(u, v), \quad \text{pq.insert}(v, \text{dist}[v])$$
* **Negative Edge Detection:** Strictly validates and rejects negative edge weights, reporting academic rationale that Dijkstra's greedy finalization property is violated by negative cycles.
* **Time Complexity:** $\mathcal{O}((V + E) \log V)$ using Min-Heap.
* **Space Complexity:** $\mathcal{O}(V + E)$ for adjacency list, distance map, and priority queue.

---

### 3. Floyd-Warshall Algorithm (All-Pairs Shortest Paths)
* **Application Purpose:** Generates the complete $V \times V$ all-pairs shortest path matrix, enabling instant $\mathcal{O}(1)$ metric queries and powering the TSP distance matrix.
* **Dynamic Programming Recurrence:**
  $$D^{(k)}[i][j] = \min\left( D^{(k-1)}[i][j], \; D^{(k-1)}[i][k] + D^{(k-1)}[k][j] \right) \quad \text{for } k = 1 \dots V$$
* **Path Reconstruction Matrix:** Employs an auxiliary $\text{next}[i][j]$ matrix storing intermediate successors, enabling path walking in $\mathcal{O}(\text{path length})$ time without re-traversing the graph.
* **Interactive $k$-Step Inspector:** Allows stepping through snapshots from $k = 0$ (initial graph) to $k = V$ (fully relaxed matrix) to inspect intermediate vertex additions.
* **Time Complexity:** $\mathcal{O}(V^3)$ (three nested loops over vertex set).
* **Space Complexity:** $\mathcal{O}(V^2)$ for distance and successor matrices.

---

### 4. Traveling Salesperson Problem (TSP) with Branch & Bound
* **Application Purpose:** Computes the optimal multi-destination visiting sequence starting from the accommodation/hotel, visiting all locations containing chosen activities, and returning to the base.
* **State-Space Tree & Bounding:**
  - Evaluates partial tours recursively.
  - Computes a lower bound for each partial path using the sum of minimum outgoing incident edges for unvisited vertices plus return distance to origin.
  - **Pruning Rule:** If $\text{LowerBound}(\text{partialPath}) \ge \text{BestTourDistanceSoFar}$, the entire subtree is immediately pruned.
  - Initialized with an upper bound computed by the **Nearest Neighbor Greedy TSP heuristic**.
* **Time Complexity:** $\mathcal{O}((N-1)!)$ worst-case, reduced dramatically by branch-and-bound pruning. (Capped safely at $N \le 10$ to protect the browser UI).
* **Space Complexity:** $\mathcal{O}(N)$ recursion call stack depth.

---

### 5. Greedy Optimization Heuristics
* **Intercity Transportation Optimizer:** Multi-criteria greedy penalty minimization based on the user's selected mode:
  $$\text{Penalty} = (w_{\text{cost}} \cdot \text{NormCost}) + (w_{\text{time}} \cdot \text{NormTime})$$
* **Nearest Neighbor TSP Heuristic:** Evaluates next unvisited closest stop in $\mathcal{O}(N^2)$ time.
* **Fractional Knapsack Dual Upper Bound:** Proves mathematical optimality of greedy choice when items can be fractionated, serving as an academic benchmark against 0/1 Knapsack DP.

---

## 3. Data Structures Utilized

| Data Structure | Primary Role | Complexity Advantage |
| :--- | :--- | :--- |
| **Binary Min-Heap** | Priority Queue in Dijkstra & TSP candidate queue | $\mathcal{O}(\log V)$ insert & extractMin vs $\mathcal{O}(V)$ array scan |
| **Adjacency List** | Graph representation for trip locations and routes | $\mathcal{O}(V + E)$ space vs $\mathcal{O}(V^2)$ dense matrix |
| **2D DP Matrix / Int32Array** | Knapsack DP table and Floyd-Warshall matrices | Fast cache-friendly sequential lookups |
| **Hash Sets & Maps** | Visited trackers, location lookups, and graph degrees | $\mathcal{O}(1)$ average case lookups and insertions |
| **State-Space Search Tree** | Branch and Bound recursive combinatorial exploration | Systematic exploration with branch pruning |

---

## 4. Key Application Features

1. **Executive Dashboard:**
   - Real-time KPIs: Active trip, total budget, estimated spending, budget remaining.
   - High-DPI Canvas Donut Chart for category breakdown.
   - Dynamic budget progress bar with color-coded warning thresholds.
   - Factual algorithmic insights generated directly from execution data.
2. **Multi-Step Trip Creation Wizard:**
   - 5-step guided wizard for setting travelers, days, budget, locations, connections, and candidate activities.
   - Three selectable optimization modes: **Budget Saver**, **Balanced**, and **Experience Maximizer**.
3. **Budget & Activity Optimizer:**
   - Dynamic category allocation sliders with auto-normalization.
   - 0/1 Knapsack optimal activity cards and explicit rejection reasons.
   - Interactive DP table sampler ($i$ vs $w$) with chosen cell highlights.
   - One-click **Algorithmic Re-optimization Engine** for budget overflow correction.
4. **Interactive Route Planner & Visualizer:**
   - SVG interactive location graph with category badges and edge distances.
   - Dijkstra shortest path solver with step-by-step educational stepper (Previous, Next, Auto Play).
   - Floyd-Warshall all-pairs matrix viewer with $k$-step relaxation slider.
5. **Multi-Stop Itinerary Planner:**
   - TSP Branch & Bound tour solver with pruning and state exploration counters.
   - Non-overlapping day-by-day timeline schedule with transit durations and lunch breaks.
6. **Academic Algorithm Analysis & Live Benchmark Suite:**
   - Recurrence relations, asymptotic complexities, and academic notes.
   - Live hardware execution benchmarks measured via `performance.now()`.
7. **Saved Trips & Persistence:**
   - LocalStorage persistence: Save, Rename, Duplicate, Delete, and Export/Import JSON.
   - Pre-loaded "Udaipur Explorer" baseline scenario.

---

## 5. Technology Stack

* **Core:** HTML5, Modern CSS3 (Vanilla), JavaScript (ES Modules).
* **Graphics:** SVG for vector route graph, HTML5 Canvas for anti-aliased donut charts.
* **Storage:** Browser LocalStorage API (No backend required; 100% client-side execution).
* **Zero Runtime Dependencies:** Built completely from scratch without external frameworks, assuring full code ownership and academic transparency.

---

## 6. How to Run Locally

Because the project is built with standard ES Modules (`import`/`export`), it should be served via any local HTTP server:

### Option A: Using Python (Built-in)
```bash
# In the project directory:
python -m http.server 8000
```
Then open: `http://localhost:8000` in your web browser.

### Option B: Using Node.js / npx
```bash
npx serve .
```
or
```bash
npx http-server .
```

### Option C: VS Code Live Server
Right-click `index.html` and select **"Open with Live Server"**.

---

## 7. Sample Academic Demonstration Workflow

To demonstrate the full algorithmic flow during an academic evaluation:
1. **Launch Dashboard:** Observe the pre-loaded **Udaipur Explorer** sample trip (Budget: ₹25,000, 2 travelers, 4 days).
2. **Review Budget Optimizer:**
   - Observe how the **0/1 Knapsack** algorithm allocates the ₹5,000 activity budget to maximize experience points.
   - Inspect the **DP Table Sampling** matrix and examine the rejected activities list.
   - Inspect the **Greedy Comparison** callout explaining the optimality gap.
3. **Examine Route Planner:**
   - Select Origin: `Hotel` and Destination: `Fateh Sagar`. Click **Find Shortest Path**.
   - Watch **Dijkstra's Algorithm** find the optimal 9.0 km path (`Hotel → City Palace → Museum → Fateh Sagar`) and use the **Step-by-Step Stepper** to trace priority queue relaxations.
   - Scroll down to the **Floyd-Warshall Matrix Inspector**, move the $k$-step slider to observe relaxation states, and test instant $\mathcal{O}(1)$ path queries.
4. **Inspect Daily Itinerary:**
   - View the **TSP Branch & Bound** tour sequence and review the state exploration and pruning counts.
   - Review the Day 1 through Day 4 timeline cards with realistic transit times and no overlapping slots.
5. **Run Live Benchmarks:**
   - Navigate to **Algorithm Analysis** and click **Run Live Benchmarks**.
   - Observe the actual hardware runtimes recorded via `performance.now()`.
6. **Test Re-Optimization Engine:**
   - In **Budget Optimizer**, increase the activity budget or lower the total budget so estimated costs exceed the limit.
   - Click **Re-optimize Trip** to watch the application algorithmically scale allocations and re-run Knapsack DP to eliminate deficit.

---

## 8. Academic Complexity Summary

| Problem | Algorithm | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :--- |
| **Activity Selection** | 0/1 Knapsack (DP) | $\mathcal{O}(N \cdot W)$ | $\mathcal{O}(N \cdot W)$ |
| **Shortest Route** | Dijkstra (Min-Heap) | $\mathcal{O}((V + E) \log V)$ | $\mathcal{O}(V + E)$ |
| **All-Pairs Distances**| Floyd-Warshall | $\mathcal{O}(V^3)$ | $\mathcal{O}(V^2)$ |
| **Multi-Stop Tour** | TSP (Branch & Bound)| $\mathcal{O}((N - 1)!)$ worst-case | $\mathcal{O}(N)$ stack depth |
| **Transport Choice** | Greedy Penalty Scoring| $\mathcal{O}(M \log M)$ | $\mathcal{O}(M)$ |
| **Continuous Knapsack**| Greedy Value/Cost | $\mathcal{O}(N \log N)$ | $\mathcal{O}(N)$ |

---

*Developed for the Analysis and Design of Algorithms (AOA) curriculum.*

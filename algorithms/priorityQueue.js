/**
 * PriorityQueue (Min-Heap) Implementation from scratch.
 * Time Complexity:
 *   - Insert: O(log N)
 *   - ExtractMin: O(log N)
 *   - Peek: O(1)
 * Space Complexity: O(N)
 *
 * Used by Dijkstra's Shortest Path and TSP Branch & Bound priority queues.
 */

export class MinPriorityQueue {
    constructor() {
        this.heap = [];
    }

    size() {
        return this.heap.length;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    peek() {
        return this.heap.length > 0 ? this.heap[0] : null;
    }

    insert(element, priority) {
        const node = { element, priority };
        this.heap.push(node);
        this._bubbleUp(this.heap.length - 1);
    }

    extractMin() {
        if (this.isEmpty()) return null;
        const min = this.heap[0];
        const last = this.heap.pop();
        if (this.heap.length > 0 && last !== undefined) {
            this.heap[0] = last;
            this._bubbleDown(0);
        }
        return min;
    }

    _bubbleUp(index) {
        let currentIndex = index;
        while (currentIndex > 0) {
            const parentIndex = Math.floor((currentIndex - 1) / 2);
            if (this.heap[currentIndex].priority < this.heap[parentIndex].priority) {
                this._swap(currentIndex, parentIndex);
                currentIndex = parentIndex;
            } else {
                break;
            }
        }
    }

    _bubbleDown(index) {
        let currentIndex = index;
        const length = this.heap.length;

        while (true) {
            let leftChildIndex = 2 * currentIndex + 1;
            let rightChildIndex = 2 * currentIndex + 2;
            let smallestIndex = currentIndex;

            if (
                leftChildIndex < length &&
                this.heap[leftChildIndex].priority < this.heap[smallestIndex].priority
            ) {
                smallestIndex = leftChildIndex;
            }

            if (
                rightChildIndex < length &&
                this.heap[rightChildIndex].priority < this.heap[smallestIndex].priority
            ) {
                smallestIndex = rightChildIndex;
            }

            if (smallestIndex !== currentIndex) {
                this._swap(currentIndex, smallestIndex);
                currentIndex = smallestIndex;
            } else {
                break;
            }
        }
    }

    _swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }
}

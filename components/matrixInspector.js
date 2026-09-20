/**
 * Floyd-Warshall Matrix Inspector Component
 * Interactive table displaying the all-pairs shortest path matrix,
 * intermediate k-step relaxation explorer, and path reconstruction query tool.
 */

import { runFloydWarshall } from '../algorithms/floydWarshall.js';
import { buildAdjacencyList } from '../data/sampleData.js';

export class MatrixInspector {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.result = null;
        this.currentK = 0;
        this.selectedSource = null;
        this.selectedTarget = null;
    }

    computeAndRender(trip) {
        if (!this.container || !trip) return;

        const nodeIds = trip.locations.map(l => l.id);
        const graph = buildAdjacencyList(trip.locations, trip.connections);
        this.result = runFloydWarshall(nodeIds, graph);
        this.currentK = this.result.kSnapshots.length - 1; // Default to final matrix
        this.render();
    }

    render() {
        if (!this.container || !this.result) return;

        const { nodeIds, kSnapshots, relaxationsCount, executionTime } = this.result;
        const currentSnapshot = kSnapshots[this.currentK] || kSnapshots[kSnapshots.length - 1];
        const matrix = currentSnapshot.matrix;

        const sourceOptions = nodeIds.map(id => `<option value="${id}" ${this.selectedSource === id ? 'selected' : ''}>${id}</option>`).join('');
        const targetOptions = nodeIds.map(id => `<option value="${id}" ${this.selectedTarget === id ? 'selected' : ''}>${id}</option>`).join('');

        // Query path reconstruction if source & target selected
        let queryPathHtml = '';
        if (this.selectedSource && this.selectedTarget) {
            if (this.selectedSource === this.selectedTarget) {
                queryPathHtml = `<div class="path-query-result success">Distance is 0 km (same location).</div>`;
            } else {
                const path = this.result.reconstructPath(this.selectedSource, this.selectedTarget);
                const sIdx = nodeIds.indexOf(this.selectedSource);
                const tIdx = nodeIds.indexOf(this.selectedTarget);
                const dist = this.result.matrix[sIdx][tIdx];

                if (path && dist !== Infinity) {
                    queryPathHtml = `
                        <div class="path-query-result success">
                            <strong>Shortest Path via Floyd-Warshall:</strong>
                            <div class="route-chips">${path.map((p, idx) => `<span class="chip">${p}</span>${idx < path.length - 1 ? ' → ' : ''}`).join('')}</div>
                            <span class="route-stat">Total Distance: <strong>${dist.toFixed(1)} km</strong></span>
                        </div>
                    `;
                } else {
                    queryPathHtml = `<div class="path-query-result warning">No route exists between these locations.</div>`;
                }
            }
        }

        this.container.innerHTML = `
            <div class="matrix-card">
                <div class="matrix-header">
                    <div>
                        <h3 class="section-title">All-Pairs Shortest Path Matrix (Floyd-Warshall)</h3>
                        <p class="section-subtitle">${currentSnapshot.description}</p>
                    </div>
                    <div class="matrix-metrics">
                        <span class="metric-pill">Time: O(V³) = O(${nodeIds.length}³) = ${Math.pow(nodeIds.length, 3)} operations</span>
                        <span class="metric-pill">Space: O(V²) = ${nodeIds.length * nodeIds.length} cells</span>
                        <span class="metric-pill highlight">Runtime: ${executionTime.toFixed(2)} ms</span>
                    </div>
                </div>

                <!-- k-Step Relaxation Stepper -->
                <div class="k-stepper-control">
                    <label class="control-label">
                        <strong>Intermediate Vertex Relaxation Step:</strong>
                        <span class="badge-step">k = ${currentSnapshot.k} / ${nodeIds.length}</span>
                        ${currentSnapshot.intermediateNode ? `<span class="badge-node">(via: ${currentSnapshot.intermediateNode})</span>` : '<span class="badge-node">(Initial Direct Edges)</span>'}
                    </label>
                    <div class="slider-group">
                        <input type="range" id="fw-k-slider" min="0" max="${kSnapshots.length - 1}" value="${this.currentK}" class="fw-slider" />
                        <div class="step-ticks">
                            ${kSnapshots.map((s, idx) => `<span class="tick ${idx === this.currentK ? 'active' : ''}">${s.k}</span>`).join('')}
                        </div>
                    </div>
                </div>

                <!-- Matrix Table -->
                <div class="matrix-table-wrapper">
                    <table class="fw-matrix-table">
                        <thead>
                            <tr>
                                <th class="origin-th">From \\ To</th>
                                ${nodeIds.map(id => `<th title="${id}"><div class="th-content">${id}</div></th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${matrix.map((row, rIdx) => `
                                <tr>
                                    <th class="row-header" title="${nodeIds[rIdx]}">${nodeIds[rIdx]}</th>
                                    ${row.map((cell, cIdx) => {
                                        const isDiag = rIdx === cIdx;
                                        const isInf = cell === Infinity;
                                        const displayVal = isDiag ? '0' : (isInf ? '∞' : cell.toFixed(1));
                                        const isSelectedCell = this.selectedSource === nodeIds[rIdx] && this.selectedTarget === nodeIds[cIdx];
                                        return `
                                            <td class="${isDiag ? 'diagonal-cell' : ''} ${isInf ? 'infinity-cell' : ''} ${isSelectedCell ? 'selected-cell' : ''}"
                                                data-from="${nodeIds[rIdx]}" data-to="${nodeIds[cIdx]}">
                                                ${displayVal}
                                            </td>
                                        `;
                                    }).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Interactive Path Reconstruction Tool -->
                <div class="path-reconstruction-tool">
                    <div class="tool-title">⚡ Instant Path Query (O(1) lookup + O(V) path walk)</div>
                    <div class="query-inputs">
                        <div class="input-field">
                            <label>Origin:</label>
                            <select id="fw-source-select" class="custom-select">
                                <option value="">Select origin...</option>
                                ${sourceOptions}
                            </select>
                        </div>
                        <div class="input-field">
                            <label>Destination:</label>
                            <select id="fw-target-select" class="custom-select">
                                <option value="">Select destination...</option>
                                ${targetOptions}
                            </select>
                        </div>
                    </div>
                    ${queryPathHtml}
                </div>
            </div>
        `;

        // Attach listeners
        const slider = document.getElementById('fw-k-slider');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.currentK = Number(e.target.value);
                this.render();
            });
        }

        const sourceSelect = document.getElementById('fw-source-select');
        if (sourceSelect) {
            sourceSelect.addEventListener('change', (e) => {
                this.selectedSource = e.target.value;
                this.render();
            });
        }

        const targetSelect = document.getElementById('fw-target-select');
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                this.selectedTarget = e.target.value;
                this.render();
            });
        }
    }
}

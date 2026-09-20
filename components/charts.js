/**
 * Canvas Budget Chart & Progress Bar Component
 * Lightweight, high-DPI canvas donut chart and budget progress bar.
 */

export class BudgetCharts {
    /**
     * Render an interactive, anti-aliased Donut Chart onto a canvas element
     * @param {HTMLCanvasElement} canvas
     * @param {Array<{ label: string, value: number, color: string }>} data
     * @param {string} currency
     */
    static renderDonutChart(canvas, data, currency = '₹') {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Retina/High-DPI display scaling
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        const width = rect.width || 300;
        const height = rect.height || 300;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, height);

        const total = data.reduce((sum, item) => sum + item.value, 0);
        const centerX = width / 2;
        const centerY = height / 2;
        const outerRadius = Math.min(centerX, centerY) * 0.85;
        const innerRadius = outerRadius * 0.58;

        if (total <= 0) {
            // Draw empty state placeholder
            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = outerRadius - innerRadius;
            ctx.stroke();

            ctx.fillStyle = '#94a3b8';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No spending yet', centerX, centerY);
            return;
        }

        let startAngle = -Math.PI / 2;

        for (const item of data) {
            if (item.value <= 0) continue;
            const sliceAngle = (item.value / total) * (Math.PI * 2);
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();

            ctx.fillStyle = item.color;
            ctx.fill();

            // Segment border for sleek separation
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            startAngle = endAngle;
        }

        // Center total display
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('TOTAL ESTIMATED', centerX, centerY - 6);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 16px Outfit, Inter, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(`${currency}${total.toLocaleString('en-IN')}`, centerX, centerY + 2);
    }

    /**
     * Render the Budget Progress Bar into a container element
     * @param {HTMLElement} container
     * @param {number} spent
     * @param {number} totalBudget
     * @param {string} currency
     */
    static renderProgressBar(container, spent, totalBudget, currency = '₹') {
        if (!container) return;
        const budget = Math.max(1, totalBudget);
        const percent = Math.min(200, Math.round((spent / budget) * 100));
        const isExceeded = spent > budget;
        const remaining = budget - spent;

        let statusClass = 'status-normal';
        let barColor = '#06b6d4'; // cyan
        if (percent > 100) {
            statusClass = 'status-exceeded';
            barColor = '#ef4444'; // red
        } else if (percent > 85) {
            statusClass = 'status-warning';
            barColor = '#f59e0b'; // amber
        }

        container.innerHTML = `
            <div class="progress-meta">
                <div class="progress-amounts">
                    <span class="spent-val">${currency}${spent.toLocaleString('en-IN')}</span>
                    <span class="divider">/</span>
                    <span class="budget-val">${currency}${budget.toLocaleString('en-IN')}</span>
                </div>
                <div class="progress-badge ${statusClass}">
                    ${percent}% utilized
                </div>
            </div>

            <div class="progress-track" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">
                <div class="progress-fill" style="width: ${Math.min(percent, 100)}%; background-color: ${barColor};"></div>
            </div>

            <div class="progress-footer">
                ${isExceeded 
                    ? `<span class="text-danger font-semibold">⚠️ Budget exceeded by ${currency}${Math.abs(remaining).toLocaleString('en-IN')}!</span>`
                    : `<span class="text-success font-semibold">✓ ${currency}${remaining.toLocaleString('en-IN')} remaining available.</span>`
                }
            </div>
        `;
    }
}

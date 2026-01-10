import { math, engine, assetColors } from './utils.js';
import { burndown } from './burndown.js'; 

let chartInstance = null;
let isRealDollars = false;

if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 10;
    Chart.defaults.color = "#64748b";
}

export const projection = {
    init: () => {
        const realBtn = document.getElementById('toggle-projection-real');
        if (realBtn) {
            realBtn.onclick = () => {
                isRealDollars = !isRealDollars;
                projection.updateToggleStyle(realBtn);
                if (window.currentData) {
                    projection.run(window.currentData);
                }
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
            projection.updateToggleStyle(realBtn);
        }

        const endSlider = document.getElementById('input-projection-end');
        if (endSlider) {
            endSlider.oninput = (e) => {
                const val = e.target.value;
                const label = document.getElementById('label-projection-end');
                if (label) label.textContent = val;
                if (window.currentData) {
                    projection.run(window.currentData);
                }
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }
    },

    getIsRealDollars: () => isRealDollars,
    toggleRealDollars: () => {
        isRealDollars = !isRealDollars;
        return isRealDollars;
    },
    load: (settings) => {
        if (!settings) return;
        isRealDollars = !!settings.isRealDollars;
        const realBtn = document.getElementById('toggle-projection-real');
        if (realBtn) projection.updateToggleStyle(realBtn);
        
        const endSlider = document.getElementById('input-projection-end');
        if (endSlider && settings.chartEndAge) {
            endSlider.value = settings.chartEndAge;
            const label = document.getElementById('label-projection-end');
            if (label) label.textContent = settings.chartEndAge;
        }
    },

    scrape: () => ({ 
        isRealDollars,
        chartEndAge: parseFloat(document.getElementById('input-projection-end')?.value) || 72
    }),

    updateToggleStyle: (btn) => {
        if (!btn) return;
        const isMobile = window.innerWidth < 768;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        
        if (isMobile) {
            btn.textContent = isRealDollars ? '2026 $' : 'Nominal $';
        } else {
            btn.innerHTML = isRealDollars ? '<i class="fas fa-sync-alt"></i> 2026 Dollars' : '<i class="fas fa-calendar-alt"></i> Nominal Dollars';
        }
    },

    run: (data) => {
        if (typeof Chart === 'undefined') return;
        const { assumptions, investments = [], stockOptions = [], realEstate = [], otherAssets = [], budget = {} } = data;
        const currentYear = new Date().getFullYear(), chartEndAge = parseFloat(document.getElementById('input-projection-end')?.value) || 72, maxSimAge = 100, duration = maxSimAge - assumptions.currentAge;

        // Initialize simulation state for individual options
        const simOptions = stockOptions.map(x => {
            const shares = parseFloat(x.shares) || 0;
            const strike = math.fromCurrency(x.strikePrice);
            const fmv = math.fromCurrency(x.currentPrice);
            const netEquity = Math.max(0, (fmv - strike) * shares);
            const growthRate = (x.growth !== undefined && x.growth !== "") ? parseFloat(x.growth) : (assumptions.stockGrowth || 10);
            return {
                value: netEquity,
                growthRate: growthRate / 100
            };
        });

        const getTotalOptionsValue = () => simOptions.reduce((s, o) => s + o.value, 0);

        let buckets = {
            'Cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Brokerage': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Stock Options': getTotalOptionsValue(),
            'Pre-Tax': investments.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Post-Tax': investments.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Crypto': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Metals': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'HSA': investments.filter(i => i.type === 'HSA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            '529': investments.filter(i => i.type === '529').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Real Estate': realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) - math.fromCurrency(r.mortgage)), 0),
            'Other': otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) - math.fromCurrency(o.loan)), 0)
        };

        const inflationRate = (assumptions.inflation || 3) / 100;
        const labels = [], datasets = Object.keys(buckets).map(key => ({ label: key, data: [], backgroundColor: assetColors[key] || '#ccc', borderColor: 'transparent', fill: true, pointRadius: 0 })), tableData = [];

        // Pre-calculate baseline summaries for 401k growth (W2 based)
        const summarySnapshot = engine.calculateSummaries(data);

        for (let i = 0; i <= duration; i++) {
            const age = assumptions.currentAge + i, year = currentYear + i, infFac = Math.pow(1 + inflationRate, i);
            const isRet = age >= assumptions.retirementAge;
            
            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, assumptions.currentAge, assumptions);

            if (age <= chartEndAge) labels.push(`${age} (${currentYear + i})`);
            
            const currentYearBuckets = {};
            Object.keys(buckets).forEach((key, idx) => {
                let disp = isRealDollars ? (buckets[key] / infFac) : buckets[key];
                if (age <= chartEndAge) datasets[idx].data.push(disp);
                currentYearBuckets[key] = disp;
                
                if (['Brokerage', 'Pre-Tax', 'Post-Tax', 'HSA', '529'].includes(key)) buckets[key] *= (1 + stockGrowth);
                else if (key === 'Crypto') buckets[key] *= (1 + cryptoGrowth);
                else if (key === 'Metals') buckets[key] *= (1 + metalsGrowth);
                else if (key === 'Real Estate') buckets[key] *= (1 + realEstateGrowth);
            });

            simOptions.forEach(opt => {
                opt.value *= (1 + opt.growthRate);
            });
            buckets['Stock Options'] = getTotalOptionsValue();

            if (i < 10 || age % 5 === 0 || age === maxSimAge) tableData.push({ age, year: currentYear + i, ...currentYearBuckets });

            // INFLOW LOGIC:
            // 1. 401k from active income (W2)
            if (!isRet) {
                buckets['Pre-Tax'] += summarySnapshot.total401kContribution;
            }

            // 2. Manual Savings (respecting the "Stop in Retirement" flag)
            (budget.savings || []).forEach(sav => {
                // If we are retired AND this item is marked to be removed in retirement, skip it.
                if (isRet && sav.removedInRetirement) return;

                const amt = math.fromCurrency(sav.annual);
                if (sav.type === 'Taxable') buckets['Brokerage'] += amt;
                else if (sav.type === 'Roth IRA') buckets['Post-Tax'] += amt;
                else if (sav.type === 'Cash') buckets['Cash'] += amt;
                else if (sav.type === 'HSA') buckets['HSA'] += amt;
                else if (sav.type === 'Crypto') buckets['Crypto'] += amt;
                else if (sav.type === 'Metals') buckets['Metals'] += amt;
                else if (sav.type === '529') buckets['529'] += amt;
                else if (sav.type === 'Pre-Tax (401k/IRA)') buckets['Pre-Tax'] += amt;
            });
        }
        renderChart(labels, datasets);
        renderTable(tableData);
    }
};

function renderChart(labels, datasets) {
    const ctx = document.getElementById('projection-chart')?.getContext('2d');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    const insolvPlugin = {
        id: 'insolvencyLine',
        afterDatasetsDraw: (chart) => {
            const age = burndown.getInsolvencyAge();
            if (!age) return;
            const index = chart.data.labels.findIndex(l => l.startsWith(age.toString()));
            if (index !== -1) {
                const x = chart.scales.x.getPixelForValue(index), top = chart.scales.y.top, bottom = chart.scales.y.bottom;
                chart.ctx.save();
                chart.ctx.beginPath(); chart.ctx.strokeStyle = '#ef4444'; chart.ctx.lineWidth = 2; chart.ctx.setLineDash([5, 5]);
                chart.ctx.moveTo(x, top); chart.ctx.lineTo(x, bottom); chart.ctx.stroke();
                chart.ctx.fillStyle = '#ef4444'; chart.ctx.font = "bold 10px Inter"; chart.ctx.textAlign = 'center';
                chart.ctx.fillText('SOLVENCY CLIFF', x, top + 10);
                chart.ctx.restore();
            }
        }
    };

    chartInstance = new Chart(ctx, {
        type: 'line', data: { labels, datasets }, plugins: [insolvPlugin],
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { weight: 'bold' } } }, tooltip: { backgroundColor: '#0f172a', bodyFont: { family: "monospace", size: 10 }, callbacks: { label: (c) => `${c.dataset.label}: ${math.toCurrency(c.parsed.y)}` } } },
            scales: {
                y: { stacked: true, ticks: { callback: (v) => math.toCurrency(v, true) }, grid: { color: 'rgba(51, 65, 85, 0.2)' } },
                x: { ticks: { maxTicksLimit: 12 }, grid: { display: false } }
            }
        }
    });
}

function renderTable(tableData) {
    const container = document.getElementById('projection-table-container'); if (!container || tableData.length === 0) return;
    const keys = Object.keys(tableData[0]).filter(k => k !== 'age' && k !== 'year');
    container.innerHTML = `<table class="w-full text-left border-collapse"><thead class="bg-slate-900/50 text-slate-500 label-std"><tr><th class="px-4 py-2">Age (Year)</th>${keys.map(k => `<th class="px-4 py-2 text-right" style="color:${assetColors[k] || '#94a3b8'}">${k}</th>`).join('')}<th class="px-4 py-2 text-right text-teal-400">Total</th></tr></thead><tbody class="mono-numbers text-xs">${tableData.map(row => { const total = keys.reduce((s, k) => s + (row[k] || 0), 0); return `<tr class="border-b border-slate-700/50 hover:bg-slate-800/20"><td class="px-4 py-2 font-bold text-white">${row.age} <span class="text-slate-500 font-normal">(${row.year})</span></td>${keys.map(k => `<td class="px-4 py-2 text-right">${math.toCurrency(row[k], true)}</td>`).join('')}<td class="px-4 py-2 text-right font-black text-teal-400">${math.toCurrency(total, true)}</td></tr>` }).join('')}</tbody></table>`;
}
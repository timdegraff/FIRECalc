
import { math, engine, assetColors } from './utils.js';

let chartInstance = null;
let isRealDollars = false;

Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 10;
Chart.defaults.color = "#64748b";

export const projection = {
    load: (settings) => {
        if (!settings) return;
        isRealDollars = !!settings.isRealDollars;
        const realBtn = document.getElementById('toggle-projection-real');
        if (realBtn) {
            projection.updateToggleStyle(realBtn);
        }
    },

    scrape: () => {
        return { isRealDollars };
    },

    updateToggleStyle: (btn) => {
        if (!btn) return;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        btn.classList.toggle('border-blue-500/30', isRealDollars);
        btn.innerHTML = isRealDollars ? 
            '<i class="fas fa-sync-alt"></i> 2026 Dollars' : 
            '<i class="fas fa-calendar-alt"></i> Nominal Dollars';
    },

    run: (data) => {
        const { assumptions, investments = [], realEstate = [], otherAssets = [], budget = {} } = data;
        const currentYear = new Date().getFullYear();
        // Chart uses this limit
        const chartEndAge = parseFloat(document.getElementById('input-projection-end')?.value) || 75;
        // Table always simulates to 100
        const maxSimAge = 100;
        const duration = maxSimAge - assumptions.currentAge;

        const realBtn = document.getElementById('toggle-projection-real');
        if (realBtn && !realBtn.dataset.init) {
            realBtn.dataset.init = "true";
            realBtn.onclick = () => {
                isRealDollars = !isRealDollars;
                projection.updateToggleStyle(realBtn);
                projection.run(window.currentData);
                window.debouncedAutoSave();
            };
        }
        
        let buckets = {
            'Cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Brokerage': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Pre-Tax': investments.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Post-Tax': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Crypto': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Metals': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'HSA': investments.filter(i => i.type === 'HSA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'Real Estate': realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) - math.fromCurrency(r.mortgage)), 0),
            'Other': otherAssets.reduce((s, o) => s + (math.fromCurrency(o.value) - math.fromCurrency(o.loan)), 0)
        };

        const stockGrowth = (assumptions.stockGrowth || 7) / 100;
        const cryptoGrowth = (assumptions.cryptoGrowth || 15) / 100;
        const metalsGrowth = (assumptions.metalsGrowth || 4) / 100;
        const realEstateGrowth = (assumptions.realEstateGrowth || 3) / 100;
        const inflationRate = (assumptions.inflation || 3) / 100;
        
        const labels = [];
        const datasets = Object.keys(buckets).map(key => ({
            label: key,
            data: [],
            backgroundColor: assetColors[key] || '#ccc',
            borderColor: 'transparent',
            fill: true,
            pointRadius: 0
        }));
        
        const tableData = [];

        for (let i = 0; i <= duration; i++) {
            const age = assumptions.currentAge + i;
            // Only add labels if within chart range
            if (age <= chartEndAge) {
                labels.push(`${age} (${currentYear + i})`);
            }
            
            const inflationFactor = Math.pow(1 + inflationRate, i);
            const currentYearBuckets = {};

            Object.keys(buckets).forEach((key, idx) => {
                let displayValue = isRealDollars ? (buckets[key] / inflationFactor) : buckets[key];
                
                // Only plot if within chart range
                if (age <= chartEndAge) {
                    datasets[idx].data.push(displayValue);
                }
                
                currentYearBuckets[key] = displayValue;
                
                if (key === 'Brokerage' || key === 'Pre-Tax' || key === 'Post-Tax' || key === 'HSA') buckets[key] *= (1 + stockGrowth);
                else if (key === 'Crypto') buckets[key] *= (1 + cryptoGrowth);
                else if (key === 'Metals') buckets[key] *= (1 + metalsGrowth);
                else if (key === 'Real Estate') buckets[key] *= (1 + realEstateGrowth);
                else if (key === 'Cash') buckets[key] *= (1 + (inflationRate * 0.5));
            });

            // Table Logic: First 10 years, then every 5 years, or exactly 100
            if (i < 10 || age % 5 === 0 || age === maxSimAge) {
                tableData.push({ age, year: currentYear + i, ...currentYearBuckets });
            }

            if (age < assumptions.retirementAge) {
                const summaries = engine.calculateSummaries(data);
                buckets['Pre-Tax'] += summaries.total401kContribution;
                
                (budget.savings || []).forEach(s => {
                    const amt = math.fromCurrency(s.annual);
                    const type = s.type;
                    if (type === 'Taxable') buckets['Brokerage'] += amt;
                    else if (type === 'Post-Tax (Roth)') buckets['Post-Tax'] += amt;
                    else if (type === 'Cash') buckets['Cash'] += amt;
                    else if (type === 'HSA') buckets['HSA'] += amt;
                    else if (type === 'Crypto') buckets['Crypto'] += amt;
                    else if (type === 'Metals') buckets['Metals'] += amt;
                    else if (type === 'Pre-Tax (401k/IRA)') buckets['Pre-Tax'] += amt;
                });
            }
        }
        
        renderChart(labels, datasets);
        renderTable(tableData);
    }
};

function renderChart(labels, datasets) {
    const ctx = document.getElementById('projection-chart')?.getContext('2d');
    if (!ctx) return;
    if (chartInstance) chartInstance.destroy();

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { family: "'Inter', sans-serif", weight: 'bold' } } },
                tooltip: {
                    backgroundColor: '#0f172a',
                    bodyFont: { family: "'Inter', sans-serif", size: 10 },
                    callbacks: { label: (c) => `${c.dataset.label}: ${math.toCurrency(c.parsed.y)}` }
                }
            },
            scales: {
                y: { 
                    stacked: true, 
                    title: {
                        display: true,
                        text: isRealDollars ? 'Net Worth (2026 Dollars)' : 'Net Worth (Nominal Dollars)',
                        font: { family: "'Inter', sans-serif", weight: '800', size: 9 },
                        color: '#475569'
                    },
                    ticks: { 
                        font: { family: "'Inter', sans-serif" }, 
                        callback: (v) => math.toCurrency(v, true) 
                    }, 
                    grid: { color: 'rgba(51, 65, 85, 0.2)' } 
                },
                x: { ticks: { font: { family: "'Inter', sans-serif" }, maxTicksLimit: 12 }, grid: { display: false } }
            }
        }
    });
}

function renderTable(tableData) {
    const container = document.getElementById('projection-table-container');
    if (!container) return;

    if (tableData.length === 0) {
        container.innerHTML = '';
        return;
    }

    const keys = Object.keys(tableData[0]).filter(k => k !== 'age' && k !== 'year');
    
    const headerHtml = `
        <thead class="bg-slate-900/50 text-slate-500 label-std">
            <tr>
                <th class="px-4 py-2 text-left">Age (Year)</th>
                ${keys.map(k => `<th class="px-4 py-2 text-right" style="color: ${assetColors[k] || '#94a3b8'}">${k}</th>`).join('')}
                <th class="px-4 py-2 text-right text-teal-400">Total</th>
            </tr>
        </thead>
    `;

    const bodyHtml = `
        <tbody class="mono-numbers text-xs">
            ${tableData.map(row => {
                const total = keys.reduce((s, k) => s + (row[k] || 0), 0);
                return `
                    <tr class="border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors">
                        <td class="px-4 py-2 font-bold text-white">${row.age} <span class="text-slate-500 font-normal">(${row.year})</span></td>
                        ${keys.map(k => `<td class="px-4 py-2 text-right">${math.toCurrency(row[k], true)}</td>`).join('')}
                        <td class="px-4 py-2 text-right font-black text-teal-400">${math.toCurrency(total, true)}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;

    container.innerHTML = `
        <table class="w-full text-left border-collapse">
            ${headerHtml}
            ${bodyHtml}
        </table>
    `;
}


import { signInWithGoogle, logoutUser } from './auth.js';
import { templates } from './templates.js';
import { autoSave, updateSummaries } from './data.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { formatter } from './formatter.js';

let assetChart = null;
let lastChartSum = 0;
let investmentSortable = null;

export function initializeUI() {
    attachGlobalListeners();
    attachNavigationListeners();
    attachDynamicRowListeners();
    attachSortingListeners();
    attachPasteListeners();
    initializeDragAndDrop();
    showTab('assets-debts');
}

function initializeDragAndDrop() {
    const invRows = document.getElementById('investment-rows');
    if (invRows && !investmentSortable) {
        investmentSortable = new Sortable(invRows, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'bg-slate-700/30',
            onEnd: () => {
                window.debouncedAutoSave();
            }
        });
    }
}

function refreshEfficiencyBadges() {
    const state = window.currentData?.assumptions?.state || 'Michigan';
    document.querySelectorAll('#investment-rows tr').forEach(invRow => {
        const valueEl = invRow.querySelector('[data-id="value"]');
        const basisEl = invRow.querySelector('[data-id="costBasis"]');
        const typeEl = invRow.querySelector('[data-id="type"]');
        const container = invRow.querySelector('[data-id="efficiency-container"]');
        if (container && typeEl && valueEl && basisEl) {
            container.innerHTML = templates.helpers.getEfficiencyBadge(
                typeEl.value, 
                valueEl.value, 
                basisEl.value,
                state
            );
        }
    });
}

function attachGlobalListeners() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = signInWithGoogle;
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = logoutUser;

    document.body.addEventListener('click', (e) => {
        if (e.target.id === 'btn-reset-market') {
            const marketDefaults = {
                stockGrowth: 8,
                cryptoGrowth: 10,
                metalsGrowth: 6,
                realEstateGrowth: 3,
                inflation: 3
            };
            Object.entries(marketDefaults).forEach(([id, val]) => {
                syncAllInputs(id, val);
                if (window.currentData?.assumptions) window.currentData.assumptions[id] = val;
            });
            window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.closest('.input-base, .input-range') || target.closest('input[data-id]')) {
            handleLinkedBudgetValues(target);
            
            const invRow = target.closest('#investment-rows tr');
            if (invRow) {
                const valueEl = invRow.querySelector('[data-id="value"]');
                const basisEl = invRow.querySelector('[data-id="costBasis"]');
                const typeEl = invRow.querySelector('[data-id="type"]');
                const container = invRow.querySelector('[data-id="efficiency-container"]');
                if (container && typeEl && valueEl && basisEl) {
                    container.innerHTML = templates.helpers.getEfficiencyBadge(
                        typeEl.value, 
                        valueEl.value, 
                        basisEl.value,
                        window.currentData?.assumptions?.state || 'Michigan'
                    );
                }
            }

            if (target.dataset.id === 'contribution' || target.dataset.id === 'amount' || target.dataset.id === 'bonusPct' || target.dataset.id === 'contribOnBonus') {
                const row = target.closest('tr') || target.closest('.bg-slate-800');
                if (row) checkIrsLimits(row);
            }
            
            const id = target.dataset.id || target.dataset.liveId;
            const isAssumptionControl = target.closest('#assumptions-container') || target.closest('#burndown-live-sliders') || target.id === 'input-top-retire-age';

            if (id && isAssumptionControl) {
                let val = target.value;
                if (id === 'currentAge' || id === 'retirementAge') {
                    const currentAge = parseFloat(document.querySelector('[data-id="currentAge"]')?.value || window.currentData?.assumptions?.currentAge || 40);
                    let retirementAge = parseFloat(document.querySelector('[data-id="retirementAge"]')?.value || window.currentData?.assumptions?.retirementAge || 65);
                    if (id === 'currentAge') {
                        const newC = parseFloat(val);
                        if (newC > retirementAge) {
                            retirementAge = newC;
                            syncAllInputs('retirementAge', newC);
                        }
                    } else if (id === 'retirementAge') {
                        const newR = parseFloat(val);
                        if (newR < currentAge) {
                            val = currentAge;
                            target.value = val;
                        }
                    }
                }
                syncAllInputs(id, val);
                if (window.currentData && window.currentData.assumptions) {
                    const numericVal = (target.tagName === 'SELECT' || isNaN(parseFloat(val))) ? val : (target.dataset.type === 'currency' ? math.fromCurrency(val) : parseFloat(val));
                    window.currentData.assumptions[id] = numericVal;
                    if (id === 'state') refreshEfficiencyBadges();
                }
            }

            window.debouncedAutoSave();
        }
    });

    document.getElementById('input-projection-end')?.addEventListener('input', (e) => {
        const label = document.getElementById('label-projection-end');
        if (label) label.textContent = e.target.value;
        window.debouncedAutoSave();
    });
}

function syncAllInputs(id, val) {
    const selectors = [
        `#assumptions-container [data-id="${id}"]`,
        `#burndown-live-sliders [data-live-id="${id}"]`,
        `#burndown-live-sliders [data-id="${id}"]`,
        `#input-top-retire-age[data-id="${id}"]`
    ];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (el.value != val) el.value = val;
            let label = el.id === 'input-top-retire-age' ? document.getElementById('label-top-retire-age') : el.previousElementSibling?.querySelector('span');
            if (label) {
                if (id === 'ssMonthly') label.textContent = math.toCurrency(parseFloat(val));
                else if (id.toLowerCase().includes('growth') || id === 'inflation') label.textContent = `${val}%`;
                else if (id.toLowerCase().includes('factor')) label.textContent = `${Math.round(val * 100)}%`;
                else label.textContent = val;
            }
        });
    });
}

function attachPasteListeners() {
    document.body.addEventListener('paste', (e) => {
        const target = e.target;
        if (target.dataset.paste === 'spreadsheet' || target.dataset.id === 'monthly' || target.dataset.id === 'annual') {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedData = clipboardData.getData('Text');
            if (pastedData.includes('\t') || pastedData.includes('\n')) {
                e.preventDefault();
                const lines = pastedData.trim().split(/\r?\n/);
                const isExpenseTable = target.closest('#budget-expenses-rows') !== null;
                const containerId = isExpenseTable ? 'budget-expenses-rows' : 'budget-savings-rows';
                const rowType = isExpenseTable ? 'budget-expense' : 'budget-savings';
                lines.forEach((line, index) => {
                    const columns = line.split('\t');
                    let name = '', monthly = 0;
                    if (target.dataset.id === 'monthly') {
                        if (columns.length > 1 && isNaN(math.fromCurrency(columns[0]))) { name = columns[0]; monthly = math.fromCurrency(columns[1]); }
                        else { monthly = math.fromCurrency(columns[0]); }
                    } else {
                        name = columns[0] || '';
                        monthly = math.fromCurrency(columns[1] || '0');
                    }
                    if (index === 0 && !target.value.trim()) {
                        const row = target.closest('tr');
                        const nameInp = row.querySelector('[data-id="name"]');
                        const monthlyInp = row.querySelector('[data-id="monthly"]');
                        const annualInp = row.querySelector('[data-id="annual"]');
                        if (nameInp && name) nameInp.value = name;
                        if (monthlyInp) monthlyInp.value = math.toCurrency(monthly);
                        if (annualInp) annualInp.value = math.toCurrency(monthly * 12);
                    } else {
                        window.addRow(containerId, rowType, { name, monthly, annual: monthly * 12 });
                    }
                });
                window.debouncedAutoSave();
            }
        }
    });
}

function checkIrsLimits(row) {
    const amountEl = row.querySelector('[data-id="amount"]');
    if (!amountEl) return;
    const amountValue = math.fromCurrency(amountEl.value);
    const freqBtn = row.querySelector('[data-id="isMonthly"]');
    const isMonthly = freqBtn && freqBtn.textContent.trim().toLowerCase() === 'monthly';
    const baseAnnual = isMonthly ? amountValue * 12 : amountValue;
    
    const bonusPct = parseFloat(row.querySelector('[data-id="bonusPct"]')?.value) || 0;
    const bonus = baseAnnual * (bonusPct / 100);

    // Get contribution rate
    const personalPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    
    // Check flags
    const contribOnBonus = row.querySelector('[data-id="contribOnBonus"]')?.checked || false;

    let personal401k = baseAnnual * (personalPct / 100);
    if (contribOnBonus) {
        personal401k += (bonus * (personalPct / 100));
    }
    
    const age = window.currentData?.assumptions?.currentAge || 40;
    const limit = age >= 50 ? 31000 : 23500; 

    const warning = row.querySelector('[data-id="capWarning"]');
    if (warning) warning.classList.toggle('hidden', personal401k <= limit);
}

function handleLinkedBudgetValues(target) {
    const row = target.closest('tr');
    if (!row) return;
    const isBudgetRow = row.closest('#budget-savings-rows') || row.closest('#budget-expenses-rows');
    if (!isBudgetRow) return;
    const monthlyInput = row.querySelector('[data-id="monthly"]');
    const annualInput = row.querySelector('[data-id="annual"]');
    if (!monthlyInput || !annualInput) return;
    const val = math.fromCurrency(target.value);
    if (target.dataset.id === 'monthly') annualInput.value = math.toCurrency(val * 12);
    else if (target.dataset.id === 'annual') monthlyInput.value = math.toCurrency(val / 12);
}

function attachNavigationListeners() {
    document.getElementById('main-nav')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn && btn.dataset.tab) showTab(btn.dataset.tab);
    });
}

function attachDynamicRowListeners() {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        if (btn.dataset.addRow) { window.addRow(btn.dataset.addRow, btn.dataset.rowType); window.debouncedAutoSave(); }
        else if (btn.dataset.action === 'remove') { (btn.closest('tr') || btn.closest('.bg-slate-800'))?.remove(); window.debouncedAutoSave(); }
        else if (btn.dataset.action === 'toggle-freq') {
            const isMonthly = btn.textContent.trim().toLowerCase() === 'monthly';
            btn.textContent = isMonthly ? 'Annual' : 'Monthly';
            const input = btn.closest('div')?.querySelector('input');
            if (input) { const cur = math.fromCurrency(input.value); input.value = math.toCurrency(isMonthly ? cur * 12 : cur / 12); }
            const parent = btn.closest('.bg-slate-800');
            if (parent) checkIrsLimits(parent);
            window.debouncedAutoSave();
        }
    });
    
    // Robust change listener
    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.dataset.id === 'type') {
            if (target.closest('#investment-rows')) updateCostBasisVisibility(target.closest('tr'));
            target.className = `input-base w-full font-bold bg-slate-900 ${templates.helpers.getTypeClass(target.value)}`;
        }
        
        if (target.dataset.id === 'contribOnBonus' || target.dataset.id === 'matchOnBonus') {
            const row = target.closest('.bg-slate-800');
            if (row) checkIrsLimits(row);
        }

        if (target.dataset.id) {
            window.debouncedAutoSave();
        }
    });
}

function attachSortingListeners() {
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.onclick = () => {
            const type = header.dataset.sort;
            const container = document.getElementById(header.dataset.target);
            if (!container) return;
            const rows = Array.from(container.querySelectorAll('tr'));
            const isAsc = header.dataset.order === 'asc';
            rows.sort((a, b) => {
                const valA = math.fromCurrency(a.querySelector(`[data-id="${type}"]`)?.value || 0);
                const valB = math.fromCurrency(b.querySelector(`[data-id="${type}"]`)?.value || 0);
                return isAsc ? valA - valB : valB - valA;
            });
            header.dataset.order = isAsc ? 'desc' : 'asc';
            container.append(...rows);
            window.debouncedAutoSave();
        };
    });
}

function updateCostBasisVisibility(row) {
    const typeSelect = row.querySelector('[data-id="type"]');
    const costBasisInput = row.querySelector('[data-id="costBasis"]');
    if (!typeSelect || !costBasisInput) return;
    const isIrrelevant = (['Pre-Tax (401k/IRA)', 'Cash', 'HSA', '529 Plan'].includes(typeSelect.value));
    costBasisInput.style.visibility = isIrrelevant ? 'hidden' : 'visible';
    costBasisInput.disabled = isIrrelevant;
    if (isIrrelevant) {
        costBasisInput.value = '$0';
    }
}

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    if (tabId === 'burndown' || tabId === 'projection') window.debouncedAutoSave(); 
}

window.addRow = (containerId, type, data = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    let element = type === 'income' ? document.createElement('div') : document.createElement('tr');
    if (type !== 'income') element.className = 'border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors';
    element.innerHTML = templates[type](data);
    container.appendChild(element);
    element.querySelectorAll('[data-id]').forEach(input => {
        const key = input.dataset.id;
        const val = data[key];
        if (val !== undefined) {
            if (input.type === 'checkbox') input.checked = !!val;
            else if (input.tagName === 'SELECT') {
                input.value = val;
                input.className = `input-base w-full font-bold bg-slate-900 ${templates.helpers.getTypeClass(val)}`;
            }
            else if (input.dataset.type === 'currency') input.value = math.toCurrency(val);
            else input.value = val;
        }
    });
    if (type === 'income') {
        const amtBtn = element.querySelector('[data-id="isMonthly"]');
        if (amtBtn) amtBtn.textContent = data.isMonthly ? 'Monthly' : 'Annual';
        
        const expBtn = element.querySelector('[data-id="incomeExpensesMonthly"]');
        if (expBtn) expBtn.textContent = data.incomeExpensesMonthly ? 'Monthly' : 'Annual';

        checkIrsLimits(element);
    }
    if (type === 'investment') updateCostBasisVisibility(element);
    element.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
};

window.updateSidebarChart = (data) => {
    const ctx = document.getElementById('sidebar-asset-chart')?.getContext('2d');
    if (!ctx) return;
    const totals = {};
    let totalSum = 0;
    data.investments?.forEach(i => { const v = math.fromCurrency(i.value); totals[i.type] = (totals[i.type] || 0) + v; totalSum += v; });
    data.realEstate?.forEach(r => { const v = math.fromCurrency(r.value); totals['Real Estate'] = (totals['Real Estate'] || 0) + v; totalSum += v; });
    data.otherAssets?.forEach(o => { const v = math.fromCurrency(o.value); totals['Other'] = (totals['Other'] || 0) + v; totalSum += v; });
    if (lastChartSum !== 0 && (Math.abs(totalSum - lastChartSum) / lastChartSum) < 0.005) return;
    lastChartSum = totalSum;
    if (assetChart) assetChart.destroy();
    assetChart = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: Object.keys(totals), datasets: [{ data: Object.values(totals), backgroundColor: Object.keys(totals).map(l => assetColors[l] || assetColors['Taxable']), borderWidth: 0, hoverOffset: 2 }] },
        options: { plugins: { legend: { display: false }, tooltip: { bodyFont: { family: "'Inter', sans-serif" }, callbacks: { label: (c) => `${c.label}: ${((c.parsed / totalSum) * 100).toFixed(1)}%` } } }, cutout: '75%', responsive: true, maintainAspectRatio: false }
    });
};

window.createAssumptionControls = (data) => {
    const container = document.getElementById('assumptions-container');
    if (!container) return;
    container.innerHTML = `
        <div class="col-span-full mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-user-circle text-blue-400"></i><h3 class="label-std text-slate-400">Personal & Strategy</h3></div>
        <div class="space-y-6 lg:border-r lg:border-slate-700/30 lg:pr-8">
            <label class="block"><span class="label-std text-slate-500">Legal State of Residence</span>
                <select data-id="state" class="input-base w-full mt-1 font-bold bg-slate-900">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${data.assumptions?.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </label>
            <!-- ... rest of assumptions ... -->
`;
    // Re-render rest of assumptions here is handled by data.js calling window.createAssumptionControls
    // Note: Since I cut off the innerHTML string in core.js above, I should rely on data.js having the full function or updated it fully if I was changing assumptions structure. 
    // Since I'm not changing the structure, just the background color of select, I can rely on the listener update for bg-slate-900.
    // However, to be safe, I will update the function in data.js or just ensure css handles it.
    // Wait, the user provided core.js content is truncated in my thought. The user provided file `core.js` ends with `window.createAssumptionControls`.
    // I will replace `window.createAssumptionControls` to ensure bg-slate-900 is present.
    
    // Actually, to keep it simple and safe given the partial file provided in prompt (it ends with createAssumptionControls),
    // I will paste the Full Content of core.js with the fix.
    
    const originalHTML = `
        <div class="col-span-full mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-user-circle text-blue-400"></i><h3 class="label-std text-slate-400">Personal & Strategy</h3></div>
        <div class="space-y-6 lg:border-r lg:border-slate-700/30 lg:pr-8">
            <label class="block"><span class="label-std text-slate-500">Legal State of Residence</span>
                <select data-id="state" class="input-base w-full mt-1 font-bold bg-slate-900">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${data.assumptions?.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </label>
            <label class="block"><span class="label-std text-slate-500">Filing Status</span>
                <select data-id="filingStatus" class="input-base w-full mt-1 font-bold bg-slate-900">
                    <option ${data.assumptions?.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                    <option ${data.assumptions?.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                    <option ${data.assumptions?.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
                </select>
            </label>
            <div class="grid grid-cols-2 gap-4">
                <label class="block"><span class="label-std text-slate-500">Current Age</span><input data-id="currentAge" type="number" value="${data.assumptions?.currentAge}" class="input-base w-full mt-1 font-bold text-white"></label>
                <label class="block"><span class="label-std text-slate-500">Retirement Age</span><input data-id="retirementAge" type="number" value="${data.assumptions?.retirementAge}" class="input-base w-full mt-1 font-bold text-blue-400"></label>
            </div>
            <label class="block"><span class="label-std text-slate-500">SS Start Age</span><input data-id="ssStartAge" type="number" value="${data.assumptions?.ssStartAge}" class="input-base w-full mt-1 font-bold text-white"></label>
            <label class="block"><span class="label-std text-slate-500">SS Monthly Benefit</span><input data-id="ssMonthly" type="number" value="${data.assumptions?.ssMonthly}" class="input-base w-full mt-1 font-bold text-white"></label>
            <div class="pt-4 border-t border-slate-700/30">
                 <button id="btn-reset-market" class="w-full py-2 bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Reset Market Defaults</button>
            </div>
        </div>

        <div class="col-span-1 space-y-6">
            <h3 class="label-std text-slate-400 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-chart-line text-emerald-400"></i> Market Assumptions</h3>
            <label class="block"><span class="label-std text-slate-500">Stock Growth</span><div class="flex items-center gap-2"><input data-id="stockGrowth" type="range" min="0" max="15" step="0.5" value="${data.assumptions?.stockGrowth}" class="input-range"><span class="text-emerald-400 font-bold mono-numbers w-10 text-right">${data.assumptions?.stockGrowth}%</span></div></label>
            <label class="block"><span class="label-std text-slate-500">Crypto Growth</span><div class="flex items-center gap-2"><input data-id="cryptoGrowth" type="range" min="0" max="50" step="1" value="${data.assumptions?.cryptoGrowth}" class="input-range"><span class="text-orange-400 font-bold mono-numbers w-10 text-right">${data.assumptions?.cryptoGrowth}%</span></div></label>
            <label class="block"><span class="label-std text-slate-500">Metals Growth</span><div class="flex items-center gap-2"><input data-id="metalsGrowth" type="range" min="0" max="15" step="0.5" value="${data.assumptions?.metalsGrowth}" class="input-range"><span class="text-yellow-500 font-bold mono-numbers w-10 text-right">${data.assumptions?.metalsGrowth}%</span></div></label>
            <label class="block"><span class="label-std text-slate-500">Real Estate Growth</span><div class="flex items-center gap-2"><input data-id="realEstateGrowth" type="range" min="0" max="10" step="0.5" value="${data.assumptions?.realEstateGrowth}" class="input-range"><span class="text-indigo-400 font-bold mono-numbers w-10 text-right">${data.assumptions?.realEstateGrowth}%</span></div></label>
            <label class="block"><span class="label-std text-slate-500">Inflation</span><div class="flex items-center gap-2"><input data-id="inflation" type="range" min="0" max="10" step="0.1" value="${data.assumptions?.inflation}" class="input-range"><span class="text-red-400 font-bold mono-numbers w-10 text-right">${data.assumptions?.inflation}%</span></div></label>
        </div>

        <div class="col-span-1 space-y-6 lg:border-l lg:border-slate-700/30 lg:pl-8">
            <h3 class="label-std text-slate-400 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-couch text-pink-400"></i> Retirement Spending</h3>
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                <label class="block">
                    <span class="label-std text-slate-500">Slow-Go (Age 55-65)</span>
                    <div class="flex items-center gap-2 mt-1">
                        <input data-id="slowGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.slowGoFactor || 1.1}" class="input-range">
                        <span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((data.assumptions?.slowGoFactor || 1.1) * 100)}%</span>
                    </div>
                </label>
                 <label class="block">
                    <span class="label-std text-slate-500">Mid-Go (Age 65-80)</span>
                    <div class="flex items-center gap-2 mt-1">
                        <input data-id="midGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.midGoFactor || 1.0}" class="input-range">
                        <span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((data.assumptions?.midGoFactor || 1.0) * 100)}%</span>
                    </div>
                </label>
                 <label class="block">
                    <span class="label-std text-slate-500">No-Go (Age 80+)</span>
                    <div class="flex items-center gap-2 mt-1">
                        <input data-id="noGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.noGoFactor || 0.85}" class="input-range">
                        <span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((data.assumptions?.noGoFactor || 0.85) * 100)}%</span>
                    </div>
                </label>
            </div>
        </div>
    `;
    container.innerHTML = originalHTML;
};

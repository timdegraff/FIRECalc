
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
            
            // IMMEDIATE UI FEEDBACK FOR INVESTMENT EFFICIENCY
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

            if (target.dataset.id === 'contribution' || target.dataset.id === 'amount') {
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
    const personalPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    const personal401k = baseAnnual * (personalPct / 100);
    const limit = 23500; 
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
    // Robust change listener for dropdowns, checkboxes, etc.
    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.dataset.id === 'type') {
            if (target.closest('#investment-rows')) updateCostBasisVisibility(target.closest('tr'));
            target.className = `input-base w-full font-bold ${templates.helpers.getTypeClass(target.value)}`;
        }
        // Save whenever any data-id field changes
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
                input.className = `input-base w-full font-bold ${templates.helpers.getTypeClass(val)}`;
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
                <select data-id="state" class="input-base w-full mt-1 font-bold">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${data.assumptions?.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </label>
            <label class="block"><span class="label-std text-slate-500">Filing Status</span><select data-id="filingStatus" class="input-base w-full mt-1 font-bold"><option>Single</option><option>Married Filing Jointly</option><option>Head of Household</option></select></label>
            <div id="assumptions-life"></div>
        </div>
        <div class="space-y-6 lg:border-r lg:border-slate-700/30 lg:px-8">
            <div class="mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-university text-emerald-400"></i><h3 class="label-std text-slate-400">Retirement & Social Security</h3></div>
            <div id="assumptions-retirement"></div>
        </div>
        <div class="space-y-6 lg:pl-8">
            <div class="mb-4 pb-2 border-b border-slate-700/50 flex items-center justify-between">
                <div class="flex items-center gap-2"><i class="fas fa-chart-area text-amber-400"></i><h3 class="label-std text-slate-400">Market & Growth</h3></div>
                <button id="btn-reset-market" class="text-[9px] font-black uppercase text-slate-600 hover:text-blue-400 transition-colors">Reset Defaults</button>
            </div>
            <div id="assumptions-market"></div>
        </div>
    `;
    const groups = {
        life: [{ id: 'currentAge', label: 'Current Age', min: 18, max: 100, step: 1 }, { id: 'retirementAge', label: 'Retirement Age', min: 18, max: 100, step: 1 }],
        retirement: [
            { id: 'ssStartAge', label: 'SS Start Age', min: 62, max: 70, step: 1 }, 
            { id: 'ssMonthly', label: 'SS Monthly (Today\'s $)', min: 0, max: 6000, step: 100, isCurrency: true },
            { id: 'workYearsAtRetirement', label: 'SS Work Years', min: 10, max: 45, step: 1 },
            { id: 'slowGoFactor', label: 'Early Ret (Age <65) Spend %', min: 0.5, max: 1.5, step: 0.1, isPct: true },
            { id: 'midGoFactor', label: 'Mid Ret (Age 65-80) Spend %', min: 0.5, max: 1.5, step: 0.1, isPct: true },
            { id: 'noGoFactor', label: 'Late Ret (Age 80+) Spend %', min: 0.5, max: 1.5, step: 0.1, isPct: true }
        ],
        market: [{ id: 'stockGrowth', label: 'Stocks APY %', min: 0, max: 15, step: 0.5 }, { id: 'cryptoGrowth', label: 'Bitcoin %', min: 0, max: 15, step: 0.5 }, { id: 'metalsGrowth', label: 'Metals %', min: 0, max: 15, step: 0.5 }, { id: 'realEstateGrowth', label: 'Real Estate APY %', min: 0, max: 15, step: 0.5 }, { id: 'inflation', label: 'Inflation %', min: 0, max: 10, step: 0.1 }]
    };
    Object.entries(groups).forEach(([g, configs]) => {
        const sub = document.getElementById(`assumptions-${g}`);
        configs.forEach(({ id, label, min, max, step, isCurrency, isPct }) => {
            let val = data.assumptions?.[id] ?? assumptions.defaults[id];
            const div = document.createElement('div');
            div.className = 'space-y-2 mb-6';
            const suffix = (id.toLowerCase().includes('growth') || id === 'inflation') ? '%' : '';
            const displayVal = isCurrency ? math.toCurrency(val) : (isPct ? `${Math.round(val * 100)}%` : val + suffix);
            
            div.innerHTML = `<label class="flex justify-between label-std text-slate-500">${label} <span class="text-emerald-400 font-black mono-numbers">${displayVal}</span></label><input type="range" data-id="${id}" value="${val}" min="${min}" max="${max}" step="${step}" class="input-range">`;
            
            if (id === 'ssMonthly') {
                div.innerHTML += `
                    <div class="mt-1">
                        <a href="https://www.ssa.gov/myaccount/" target="_blank" rel="noopener noreferrer" class="text-[9px] text-slate-500 hover:text-white underline decoration-slate-700 transition-colors flex items-center gap-1 font-bold">
                            <i class="fas fa-external-link-alt text-[7px]"></i> Check your SS estimate at ssa.gov
                        </a>
                    </div>
                `;
            }
            
            sub.appendChild(div);
        });
    });
    container.querySelectorAll('select').forEach(s => s.value = data.assumptions?.[s.dataset.id] || (s.dataset.id === 'state' ? 'Michigan' : 'Single'));
};

function debounce(func, wait) { let timeout; return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func(...args), wait); }; }
window.debouncedAutoSave = debounce(() => autoSave(true), 500);

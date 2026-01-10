import { signInWithGoogle, logoutUser } from './auth.js';
import { templates } from './templates.js';
import { autoSave, updateSummaries, forceSyncData } from './data.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { formatter } from './formatter.js';
import { projection } from './projection.js';
import { burndown } from './burndown.js';
import { benefits } from './benefits.js';

let lastChartSum = 0;

// Initialize global addRow
window.addRow = (containerId, type, data = {}) => {
    const container = document.getElementById(containerId); if (!container) return;
    let element = type === 'income' ? document.createElement('div') : document.createElement('tr');
    if (type === 'income') {
        element.className = 'removable-item';
    } else {
        element.className = 'border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors';
    }
    
    if (data.isLocked) element.classList.add('locked-row');
    if (type === 'budget-savings' && data.removedInRetirement === undefined) data.removedInRetirement = true; 
    if (type === 'budget-savings' || type === 'budget-expense') {
        if (data.annual !== undefined && data.monthly === undefined) data.monthly = data.annual / 12;
        else if (data.monthly !== undefined && data.annual === undefined) data.annual = data.monthly * 12;
        if (type === 'budget-expense' && data.remainsInRetirement === undefined) data.remainsInRetirement = true;
    }

    element.innerHTML = templates[type](data); container.appendChild(element);

    element.querySelectorAll('[data-id]').forEach(input => {
        const key = input.dataset.id, val = data[key];
        if (val !== undefined) {
            if (input.type === 'checkbox') input.checked = !!val;
            else if (input.type === 'hidden') input.value = val ? 'true' : 'false';
            else if (input.tagName === 'SELECT') { 
                input.value = val; 
                const typeClass = templates.helpers.getTypeClass(val);
                input.className = `input-base w-full font-bold ${typeClass}`;
                input.style.backgroundColor = '#0f172a';
            }
            else if (input.dataset.type === 'currency') input.value = math.toCurrency(val);
            else if (input.dataset.decimals !== undefined && typeof val === 'number') input.value = val.toFixed(parseInt(input.dataset.decimals));
            else input.value = val;
        }
    });

    element.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
    element.querySelectorAll('input[type="number"]').forEach(formatter.bindNumberEventListeners);

    if (type === 'stockOption') {
        const shares = parseFloat(element.querySelector('[data-id="shares"]')?.value) || 0;
        const strike = math.fromCurrency(element.querySelector('[data-id="strikePrice"]')?.value || "0");
        const fmv = math.fromCurrency(element.querySelector('[data-id="currentPrice"]')?.value || "0");
        const equity = Math.max(0, (fmv - strike) * shares);
        const display = element.querySelector('[data-id="netEquityDisplay"]');
        if (display) display.textContent = math.toCurrency(equity);
    }

    if (type === 'income') {
        const monBtn = element.querySelector('button[data-target="isMonthly"]');
        if (monBtn) monBtn.textContent = !!data.isMonthly ? 'Monthly' : 'Annual';
        const expBtn = element.querySelector('button[data-target="incomeExpensesMonthly"]');
        if (expBtn) expBtn.textContent = !!data.incomeExpensesMonthly ? 'Monthly' : 'Annual';
        checkIrsLimits(element);
    }
    if (type === 'investment') updateCostBasisVisibility(element);
};

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
    const ids = ['investment-rows', 'budget-savings-rows', 'budget-expenses-rows'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('sortable-initialized') && typeof Sortable !== 'undefined') {
            new Sortable(el, {
                animation: 150, handle: '.drag-handle', ghostClass: 'bg-slate-700/30',
                onEnd: () => { if (window.debouncedAutoSave) window.debouncedAutoSave(); }
            });
            el.classList.add('sortable-initialized');
        }
    });
}

function attachGlobalListeners() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = signInWithGoogle;
    
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.step) {
            const container = btn.closest('.relative') || btn.closest('.removable-item');
            const input = container.querySelector(`input[data-id="${btn.dataset.target}"]`);
            if (input) {
                const currentVal = parseFloat(input.value) || 0;
                const step = parseFloat(input.step) || 0.5;
                const newVal = btn.dataset.step === 'up' ? currentVal + step : currentVal - step;
                input.value = newVal.toFixed(parseInt(input.dataset.decimals) || 0);
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }
        
        if (btn && btn.dataset.action === 'toggle-freq') {
            const container = btn.closest('.relative') || btn.closest('.removable-item');
            const hiddenInput = container.querySelector(`input[data-id="${btn.dataset.target}"]`);
            if (hiddenInput) {
                const isMonthlyBefore = hiddenInput.value === 'true';
                const newVal = !isMonthlyBefore;
                
                // Convert existing value
                const valueInputId = btn.dataset.target === 'isMonthly' ? 'amount' : 'incomeExpenses';
                const valInput = container.querySelector(`input[data-id="${valueInputId}"]`);
                
                if (valInput) {
                    let val = math.fromCurrency(valInput.value);
                    if (isMonthlyBefore) {
                        val = val * 12;
                    } else {
                        val = val / 12;
                    }
                    valInput.value = math.toCurrency(val);
                }

                hiddenInput.value = newVal ? 'true' : 'false';
                btn.textContent = newVal ? 'Monthly' : 'Annual';
                
                // CRITICAL: Force immediate sync so dashboard updates
                forceSyncData();
                
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        const dataId = target.dataset.id;

        // Handle Monthly <-> Annual sync for Savings and Expenses
        if (dataId === 'monthly' || dataId === 'annual') {
            const row = target.closest('#budget-savings-rows tr, #budget-expenses-rows tr');
            if (row) {
                const otherId = dataId === 'monthly' ? 'annual' : 'monthly';
                const otherInput = row.querySelector(`input[data-id="${otherId}"]`);
                if (otherInput) {
                    const currentVal = math.fromCurrency(target.value);
                    const newVal = dataId === 'monthly' ? currentVal * 12 : currentVal / 12;
                    otherInput.value = math.toCurrency(newVal);
                    formatter.updateZeroState(otherInput);
                }
            }
        }

        if (target.closest('.input-base, .input-range, .benefit-slider') || target.closest('input[data-id]')) {
            const incomeCard = target.closest('#income-cards .removable-item');
            if (incomeCard) {
                checkIrsLimits(incomeCard);
            }
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.tagName === 'SELECT' && target.dataset.id === 'type') {
            const newClass = templates.helpers.getTypeClass(target.value);
            target.classList.forEach(cls => {
                if (cls.startsWith('text-type-')) target.classList.remove(cls);
            });
            target.classList.add(newClass);
            const row = target.closest('tr');
            if (row) updateCostBasisVisibility(row);
        }
    });
}

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    
    if (!window.currentData) return;

    if (tabId === 'burndown' || tabId === 'projection' || tabId === 'benefits') {
        forceSyncData();
        if (tabId === 'burndown') burndown.run();
        else if (tabId === 'projection') projection.run(window.currentData);
        else if (tabId === 'benefits') benefits.refresh();
    }
}

function attachNavigationListeners() {
    document.getElementById('main-nav')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.tab-btn');
        if (btn && btn.dataset.tab) showTab(btn.dataset.tab);
    });
}

function attachDynamicRowListeners() {
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        if (btn.dataset.addRow) { window.addRow(btn.dataset.addRow, btn.dataset.rowType); if (window.debouncedAutoSave) window.debouncedAutoSave(); }
        else if (btn.dataset.action === 'remove') { 
            const target = btn.closest('tr') || btn.closest('.removable-item');
            target?.remove(); if (window.debouncedAutoSave) window.debouncedAutoSave(); 
        }
    });
}

function checkIrsLimits(row) {
    const cPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    const amount = math.fromCurrency(row.querySelector('[data-id="amount"]')?.value);
    const isMonthly = row.querySelector('input[data-id="isMonthly"]')?.value === 'true';
    const annual = amount * (isMonthly ? 12 : 1);
    const age = window.currentData?.assumptions?.currentAge || 40;
    const limit = age >= 50 ? 31000 : 23500;
    const warning = row.querySelector('[data-id="capWarning"]');
    if (warning) warning.classList.toggle('hidden', (annual * (cPct / 100)) <= limit);
}

function updateCostBasisVisibility(row) {
    const typeSel = row.querySelector('[data-id="type"]'), cbIn = row.querySelector('[data-id="costBasis"]');
    if (!typeSel || !cbIn) return;
    const isBasisExempt = (['Pre-Tax (401k/IRA)', 'Cash', 'HSA', '529'].includes(typeSel.value));
    cbIn.style.visibility = isBasisExempt ? 'hidden' : 'visible';
    cbIn.disabled = isBasisExempt;
    if (isBasisExempt) cbIn.value = '';
}

window.updateSidebarChart = (data) => {
    if (!data) return;
    const totals = {}; let totalSum = 0;
    data.investments?.forEach(i => { 
        const v = math.fromCurrency(i.value); totals[i.type] = (totals[i.type] || 0) + v; totalSum += v; 
    });
    const legendContainer = document.getElementById('sidebar-asset-legend');
    if (legendContainer && totalSum !== lastChartSum) {
        lastChartSum = totalSum;
        legendContainer.innerHTML = '';
        Object.entries(totals).forEach(([type, value]) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400 truncate w-full pr-1';
            item.innerHTML = `
                <div class="flex items-center gap-1.5 truncate">
                    <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${assetColors[type] || '#fff'}"></div>
                    <span class="truncate">${type}</span>
                </div>
                <span class="text-white mono-numbers ml-auto">${math.toSmartCompactCurrency(value)}</span>
            `;
            legendContainer.appendChild(item);
        });
    }
};

window.createAssumptionControls = (data) => {
    const container = document.getElementById('assumptions-container'); 
    if (!container || !data) return;
    const a = data.assumptions || assumptions.defaults;

    const renderField = (label, id, value, type = 'number', colorClass = 'text-white') => `
        <label class="block space-y-1.5">
            <span class="label-std">${label}</span>
            <input data-id="${id}" type="${type}" value="${value}" class="input-base w-full ${colorClass}">
        </label>
    `;

    const renderCurrencyField = (label, id, value, colorClass = 'text-teal-400') => `
        <label class="block space-y-1.5">
            <span class="label-std">${label}</span>
            <input data-id="${id}" data-type="currency" type="text" value="${math.toCurrency(value)}" class="input-base w-full font-bold mono-numbers ${colorClass}">
        </label>
    `;

    container.innerHTML = `
        <!-- Card 1: Household & Timing -->
        <div class="p-6 bg-slate-900/40 rounded-2xl border border-blue-500/20 space-y-6">
            <div class="flex items-center gap-3 border-b border-white/5 pb-4">
                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <i class="fas fa-clock text-xs"></i>
                </div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Household & Timing</h3>
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${renderField("Current Age", "currentAge", a.currentAge, "number", "text-white")}
                ${renderField("Retire Age", "retirementAge", a.retirementAge, "number", "text-blue-400")}
                ${renderField("SS Start Age", "ssStartAge", a.ssStartAge, "number", "text-white")}
                ${renderCurrencyField("SS Monthly (Nominal)", "ssMonthly", a.ssMonthly)}
            </div>
        </div>

        <!-- Card 2: Tax Configuration -->
        <div class="p-6 bg-slate-900/40 rounded-2xl border border-emerald-500/20 space-y-6">
            <div class="flex items-center gap-3 border-b border-white/5 pb-4">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <i class="fas fa-file-invoice-dollar text-xs"></i>
                </div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Tax Configuration</h3>
            </div>
            <div class="space-y-4">
                <label class="block space-y-1.5">
                    <span class="label-std">Filing Status</span>
                    <select data-id="filingStatus" class="input-base w-full font-bold">
                        <option value="Single" ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                        <option value="Married Filing Jointly" ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                        <option value="Head of Household" ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
                    </select>
                </label>
                <label class="block space-y-1.5">
                    <span class="label-std">State of Residence</span>
                    <select data-id="state" class="input-base w-full font-bold">
                        ${Object.keys(stateTaxRates).sort().map(s => `<option value="${s}" ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </label>
                ${renderField("LTCG Tax Rate (%)", "ltcgRate", a.ltcgRate || 15, "number", "text-emerald-400")}
            </div>
        </div>

        <!-- Card 3: Market & Inflation -->
        <div class="p-6 bg-slate-900/40 rounded-2xl border border-orange-500/20 space-y-6">
            <div class="flex items-center gap-3 border-b border-white/5 pb-4">
                <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
                    <i class="fas fa-chart-line text-xs"></i>
                </div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Market Projections</h3>
            </div>
            <div class="grid grid-cols-2 gap-4">
                ${renderField("Stock APY (%)", "stockGrowth", a.stockGrowth, "number", "text-blue-400")}
                ${renderField("Crypto APY (%)", "cryptoGrowth", a.cryptoGrowth, "number", "text-slate-400")}
                ${renderField("Metals APY (%)", "metalsGrowth", a.metalsGrowth, "number", "text-amber-500")}
                ${renderField("Real Estate (%)", "realEstateGrowth", a.realEstateGrowth, "number", "text-indigo-400")}
                <div class="col-span-2">
                    ${renderField("Annual Inflation (%)", "inflation", a.inflation, "number", "text-red-400")}
                </div>
            </div>
        </div>

        <!-- Card 4: Phase Multipliers -->
        <div class="p-6 bg-slate-900/40 rounded-2xl border border-purple-500/20 space-y-6">
            <div class="flex items-center gap-3 border-b border-white/5 pb-4">
                <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                    <i class="fas fa-walking text-xs"></i>
                </div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Retirement Phase Factors</h3>
            </div>
            <div class="grid grid-cols-3 gap-3">
                ${renderField("Slow-Go", "slowGoFactor", a.slowGoFactor || 1.0, "number", "text-purple-400")}
                ${renderField("Mid-Go", "midGoFactor", a.midGoFactor || 0.9, "number", "text-purple-400")}
                ${renderField("No-Go", "noGoFactor", a.noGoFactor || 0.8, "number", "text-purple-400")}
            </div>
            <p class="text-[9px] text-slate-500 italic text-center font-medium">Multipliers applied to your baseline budget during different stages of retirement.</p>
        </div>
    `;

    // Re-bind formatters to new elements
    container.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
    container.querySelectorAll('input[type="number"]').forEach(formatter.bindNumberEventListeners);
};

function attachSortingListeners() {}

function attachPasteListeners() {
    const expensesContainer = document.getElementById('budget-expenses-rows');
    if (!expensesContainer) return;

    expensesContainer.addEventListener('paste', (e) => {
        const pasteData = e.clipboardData.getData('text');
        const rows = pasteData.split(/\r?\n/).filter(line => line.trim().length > 0);
        
        // If it's a multi-row or multi-column paste, handle it
        if (rows.length > 1 || (rows.length === 1 && rows[0].includes('\t'))) {
            e.preventDefault();
            
            rows.forEach(rowText => {
                const cols = rowText.split('\t');
                if (cols.length >= 2) {
                    const name = cols[0].trim();
                    const monthlyStr = cols[1].trim();
                    const monthlyVal = math.fromCurrency(monthlyStr);
                    
                    if (name || !isNaN(monthlyVal)) {
                        window.addRow('budget-expenses-rows', 'budget-expense', {
                            name: name,
                            monthly: monthlyVal,
                            annual: monthlyVal * 12,
                            remainsInRetirement: true,
                            isFixed: false
                        });
                    }
                }
            });
            
            forceSyncData();
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });
}

function handleLinkedBudgetValues() {}
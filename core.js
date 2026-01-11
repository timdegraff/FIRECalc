import { signInWithGoogle, logoutUser } from './auth.js';
import { templates } from './templates.js';
import { autoSave, updateSummaries, forceSyncData } from './data.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { formatter } from './formatter.js';
import { projection } from './projection.js';
import { burndown } from './burndown.js';
import { benefits } from './benefits.js';

let lastChartSum = 0;

// Keys that should be synchronized globally across all matching data-id attributes
const GLOBAL_SYNC_KEYS = [
    'currentAge', 'retirementAge', 'ssStartAge', 'ssMonthly', 
    'stockGrowth', 'cryptoGrowth', 'metalsGrowth', 'realEstateGrowth', 
    'inflation', 'filingStatus', 'helocRate', 'state', 
    'workYearsAtRetirement', 'phaseGo1', 'phaseGo2', 'phaseGo3', 
    'advancedGrowth', 'ltcgRate'
];

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
    
    if (type === 'budget-savings') {
        checkIrsLimits(element, true);
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
            const container = btn.closest('.relative') || btn.closest('.removable-item') || btn.closest('.grid') || btn.closest('.space-y-4') || btn.closest('.space-y-6') || btn.closest('.space-y-2') || btn.closest('.space-y-8') || btn.closest('.card-container');
            const input = container.querySelector(`input[data-id="${btn.dataset.target}"]`);
            if (input) {
                const isMultiplier = ['phaseGo1', 'phaseGo2', 'phaseGo3'].includes(btn.dataset.target);
                const currentVal = (input.dataset.type === 'currency' || input.dataset.type === 'percent') ? math.fromCurrency(input.value) : (parseFloat(input.value) || 0);
                const step = isMultiplier ? 0.1 : (parseFloat(input.step) || 0.5);
                
                // Snap logic: ensure the value always lands on a clean multiple of the step
                let newVal;
                if (btn.dataset.step === 'up') {
                    newVal = (Math.floor(currentVal / step + 0.0001) + 1) * step;
                } else {
                    newVal = (Math.ceil(currentVal / step - 0.0001) - 1) * step;
                }
                
                // Clamp retirement age
                if (btn.dataset.target === 'retirementAge') {
                    const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                    newVal = Math.max(curAge, Math.min(72, newVal));
                }

                // Precision Fix
                newVal = parseFloat(newVal.toFixed(2));

                if (input.dataset.type === 'currency') {
                    input.value = math.toCurrency(newVal);
                } else if (input.dataset.type === 'percent') {
                    input.value = (isMultiplier ? Math.round(newVal * 100) : newVal) + '%';
                } else {
                    input.value = newVal.toFixed(parseInt(input.dataset.decimals) || 0);
                }
                
                const slider = container.querySelector(`input[type="range"][data-id="${btn.dataset.target}"]`);
                if (slider) {
                    slider.value = newVal;
                }

                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        if (btn && btn.id === 'toggle-advanced-growth') {
            const isNowAdvanced = !window.currentData.assumptions.advancedGrowth;
            window.currentData.assumptions.advancedGrowth = isNowAdvanced;
            window.createAssumptionControls(window.currentData);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
            return;
        }
        
        if (btn && btn.dataset.action === 'toggle-freq') {
            const container = btn.closest('.relative') || btn.closest('.removable-item');
            const hiddenInput = container.querySelector(`input[data-id="${btn.dataset.target}"]`);
            if (hiddenInput) {
                const isMonthlyBefore = hiddenInput.value === 'true';
                const newVal = !isMonthlyBefore;
                
                const valueInputId = btn.dataset.target === 'isMonthly' ? 'amount' : 'incomeExpenses';
                const valInput = container.querySelector(`input[data-id="${valueInputId}"]`);
                
                if (valInput) {
                    let val = math.fromCurrency(valInput.value);
                    if (isMonthlyBefore) val = val * 12; else val = val / 12;
                    valInput.value = math.toCurrency(val);
                }

                hiddenInput.value = newVal ? 'true' : 'false';
                btn.textContent = newVal ? 'Monthly' : 'Annual';
                forceSyncData();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        const dataId = target.dataset.id;

        // CRITICAL FIX: Only sync if the ID is a designated Global Sync key.
        // This prevents repeating items (like multiple kids or account names) from linking.
        if (dataId && GLOBAL_SYNC_KEYS.includes(dataId)) {
            const isMultiplier = ['phaseGo1', 'phaseGo2', 'phaseGo3'].includes(dataId);
            let logicVal = (target.dataset?.type === 'currency' || target.dataset?.type === 'percent') ? math.fromCurrency(target.value) : parseFloat(target.value);
            
            // Adjust logicVal for assumptions state (Engine expects whole numbers for growth, fractions for multipliers)
            if (target.dataset.type === 'percent' && target.type !== 'range' && !isMultiplier) {
                logicVal *= 100;
            }

            if (dataId.toLowerCase().includes('growth') || dataId === 'inflation') {
                logicVal = parseFloat(logicVal.toFixed(2));
            }

            if (dataId === 'retirementAge') {
                const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                if (logicVal < curAge) logicVal = curAge;
                if (logicVal > 72) logicVal = 72;
            }

            if (dataId === 'currentAge') {
                if (logicVal > 72) logicVal = 72;
            }

            document.querySelectorAll(`[data-id="${dataId}"]`).forEach(el => {
                if (el === target) return;
                
                if (el.type === 'range') {
                    el.value = logicVal;
                } else if (el.dataset.type === 'currency') {
                    el.value = math.toCurrency(logicVal);
                } else if (el.dataset.type === 'percent') {
                    el.value = (isMultiplier ? Math.round(logicVal * 100) : logicVal) + '%';
                } else if (el.type === 'number' || el.classList.contains('input-base')) {
                    el.value = logicVal;
                }
                
                if (formatter.updateZeroState) formatter.updateZeroState(el);
            });

            if (window.currentData?.assumptions) {
                const isBasic = !window.currentData.assumptions.advancedGrowth;
                const assetPrefixes = ['stock', 'crypto', 'metals'];
                assetPrefixes.forEach(prefix => {
                    if (dataId === `${prefix}Growth` && isBasic) {
                        window.currentData.assumptions[`${prefix}GrowthPerpetual`] = logicVal;
                    }
                });
                window.currentData.assumptions[dataId] = logicVal;
            }
        }

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
                if (row.closest('#budget-savings-rows')) checkIrsLimits(row, true);
            }
        }

        const stockRow = target.closest('#stock-option-rows tr');
        if (stockRow) {
            const shares = parseFloat(stockRow.querySelector('[data-id="shares"]')?.value) || 0;
            const strike = math.fromCurrency(stockRow.querySelector('[data-id="strikePrice"]')?.value || "0");
            const fmv = math.fromCurrency(stockRow.querySelector('[data-id="currentPrice"]')?.value || "0");
            const equity = Math.max(0, (fmv - strike) * shares);
            const display = stockRow.querySelector('[data-id="netEquityDisplay"]');
            if (display) display.textContent = math.toCurrency(equity);
        }

        if (target.closest('.input-base, .input-range, .benefit-slider, .mobile-slider') || target.closest('input[data-id]')) {
            const incomeCard = target.closest('#income-cards .removable-item');
            if (incomeCard) checkIrsLimits(incomeCard);
            if (dataId === 'retirementAge' && document.querySelector('[data-tab="burndown"]')?.classList.contains('active')) burndown.run();
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.tagName === 'SELECT' && target.dataset.id === 'type') {
            const newClass = templates.helpers.getTypeClass(target.value);
            target.classList.forEach(cls => { if (cls.startsWith('text-type-')) target.classList.remove(cls); });
            target.classList.add(newClass);
            const row = target.closest('tr');
            if (row) {
                updateCostBasisVisibility(row);
                if (row.closest('#budget-savings-rows')) checkIrsLimits(row, true);
            }
        }
        if (target.dataset.id === 'retirementAge') {
            const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
            let val = parseFloat(target.value);
            if (val < curAge) {
                target.value = curAge;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            } else if (val > 72) {
                target.value = 72;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }
        if (target.dataset.id === 'currentAge') {
            let val = parseFloat(target.value);
            if (val > 72) {
                target.value = 72;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            }
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

function checkIrsLimits(row, isBudgetSavings = false) {
    const age = window.currentData?.assumptions?.currentAge || 40;
    const warning = row.querySelector('[data-id="capWarning"]');
    if (!warning) return;

    if (isBudgetSavings) {
        const type = row.querySelector('[data-id="type"]')?.value;
        const annual = math.fromCurrency(row.querySelector('[data-id="annual"]')?.value || "0");
        if (type === 'HSA') {
            // 2026 Family HSA limit baseline $8,550
            const hsaLimit = 8550;
            warning.classList.toggle('hidden', annual <= hsaLimit);
        } else {
            warning.classList.add('hidden');
        }
        return;
    }

    const cPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    const amount = math.fromCurrency(row.querySelector('[data-id="amount"]')?.value);
    const isMonthly = row.querySelector('input[data-id="isMonthly"]')?.value === 'true';
    const annual = amount * (isMonthly ? 12 : 1);
    const limit = age >= 50 ? 31000 : 23500;
    warning.classList.toggle('hidden', (annual * (cPct / 100)) <= limit);
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
    const totals = {}; 
    data.investments?.forEach(i => { 
        const v = math.fromCurrency(i.value); 
        if (v !== 0) totals[i.type] = (totals[i.type] || 0) + v; 
    });
    const optionsEquity = data.stockOptions?.reduce((s, x) => {
        const shares = parseFloat(x.shares) || 0;
        const strike = math.fromCurrency(x.strikePrice);
        const fmv = math.fromCurrency(x.currentPrice);
        return s + Math.max(0, (fmv - strike) * shares);
    }, 0) || 0;
    if (optionsEquity !== 0) totals['Stock Options'] = optionsEquity;
    const reEquity = data.realEstate?.reduce((s, r) => s + (math.fromCurrency(r.value) - math.fromCurrency(r.mortgage)), 0) || 0;
    if (reEquity !== 0) totals['Real Estate'] = reEquity;
    const oaEquity = data.otherAssets?.reduce((s, o) => s + (math.fromCurrency(o.value) - math.fromCurrency(o.loan)), 0) || 0;
    if (oaEquity !== 0) totals['Other'] = oaEquity;
    const helocTotal = data.helocs?.reduce((s, h) => s + math.fromCurrency(h.balance), 0) || 0;
    if (helocTotal !== 0) totals['HELOC'] = -helocTotal;
    const debtTotal = data.debts?.reduce((s, d) => s + math.fromCurrency(d.balance), 0) || 0;
    if (debtTotal !== 0) totals['Debt'] = -debtTotal;
    const legendContainer = document.getElementById('sidebar-asset-legend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        const abbrev = { 'Pre-Tax (401k/IRA)': 'Pre-Tax', 'Stock Options': 'Stock Ops', 'Roth IRA': 'Roth' };
        Object.entries(totals)
            .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
            .forEach(([type, value]) => {
                const item = document.createElement('div');
                item.className = 'flex items-center justify-between gap-1 text-[9px] font-bold text-slate-400 truncate w-full pr-1';
                item.innerHTML = `
                    <div class="flex items-center gap-1.5 truncate">
                        <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${assetColors[type] || '#fff'}"></div>
                        <span class="truncate">${abbrev[type] || type}</span>
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
    const isAdv = !!a.advancedGrowth;
    const curAge = parseFloat(a.currentAge) || 40;

    const renderComplexField = (label, id, value, min, max, step, colorClass, decimals = "1", isCurrency = false, isPercent = false) => {
        const isMultiplier = ['phaseGo1', 'phaseGo2', 'phaseGo3'].includes(id);
        const displayValue = isMultiplier ? (value * 100) : value;
        return `
        <div class="space-y-4">
            <div class="flex justify-between items-center h-4">
                <label class="label-std ${colorClass}">${label}</label>
                <div class="w-28">
                    ${isCurrency ? 
                        templates.helpers.renderStepper(id, value, `text-right ${colorClass}`, "0", isCurrency, step) :
                        (isPercent ? 
                            templates.helpers.renderStepper(id, displayValue, `text-center ${colorClass}`, "0", false, (isMultiplier ? 10 : step), true) :
                            templates.helpers.renderStepper(id, value, `text-center ${colorClass}`, decimals, false, step)
                        )
                    }
                </div>
            </div>
            <input type="range" data-id="${id}" min="${min}" max="${max}" step="${step}" value="${value}" class="input-range w-full">
        </div>`;
    };

    const renderAdvancedAPYRow = (label, prefix, colorClass) => {
        if (!isAdv) {
            return renderComplexField(label, `${prefix}Growth`, a[`${prefix}Growth`], 0, 15, 0.5, colorClass, "1", false, true);
        }
        return `
            <div class="space-y-2 border-l border-white/10 pl-3">
                <label class="text-[8px] font-black uppercase tracking-widest ${colorClass} block">${label}</label>
                <div class="grid grid-cols-3 gap-2 items-end">
                    <div class="space-y-1">
                        <span class="text-[7px] font-black text-slate-600 uppercase block leading-none">Rate</span>
                        ${templates.helpers.renderStepper(`${prefix}Growth`, a[`${prefix}Growth`], colorClass, "1", false, 0.5, true)}
                    </div>
                    <div class="space-y-1">
                         <span class="text-[7px] font-black text-slate-600 uppercase block leading-none">For Yrs</span>
                        ${templates.helpers.renderStepper(`${prefix}GrowthYears`, a[`${prefix}GrowthYears`] || 10, 'text-white', '0', false, 1)}
                    </div>
                    <div class="space-y-1">
                        <span class="text-[7px] font-black text-slate-600 uppercase block leading-none">Final</span>
                        ${templates.helpers.renderStepper(`${prefix}GrowthPerpetual`, a[`${prefix}GrowthPerpetual`] || a[`${prefix}Growth`], colorClass, "1", false, 0.5, true)}
                    </div>
                </div>
            </div>
        `;
    };

    container.innerHTML = `
        <!-- Card 1: Household & Timing -->
        <div class="card-container p-6 space-y-8 flex flex-col h-full">
            <div class="flex items-center gap-3 border-b border-white/5 pb-4">
                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><i class="fas fa-clock text-xs"></i></div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Household & Timing</h3>
            </div>
            ${renderComplexField("Current Age", "currentAge", a.currentAge, 18, 72, 1, "text-white", "0")}
            ${renderComplexField("Retire Age", "retirementAge", a.retirementAge, 18, 72, 1, "text-blue-400", "0")}
            ${renderComplexField("SS Start Age", "ssStartAge", a.ssStartAge, 62, 72, 1, "text-white", "0")}
            ${renderComplexField("SS Monthly (Nominal)", "ssMonthly", a.ssMonthly, 0, 8000, 100, "text-teal-400", "0", true)}
        </div>

        <!-- Card 2: Market Projections -->
        <div class="card-container p-6 space-y-8 flex flex-col h-full">
            <div class="flex items-center justify-between border-b border-white/5 pb-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400"><i class="fas fa-chart-line text-xs"></i></div>
                    <h3 class="text-sm font-black text-white uppercase tracking-widest">Market Projections</h3>
                </div>
                <button id="toggle-advanced-growth" class="w-8 h-8 rounded-lg ${isAdv ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 text-slate-500'} flex items-center justify-center hover:bg-orange-500/20 transition-all"><i class="fas fa-cog text-xs"></i></button>
            </div>
            <div class="${isAdv ? 'space-y-6' : 'space-y-8'}">
                ${renderAdvancedAPYRow("Stock APY (%)", "stock", "text-blue-400")}
                ${renderAdvancedAPYRow("Crypto APY (%)", "crypto", "text-slate-400")}
                ${renderAdvancedAPYRow("Metals APY (%)", "metals", "text-amber-500")}
            </div>
            ${renderComplexField("Real Estate (%)", "realEstateGrowth", a.realEstateGrowth, 0, 10, 0.1, "text-indigo-400", "1", false, true)}
            <div class="pt-4 border-t border-white/5">${renderComplexField("Annual Inflation (%)", "inflation", a.inflation, 0, 10, 0.1, "text-red-400", "1", false, true)}</div>
        </div>

        <!-- Card 3: Tax & Status -->
        <div class="card-container p-6 space-y-3 flex flex-col h-full">
            <div class="flex items-center gap-3 border-b border-white/5 pb-3 mb-2">
                <div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><i class="fas fa-walking text-xs"></i></div>
                <h3 class="text-sm font-black text-white uppercase tracking-widest">Tax & Status</h3>
            </div>
            <div class="grid grid-cols-2 gap-3 mb-1">
                <label class="block space-y-1">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">State</span>
                    <select data-id="state" class="input-base w-full font-bold text-xs">
                        ${Object.keys(stateTaxRates).sort().map(s => `<option value="${s}" ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </label>
                <label class="block space-y-1">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Status</span>
                    <select data-id="filingStatus" class="input-base w-full font-bold text-xs">
                        <option value="Single" ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                        <option value="Married Filing Jointly" ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Jointly</option>
                        <option value="Head of Household" ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of HH</option>
                    </select>
                </label>
            </div>
            <div class="space-y-2 pt-3 border-t border-white/5 flex-grow">
                <div class="space-y-0.5">
                    <p class="text-[9px] font-black text-white uppercase tracking-widest leading-none">RETIREMENT SPEND MULTIPLIERS</p>
                    <p class="text-[8px] text-slate-500 italic leading-tight">Multipliers apply at Retirement Age thresholds.</p>
                </div>
                ${renderComplexField("Go-Go (Age 30-60)", "phaseGo1", a.phaseGo1 ?? 1.0, 0.5, 1.5, 0.1, "text-purple-400", "0", false, true)}
                ${renderComplexField("Slow-Go (Age 60-80)", "phaseGo2", a.phaseGo2 ?? 0.9, 0.5, 1.5, 0.1, "text-purple-400", "0", false, true)}
                ${renderComplexField("No-Go (Age 80+)", "phaseGo3", a.phaseGo3 ?? 0.8, 0.5, 1.5, 0.1, "text-purple-400", "0", false, true)}
            </div>
        </div>
    `;
    container.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
    container.querySelectorAll('input:not([data-type="currency"])').forEach(formatter.bindNumberEventListeners);
};

function attachSortingListeners() {
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.dataset.target, sortKey = header.dataset.sort, container = document.getElementById(targetId);
            if (!container) return;
            const rows = Array.from(container.children), isAsc = header.dataset.direction === 'asc';
            header.dataset.direction = isAsc ? 'desc' : 'asc';
            header.parentElement.querySelectorAll('i.fas').forEach(i => { i.classList.remove('fa-sort-up', 'fa-sort-down', 'text-blue-400'); i.classList.add('fa-sort', 'opacity-20'); });
            const icon = header.querySelector('i'); if (icon) { icon.classList.remove('fa-sort', 'opacity-20'); icon.classList.add(isAsc ? 'fa-sort-up' : 'fa-sort-down', 'text-blue-400'); }
            const lockedRows = rows.filter(r => r.classList.contains('locked-row')), sortableRows = rows.filter(r => !r.classList.contains('locked-row'));
            sortableRows.sort((a, b) => {
                const aIn = a.querySelector(`[data-id="${sortKey}"]`), bIn = b.querySelector(`[data-id="${sortKey}"]`);
                let aVal = aIn ? (aIn.dataset.type === 'currency' ? math.fromCurrency(aIn.value) : (parseFloat(aIn.value) || aIn.value)) : 0;
                let bVal = bIn ? (bIn.dataset.type === 'currency' ? math.fromCurrency(bIn.value) : (parseFloat(bIn.value) || bIn.value)) : 0;
                return typeof aVal === 'string' ? (isAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)) : (isAsc ? aVal - bVal : bVal - aVal);
            });
            container.innerHTML = ''; lockedRows.forEach(row => container.appendChild(row)); sortableRows.forEach(row => container.appendChild(row));
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        });
    });
}

function attachPasteListeners() {
    const expensesContainer = document.getElementById('budget-expenses-rows'); if (!expensesContainer) return;
    expensesContainer.addEventListener('paste', (e) => {
        const pasteData = e.clipboardData.getData('text'), rows = pasteData.split(/\r?\n/).filter(line => line.trim().length > 0);
        if (rows.length > 1 || (rows.length === 1 && rows[0].includes('\t'))) {
            e.preventDefault();
            rows.forEach(rowText => {
                const cols = rowText.split('\t');
                if (cols.length >= 2) {
                    const name = cols[0].trim(), monthlyVal = math.fromCurrency(cols[1].trim());
                    if (name || !isNaN(monthlyVal)) window.addRow('budget-expenses-rows', 'budget-expense', { name: name, monthly: monthlyVal, annual: monthlyVal * 12, remainsInRetirement: true, isFixed: false });
                }
            });
            forceSyncData(); if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });
}
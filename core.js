import { signInWithGoogle, logoutUser } from './auth.js';
import { templates } from './templates.js';
import { autoSave, updateSummaries, forceSyncData } from './data.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { formatter } from './formatter.js';
import { projection } from './projection.js';
import { burndown } from './burndown.js';
import { benefits } from './benefits.js';

let lastChartSum = 0;

// Initialize global addRow immediately to prevent early reference errors
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
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.closest('.input-base, .input-range, .benefit-slider') || target.closest('input[data-id]')) {
            
            // Real-time Income Card Updates
            const incomeCard = target.closest('#income-cards .removable-item');
            if (incomeCard) {
                checkIrsLimits(incomeCard);
            }

            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    // Dynamic Color and Logic Updating for Asset Selects
    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.tagName === 'SELECT' && target.dataset.id === 'type') {
            const newClass = templates.helpers.getTypeClass(target.value);
            // Remove any existing text-type classes
            target.classList.forEach(cls => {
                if (cls.startsWith('text-type-')) target.classList.remove(cls);
            });
            target.classList.add(newClass);
            
            // If this is an investment row, toggle cost basis visibility/interactivity
            const row = target.closest('tr');
            if (row) updateCostBasisVisibility(row);
        }

        // Trigger IRS check on checkbox change (Contrib on Bonus)
        const incomeCard = target.closest('#income-cards .removable-item');
        if (incomeCard && target.type === 'checkbox') {
            checkIrsLimits(incomeCard);
        }
    });
}

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    
    if (!window.currentData) return; // Guard for pre-initialization triggers

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
    const amountEl = row.querySelector('[data-id="amount"]');
    if (!amountEl) return;
    
    const isMonthly = row.querySelector('input[data-id="isMonthly"]')?.value === 'true';
    const baseAnn = math.fromCurrency(amountEl.value) * (isMonthly ? 12 : 1);
    const cPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    
    const bonusPct = parseFloat(row.querySelector('[data-id="bonusPct"]')?.value) || 0;
    const bonusAmt = baseAnn * (bonusPct / 100);
    const contribOnBonus = row.querySelector('[data-id="contribOnBonus"]')?.checked;
    
    let totalContrib = baseAnn * (cPct / 100);
    if (contribOnBonus) {
        totalContrib += bonusAmt * (cPct / 100);
    }

    const age = window.currentData?.assumptions?.currentAge || 40;
    const limit = age >= 50 ? 31000 : 23500;
    const warning = row.querySelector('[data-id="capWarning"]');
    
    if (warning) {
        const isOver = totalContrib > limit;
        warning.classList.toggle('hidden', !isOver);
        warning.title = `You're over the IRS limit of ${math.toCurrency(limit)}`;
    }
}

function updateCostBasisVisibility(row) {
    const typeSel = row.querySelector('[data-id="type"]'), cbIn = row.querySelector('[data-id="costBasis"]');
    if (!typeSel || !cbIn) return;
    // HSA and 529 are tax-free, Pre-Tax and Cash have no applicable basis for capital gains tracking
    const isBasisExempt = (['Pre-Tax (401k/IRA)', 'Cash', 'HSA', '529'].includes(typeSel.value));
    cbIn.style.visibility = isBasisExempt ? 'hidden' : 'visible';
    cbIn.disabled = isBasisExempt;
    cbIn.tabIndex = isBasisExempt ? -1 : 0;
    if (isBasisExempt) {
        cbIn.value = '';
    }
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
            item.className = 'flex items-center gap-2 text-[9px] font-bold text-slate-400 truncate';
            item.innerHTML = `<div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${assetColors[type] || '#fff'}"></div><span>${type}</span>`;
            legendContainer.appendChild(item);
        });
    }
};

window.createAssumptionControls = (data) => {
    const container = document.getElementById('assumptions-container'); if (!container || !data) return;
    const a = data.assumptions || assumptions.defaults;
    container.innerHTML = `<div class="col-span-full p-4 bg-slate-900/40 rounded-xl border border-white/5"><h3 class="label-std mb-4">Core Assumptions</h3><div class="grid grid-cols-2 gap-4"><label class="block"><span class="label-std">Current Age</span><input data-id="currentAge" type="number" value="${a.currentAge}" class="input-base w-full"></label><label class="block"><span class="label-std">Retirement Age</span><input data-id="retirementAge" type="number" value="${a.retirementAge}" class="input-base w-full"></label></div></div>`;
};

// Placeholder handlers for required UI hooks
function attachSortingListeners() {}
function attachPasteListeners() {}
function handleLinkedBudgetValues() {}
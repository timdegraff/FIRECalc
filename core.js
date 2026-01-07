
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
                if (window.debouncedAutoSave) window.debouncedAutoSave();
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
            const marketDefaults = { stockGrowth: 8, cryptoGrowth: 10, metalsGrowth: 6, realEstateGrowth: 3, inflation: 3 };
            Object.entries(marketDefaults).forEach(([id, val]) => {
                syncAllInputs(id, val);
                if (window.currentData?.assumptions) window.currentData.assumptions[id] = val;
            });
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.closest('.input-base, .input-range, .benefit-slider') || target.closest('input[data-id]')) {
            handleLinkedBudgetValues(target);
            const invRow = target.closest('#investment-rows tr');
            if (invRow) {
                const valueEl = invRow.querySelector('[data-id="value"]'), basisEl = invRow.querySelector('[data-id="costBasis"]'), typeEl = invRow.querySelector('[data-id="type"]'), container = invRow.querySelector('[data-id="efficiency-container"]');
                if (container && typeEl && valueEl && basisEl) container.innerHTML = templates.helpers.getEfficiencyBadge(typeEl.value, valueEl.value, basisEl.value, window.currentData?.assumptions?.state || 'Michigan');
            }
            if (target.dataset.id === 'contribution' || target.dataset.id === 'amount' || target.dataset.id === 'bonusPct' || target.dataset.id === 'contribOnBonus') {
                const row = target.closest('tr') || target.closest('.bg-slate-800');
                if (row) checkIrsLimits(row);
            }
            const id = target.dataset.id || target.dataset.liveId;
            const isAssControl = target.closest('#assumptions-container') || target.closest('#burndown-live-sliders') || target.id === 'input-top-retire-age';
            if (id && isAssControl) {
                let val = parseFloat(target.value);
                if (id === 'currentAge' || id === 'retirementAge') {
                    const cAge = parseFloat(document.querySelector('[data-id="currentAge"]')?.value || window.currentData?.assumptions?.currentAge || 40);
                    let rAge = parseFloat(document.querySelector('[data-id="retirementAge"]')?.value || window.currentData?.assumptions?.retirementAge || 65);
                    if (id === 'currentAge' && val > rAge) syncAllInputs('retirementAge', val);
                    else if (id === 'retirementAge' && val < cAge) { val = cAge; target.value = val; }
                }
                syncAllInputs(id, target.value);
                if (window.currentData && window.currentData.assumptions) {
                    const nVal = (target.tagName === 'SELECT' || isNaN(parseFloat(target.value))) ? target.value : (target.dataset.type === 'currency' ? math.fromCurrency(target.value) : parseFloat(target.value));
                    window.currentData.assumptions[id] = nVal;
                    if (id === 'state') refreshEfficiencyBadges();
                }
            }
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.getElementById('input-projection-end')?.addEventListener('input', (e) => {
        const lbl = document.getElementById('label-projection-end');
        if (lbl) lbl.textContent = e.target.value;
        if (window.debouncedAutoSave) window.debouncedAutoSave();
    });
}

function syncAllInputs(id, val) {
    const selectors = [`#assumptions-container [data-id="${id}"]`, `#burndown-live-sliders [data-live-id="${id}"]`, `#burndown-live-sliders [data-id="${id}"]`, `#input-top-retire-age[data-id="${id}"]`];
    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            if (el.value != val) el.value = val;
            
            let lbl = null;
            if (el.id === 'input-top-retire-age') {
                lbl = document.getElementById('label-top-retire-age');
            } else {
                lbl = el.parentElement.querySelector('span:not(.label-std)');
                if (!lbl) {
                    lbl = el.previousElementSibling?.querySelector('span');
                }
            }

            if (lbl) {
                const numericVal = parseFloat(val);
                if (id === 'ssMonthly') lbl.textContent = math.toCurrency(numericVal);
                else if (id.toLowerCase().includes('growth') || id === 'inflation') lbl.textContent = `${val}%`;
                else if (id.toLowerCase().includes('factor')) lbl.textContent = `${Math.round(numericVal * 100)}%`;
                else lbl.textContent = val;
            }
        });
    });
}

function attachPasteListeners() {
    document.body.addEventListener('paste', (e) => {
        const target = e.target;
        if (target.dataset.paste === 'spreadsheet' || target.dataset.id === 'monthly' || target.dataset.id === 'annual') {
            const cbData = e.clipboardData || window.clipboardData, pastedData = cbData.getData('Text');
            if (pastedData.includes('\t') || pastedData.includes('\n')) {
                e.preventDefault();
                const lines = pastedData.trim().split(/\r?\n/), containerId = target.closest('#budget-expenses-rows') ? 'budget-expenses-rows' : 'budget-savings-rows', rowType = target.closest('#budget-expenses-rows') ? 'budget-expense' : 'budget-savings';
                lines.forEach((line, index) => {
                    const cols = line.split('\t');
                    let name = '', monthly = 0;
                    if (target.dataset.id === 'monthly') { if (cols.length > 1 && isNaN(math.fromCurrency(cols[0]))) { name = cols[0]; monthly = math.fromCurrency(cols[1]); } else { monthly = math.fromCurrency(cols[0]); } }
                    else { name = cols[0] || ''; monthly = math.fromCurrency(cols[1] || '0'); }
                    if (index === 0 && !target.value.trim()) {
                        const row = target.closest('tr'), nameInp = row.querySelector('[data-id="name"]'), monthlyInp = row.querySelector('[data-id="monthly"]'), annualInp = row.querySelector('[data-id="annual"]');
                        if (nameInp && name) nameInp.value = name; if (monthlyInp) monthlyInp.value = math.toCurrency(monthly); if (annualInp) annualInp.value = math.toCurrency(monthly * 12);
                    } else { window.addRow(containerId, rowType, { name, monthly, annual: monthly * 12 }); }
                });
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        }
    });
}

function checkIrsLimits(row) {
    const amountEl = row.querySelector('[data-id="amount"]');
    if (!amountEl) return;
    const isMon = row.querySelector('[data-id="isMonthly"]')?.textContent.trim().toLowerCase() === 'monthly';
    const baseAnn = math.fromCurrency(amountEl.value) * (isMon ? 12 : 1);
    const bPct = parseFloat(row.querySelector('[data-id="bonusPct"]')?.value) || 0;
    const bonus = baseAnn * (bPct / 100);
    const cPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    let personal = baseAnn * (cPct / 100);
    if (row.querySelector('[data-id="contribOnBonus"]')?.checked) personal += (bonus * (cPct / 100));
    const age = window.currentData?.assumptions?.currentAge || 40, limit = age >= 50 ? 31000 : 23500;
    const warning = row.querySelector('[data-id="capWarning"]');
    if (warning) warning.classList.toggle('hidden', personal <= limit);
}

function handleLinkedBudgetValues(target) {
    const row = target.closest('tr'); if (!row) return;
    if (!row.closest('#budget-savings-rows') && !row.closest('#budget-expenses-rows')) return;
    const mIn = row.querySelector('[data-id="monthly"]'), aIn = row.querySelector('[data-id="annual"]');
    if (!mIn || !aIn) return;
    const val = math.fromCurrency(target.value);
    if (target.dataset.id === 'monthly') aIn.value = math.toCurrency(val * 12); else if (target.dataset.id === 'annual') mIn.value = math.toCurrency(val / 12);
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
        else if (btn.dataset.action === 'remove') { (btn.closest('tr') || btn.closest('.bg-slate-800'))?.remove(); if (window.debouncedAutoSave) window.debouncedAutoSave(); }
        else if (btn.dataset.action === 'toggle-freq') {
            const isMon = btn.textContent.trim().toLowerCase() === 'monthly';
            btn.textContent = isMon ? 'Annual' : 'Monthly';
            const input = btn.closest('div')?.querySelector('input');
            if (input) { 
                const cur = math.fromCurrency(input.value); 
                input.value = math.toCurrency(isMon ? cur * 12 : cur / 12);
                // Dispatch input event to ensure data model is updated and saved
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const parent = btn.closest('.bg-slate-800'); if (parent) checkIrsLimits(parent);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });
    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.dataset.id === 'type' && target.tagName === 'SELECT') {
            if (target.closest('#investment-rows')) updateCostBasisVisibility(target.closest('tr'));
            
            // Apply colored text logic without 'text-white' to prevent clash
            const typeClass = templates.helpers.getTypeClass(target.value);
            target.className = `input-base w-full font-bold ${typeClass}`;
            target.style.backgroundColor = '#0f172a';
        }
        if (target.dataset.id === 'contribOnBonus' || target.dataset.id === 'matchOnBonus') {
            const row = target.closest('.bg-slate-800'); if (row) checkIrsLimits(row);
        }
        if (target.dataset.id && window.debouncedAutoSave) window.debouncedAutoSave();
    });
}

function attachSortingListeners() {
    document.querySelectorAll('[data-sort]').forEach(header => {
        header.onclick = () => {
            const type = header.dataset.sort, container = document.getElementById(header.dataset.target);
            if (!container) return;
            const rows = Array.from(container.querySelectorAll('tr')), isAsc = header.dataset.order === 'asc';
            rows.sort((a, b) => {
                const valA = math.fromCurrency(a.querySelector(`[data-id="${type}"]`)?.value || 0), valB = math.fromCurrency(b.querySelector(`[data-id="${type}"]`)?.value || 0);
                return isAsc ? valA - valB : valB - valA;
            });
            header.dataset.order = isAsc ? 'desc' : 'asc';
            container.append(...rows);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        };
    });
}

function updateCostBasisVisibility(row) {
    const typeSel = row.querySelector('[data-id="type"]'), cbIn = row.querySelector('[data-id="costBasis"]');
    if (!typeSel || !cbIn) return;
    const isIrr = (['Pre-Tax (401k/IRA)', 'Cash', 'HSA', '529 Plan'].includes(typeSel.value));
    cbIn.style.visibility = isIrr ? 'hidden' : 'visible'; cbIn.disabled = isIrr;
    if (isIrr) cbIn.value = '$0';
}

export function showTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`tab-${tabId}`)?.classList.remove('hidden');
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    if ((tabId === 'burndown' || tabId === 'projection') && window.debouncedAutoSave) window.debouncedAutoSave(); 
}

window.addRow = (containerId, type, data = {}) => {
    const container = document.getElementById(containerId); if (!container) return;
    let element = type === 'income' ? document.createElement('div') : document.createElement('tr');
    if (type !== 'income') element.className = 'border-b border-slate-700/50 hover:bg-slate-800/20 transition-colors';
    element.innerHTML = templates[type](data); container.appendChild(element);
    element.querySelectorAll('[data-id]').forEach(input => {
        const key = input.dataset.id, val = data[key];
        if (val !== undefined) {
            if (input.type === 'checkbox') input.checked = !!val;
            else if (input.tagName === 'SELECT') { 
                input.value = val; 
                const typeClass = templates.helpers.getTypeClass(val);
                input.className = `input-base w-full font-bold ${typeClass}`;
                input.style.backgroundColor = '#0f172a';
            }
            else if (input.dataset.type === 'currency') input.value = math.toCurrency(val);
            else input.value = val;
        }
    });
    if (type === 'income') {
        const amtBtn = element.querySelector('[data-id="isMonthly"]'); if (amtBtn) amtBtn.textContent = data.isMonthly ? 'Monthly' : 'Annual';
        const expBtn = element.querySelector('[data-id="incomeExpensesMonthly"]'); if (expBtn) expBtn.textContent = data.incomeExpensesMonthly ? 'Monthly' : 'Annual';
        checkIrsLimits(element);
    }
    if (type === 'investment') updateCostBasisVisibility(element);
    element.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
};

window.updateSidebarChart = (data) => {
    // Canvas has been removed from index.html, so we skip chart generation.
    // However, we still calculate totals to update the text-based Legend below.
    const totals = {}; let totalSum = 0;
    
    data.investments?.forEach(i => { const v = math.fromCurrency(i.value); totals[i.type] = (totals[i.type] || 0) + v; totalSum += v; });
    data.realEstate?.forEach(r => { const v = math.fromCurrency(r.value); totals['Real Estate'] = (totals['Real Estate'] || 0) + v; totalSum += v; });
    data.otherAssets?.forEach(o => { const v = math.fromCurrency(o.value); totals['Other'] = (totals['Other'] || 0) + v; totalSum += v; });

    if (lastChartSum !== 0 && (Math.abs(totalSum - lastChartSum) / lastChartSum) < 0.005) return;
    lastChartSum = totalSum;

    // --- RENDER DOUBLE COLUMN LIST ---
    const legendContainer = document.getElementById('sidebar-asset-legend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        const shortNames = {
            'Pre-Tax (401k/IRA)': 'Pre-Tax',
            'Post-Tax (Roth)': 'Roth',
            'Taxable': 'Brokerage',
            'Real Estate': 'Real Est',
            'Crypto': 'Crypto',
            'Metals': 'Metals',
            'Cash': 'Cash',
            'HSA': 'HSA',
            '529 Plan': '529',
            'Other': 'Other'
        };

        Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .forEach(([type, value]) => {
                if (value <= 0) return;
                const percent = Math.round((value / totalSum) * 100);
                const color = assetColors[type] || assetColors['Taxable'];
                const shortName = shortNames[type] || type;
                
                const item = document.createElement('div');
                item.className = 'flex items-center gap-2 text-[9px] font-bold text-slate-400';
                item.innerHTML = `
                    <div class="w-1.5 h-1.5 rounded-full" style="background-color: ${color}"></div>
                    <span class="truncate">${shortName}</span>
                    <span class="ml-auto text-white">${percent}%</span>
                `;
                legendContainer.appendChild(item);
            });
    }

    // Chart.js rendering logic removed.
};

window.createAssumptionControls = (data) => {
    const container = document.getElementById('assumptions-container'); if (!container) return;
    container.innerHTML = `
        <div class="col-span-full mb-4 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-user-circle text-blue-400"></i><h3 class="label-std text-slate-400">Personal & Strategy</h3></div>
        <div class="space-y-6 lg:border-r lg:border-slate-700/30 lg:pr-8">
            <label class="block"><span class="label-std text-slate-500">Legal State of Residence</span>
                <select data-id="state" class="input-base w-full mt-1 font-bold bg-slate-900 text-white">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${data.assumptions?.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </label>
            <label class="block"><span class="label-std text-slate-500">Filing Status</span>
                <select data-id="filingStatus" class="input-base w-full mt-1 font-bold bg-slate-900 text-white">
                    <option ${data.assumptions?.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                    <option ${data.assumptions?.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                    <option ${data.assumptions?.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
                </select>
            </label>
            <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col h-full"><span class="label-std text-slate-500">Current Age</span><input data-id="currentAge" type="number" value="${data.assumptions?.currentAge}" class="input-base w-full mt-auto font-bold text-white"></label>
                <label class="flex flex-col h-full"><span class="label-std text-slate-500">Retirement Age</span><input data-id="retirementAge" type="number" value="${data.assumptions?.retirementAge}" class="input-base w-full mt-auto font-bold text-blue-400"></label>
            </div>
            <label class="block"><span class="label-std text-slate-500">SS Start Age</span><input data-id="ssStartAge" type="number" value="${data.assumptions?.ssStartAge}" class="input-base w-full mt-1 font-bold text-white"></label>
            <label class="block"><span class="label-std text-slate-500">SS Monthly Benefit</span><input data-id="ssMonthly" type="number" value="${data.assumptions?.ssMonthly}" class="input-base w-full mt-1 font-bold text-white"></label>
            <div class="pt-4 border-t border-slate-700/30"><button id="btn-reset-market" class="w-full py-2 bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all">Reset Market Defaults</button></div>
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
                    <div class="flex items-center gap-2 mt-1"><input data-id="slowGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.slowGoFactor || 1.1}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((parseFloat(data.assumptions?.slowGoFactor) || 1.1) * 100)}%</span></div>
                </label>
                 <label class="block">
                    <span class="label-std text-slate-500">Mid-Go (Age 65-80)</span>
                    <div class="flex items-center gap-2 mt-1"><input data-id="midGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.midGoFactor || 1.0}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((parseFloat(data.assumptions?.midGoFactor) || 1.0) * 100)}%</span></div>
                </label>
                 <label class="block">
                    <span class="label-std text-slate-500">No-Go (Age 80+)</span>
                    <div class="flex items-center gap-2 mt-1"><input data-id="noGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${data.assumptions?.noGoFactor || 0.85}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round((parseFloat(data.assumptions?.noGoFactor) || 0.85) * 100)}%</span></div>
                </label>
                <div class="pt-3 border-t border-slate-700/30">
                    <p class="text-[9px] text-slate-500 italic leading-relaxed">
                        <i class="fas fa-info-circle mr-1 text-slate-600"></i>
                        Adjust your retirement spending up or down relative to your current baseline budget.
                    </p>
                </div>
            </div>
        </div>
    `;
};

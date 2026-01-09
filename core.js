import { signInWithGoogle, logoutUser } from './auth.js';
import { templates } from './templates.js';
import { autoSave, updateSummaries } from './data.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { formatter } from './formatter.js';
import { projection } from './projection.js';

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
    const ids = ['investment-rows', 'budget-savings-rows', 'budget-expenses-rows'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('sortable-initialized')) {
            new Sortable(el, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'bg-slate-700/30',
                onEnd: () => {
                    if (window.debouncedAutoSave) window.debouncedAutoSave();
                }
            });
            el.classList.add('sortable-initialized');
        }
    });
}

function attachGlobalListeners() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) loginBtn.onclick = signInWithGoogle;
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.onclick = logoutUser;

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        
        // Handle custom steppers
        if (btn && btn.dataset.step) {
            const container = btn.closest('.relative');
            const input = container.querySelector(`input[data-id="${btn.dataset.target}"]`);
            if (input) {
                const currentVal = parseFloat(input.value) || 0;
                const step = parseFloat(input.step) || 0.5;
                const newVal = btn.dataset.step === 'up' ? currentVal + step : currentVal - step;
                input.value = newVal;
                // Dispatch input event to trigger auto-recalc
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return;
        }

        if (e.target.id === 'btn-reset-market') {
            const marketDefaults = { stockGrowth: 8, cryptoGrowth: 10, metalsGrowth: 6, realEstateGrowth: 3, inflation: 3 };
            Object.entries(marketDefaults).forEach(([id, val]) => {
                syncAllInputs(id, val);
                if (window.currentData?.assumptions) window.currentData.assumptions[id] = val;
            });
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
        
        if (e.target.id === 'btn-toggle-advanced-apy') {
            const advanced = !window.currentData.assumptions.advancedGrowth;
            window.currentData.assumptions.advancedGrowth = advanced;
            window.createAssumptionControls(window.currentData);
            autoSave(false);
        }

        const projToggle = e.target.closest('#toggle-projection-real');
        if (projToggle) {
            projection.toggleRealDollars();
            projection.updateToggleStyle(projToggle);
            if (window.currentData) projection.run(window.currentData);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('input', (e) => {
        const target = e.target;
        if (target.closest('.input-base, .input-range, .benefit-slider') || target.closest('input[data-id]')) {
            handleLinkedBudgetValues(target);
            
            const optRow = target.closest('#stock-option-rows tr');
            if (optRow) {
                const shares = parseFloat(optRow.querySelector('[data-id="shares"]')?.value) || 0;
                const strike = math.fromCurrency(optRow.querySelector('[data-id="strikePrice"]')?.value || "0");
                const fmv = math.fromCurrency(optRow.querySelector('[data-id="currentPrice"]')?.value || "0");
                const equity = Math.max(0, (fmv - strike) * shares);
                const display = optRow.querySelector('[data-id="netEquityDisplay"]');
                if (display) display.textContent = math.toCurrency(equity);
            }

            if (target.dataset.id === 'contribution' || target.dataset.id === 'amount' || target.dataset.id === 'bonusPct' || target.dataset.id === 'contribOnBonus') {
                const row = target.closest('tr') || target.closest('.card-container');
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
                }
                if (id === 'hhSize' && window.currentData.benefits) {
                    window.currentData.benefits.hhSize = val;
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
            
            if (el.type === 'range') {
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
                    else if (id.toLowerCase().includes('growth') || id === 'inflation' || id.toLowerCase().includes('rate')) lbl.textContent = `${val}%`;
                    else if (id.toLowerCase().includes('factor')) lbl.textContent = `${Math.round(numericVal * 100)}%`;
                    else lbl.textContent = val;
                }
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
    const isMonHid = row.querySelector('input[data-id="isMonthly"]');
    const isMon = isMonHid ? isMonHid.value === 'true' : false;
    const baseAnn = math.fromCurrency(amountEl.value) * (isMon ? 12 : 1);
    const bPct = parseFloat(row.querySelector('[data-id="bonusPct"]')?.value) || 0;
    const bonus = baseAnn * (bPct / 100);
    const cPct = parseFloat(row.querySelector('[data-id="contribution"]')?.value) || 0;
    let personal = baseAnn * (cPct / 100);
    if (row.querySelector('[data-id="contribOnBonus"]')?.checked) personal += (bonus * (cPct / 100));
    const age = window.currentData?.assumptions?.currentAge || 40, limit = age >= 60 && age <= 63 ? 34750 : (age >= 50 ? 31000 : 23500);
    const warning = row.querySelector('[data-id="capWarning"]');
    if (warning) {
        const isOver = personal > limit;
        warning.classList.toggle('hidden', !isOver);
        if (isOver) {
            warning.title = `401k contribution over IRS limit of ${math.toCurrency(limit)}`;
        }
    }
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
        else if (btn.dataset.action === 'remove') { 
            const target = btn.closest('tr') || btn.closest('.removable-item') || btn.closest('.bg-slate-800');
            target?.remove(); 
            if (window.debouncedAutoSave) window.debouncedAutoSave(); 
        }
        else if (btn.dataset.action === 'toggle-freq') {
            const targetId = btn.dataset.target;
            const rowOrCard = btn.closest('.bg-slate-800') || btn.closest('.removable-item') || btn.closest('tr');
            if (!rowOrCard) return;

            const hiddenInput = rowOrCard.querySelector(`input[type="hidden"][data-id="${targetId}"]`);
            if (!hiddenInput) return;

            const wasMonthly = hiddenInput.value === 'true';
            const isNowMonthly = !wasMonthly;
            
            // Update UI
            hiddenInput.value = isNowMonthly ? 'true' : 'false';
            btn.textContent = isNowMonthly ? 'Monthly' : 'Annual';
            
            // Update Value
            const inputId = targetId === 'incomeExpensesMonthly' ? 'incomeExpenses' : 'amount';
            const valInput = rowOrCard.querySelector(`[data-id="${inputId}"]`);
            
            if (valInput) { 
                const cur = math.fromCurrency(valInput.value); 
                // If it was monthly and is now annual -> multiply by 12
                // If it was annual and is now monthly -> divide by 12
                valInput.value = math.toCurrency(isNowMonthly ? cur / 12 : cur * 12);
                valInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            if (rowOrCard) checkIrsLimits(rowOrCard);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });
    document.body.addEventListener('change', (e) => {
        const target = e.target;
        if (target.dataset.id === 'type' && target.tagName === 'SELECT') {
            if (target.closest('#investment-rows')) updateCostBasisVisibility(target.closest('tr'));
            const typeClass = templates.helpers.getTypeClass(target.value);
            target.className = `input-base w-full font-bold ${typeClass}`;
            target.style.backgroundColor = '#0f172a';
        }
        if (target.dataset.id === 'contribOnBonus' || target.dataset.id === 'matchOnBonus') {
            const row = target.closest('.card-container'); if (row) checkIrsLimits(row);
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
    const isIrr = (['Pre-Tax (401k/IRA)', 'Cash', 'HSA', '529'].includes(typeSel.value));
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
            else if (input.type === 'hidden') input.value = val ? 'true' : 'false';
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
        // Correctly set toggle button labels based on loaded state
        const isMon = !!data.isMonthly;
        const monBtn = element.querySelector('button[data-target="isMonthly"]');
        if (monBtn) monBtn.textContent = isMon ? 'Monthly' : 'Annual';

        const isExpMon = !!data.incomeExpensesMonthly;
        const expBtn = element.querySelector('button[data-target="incomeExpensesMonthly"]');
        if (expBtn) expBtn.textContent = isExpMon ? 'Monthly' : 'Annual';
        
        checkIrsLimits(element);
    }
    if (type === 'investment') updateCostBasisVisibility(element);
};

window.updateSidebarChart = (data) => {
    const totals = {}; let totalSum = 0;
    
    data.investments?.forEach(i => { 
        const v = math.fromCurrency(i.value); 
        totals[i.type] = (totals[i.type] || 0) + v; 
        totalSum += v; 
    });

    const optionsEquity = (data.stockOptions || []).reduce((s, x) => {
        const shares = parseFloat(x.shares) || 0;
        const strike = math.fromCurrency(x.strikePrice);
        const fmv = math.fromCurrency(x.currentPrice);
        return s + Math.max(0, (fmv - strike) * shares);
    }, 0);
    if (optionsEquity > 0) {
        totals['Stock Options'] = optionsEquity;
        totalSum += optionsEquity;
    }

    const helocTotal = data.helocs?.reduce((s, h) => s + math.fromCurrency(h.balance), 0) || 0;

    data.realEstate?.forEach(r => { 
        const v = math.fromCurrency(r.value); 
        const m = math.fromCurrency(r.mortgage);
        const equity = v - m;
        totals['Real Estate'] = (totals['Real Estate'] || 0) + equity; 
        totalSum += equity; 
    });
    
    if (totals['Real Estate']) {
        totals['Real Estate'] -= helocTotal;
        totalSum -= helocTotal;
    } else {
        totals['Real Estate'] = -helocTotal;
        totalSum -= helocTotal;
    }

    data.otherAssets?.forEach(o => { 
        const v = math.fromCurrency(o.value); 
        const l = math.fromCurrency(o.loan);
        const equity = v - l;
        totals['Other'] = (totals['Other'] || 0) + equity; 
        totalSum += equity; 
    });

    const unsecuredDebt = data.debts?.reduce((s, d) => s + math.fromCurrency(d.balance), 0) || 0;
    if (unsecuredDebt > 0) {
        totals['Debt'] = -unsecuredDebt; 
        totalSum -= unsecuredDebt;
    }

    if (lastChartSum !== 0 && (Math.abs(totalSum - lastChartSum) / lastChartSum) < 0.005) return;
    lastChartSum = totalSum;
    const legendContainer = document.getElementById('sidebar-asset-legend');
    if (legendContainer) {
        legendContainer.innerHTML = '';
        const shortNames = { 'Pre-Tax (401k/IRA)': 'Pre-Tax', 'Roth IRA': 'Roth', 'Taxable': 'Brokerage', 'Stock Options': 'Options', 'Real Estate': 'Real Est', 'Crypto': 'Crypto', 'Metals': 'Metals', 'Cash': 'Cash', 'HSA': 'HSA', '529': '529', 'Other': 'Other', 'Debt': 'Debt' };
        
        const compactFormat = (val) => {
            const absVal = Math.abs(val);
            let str = '';
            if (absVal >= 1000000) str = '$' + (absVal / 1000000).toFixed(2) + 'M';
            else if (absVal >= 1000) str = '$' + (absVal / 1000).toFixed(0) + 'K';
            else str = '$' + absVal;
            return val < 0 ? '-' + str : str;
        };

        Object.entries(totals).sort(([, a], [, b]) => b - a).forEach(([type, value]) => {
            if (value === 0) return; 
            
            const color = assetColors[type] || (type === 'Debt' ? '#ef4444' : assetColors['Taxable']);
            const shortName = shortNames[type] || type;
            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 text-[9px] font-bold text-slate-400 overflow-hidden';
            item.innerHTML = `<div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${color}"></div><span class="truncate pr-1">${shortName}</span><span class="ml-auto text-slate-400 font-bold mono-numbers pr-1">${compactFormat(value)}</span>`;
            legendContainer.appendChild(item);
        });
    }
};

window.createAssumptionControls = (data) => {
    const container = document.getElementById('assumptions-container'); if (!container) return;
    const a = data.assumptions || assumptions.defaults;
    const isAdv = !!a.advancedGrowth;
    const hhSize = data.benefits?.hhSize || 1;

    const renderAPY = (label, id, color, val) => {
        if (!isAdv) {
            return `<label class="block"><span class="label-std text-slate-500">${label} APY</span><div class="flex items-center gap-2 mt-1"><input data-id="${id}" type="range" min="0" max="20" step="0.5" value="${val}" class="input-range"><span class="${color} font-bold mono-numbers w-10 text-right">${val}%</span></div></label>`;
        }
        const yrs = a[id + 'Years'] || 10;
        const perp = a[id + 'Perpetual'] || val;
        return `
            <div class="p-3 bg-slate-900/50 rounded-xl border border-slate-700/50 space-y-3">
                <div class="flex justify-between items-center"><span class="label-std ${color}">${label} Growth</span><span class="text-[8px] font-black text-slate-600">ADVANCED</span></div>
                <div class="grid grid-cols-3 gap-2">
                    <div class="flex flex-col"><span class="text-[7px] font-black text-slate-500 uppercase mb-1">Initial %</span><input data-id="${id}" type="number" step="0.1" value="${val}" class="input-base w-full text-[10px] font-bold ${color}"></div>
                    <div class="flex flex-col"><span class="text-[7px] font-black text-slate-500 uppercase mb-1">Years</span><input data-id="${id}Years" type="number" value="${yrs}" class="input-base w-full text-[10px] font-bold text-white"></div>
                    <div class="flex flex-col"><span class="text-[7px] font-black text-slate-500 uppercase mb-1">Perpetual %</span><input data-id="${id}Perpetual" type="number" step="0.1" value="${perp}" class="input-base w-full text-[10px] font-bold ${color}"></div>
                </div>
            </div>`;
    };

    container.innerHTML = `
        <div class="col-span-full mb-4 pb-2 border-b border-slate-700/50 flex justify-between items-center">
            <div class="flex items-center gap-2">
                <i class="fas fa-user-circle text-blue-400"></i>
                <h3 class="label-std text-slate-400">Personal & Strategy</h3>
            </div>
            <button id="btn-reset-market" class="px-3 py-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">Reset Defaults</button>
        </div>
        <div class="space-y-6 lg:border-r lg:border-slate-700/30 lg:pr-8">
            <label class="block"><span class="label-std text-slate-500">Legal State of Residence</span>
                <select data-id="state" class="input-base w-full mt-1 font-bold bg-slate-900 text-white">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </label>
            <div class="grid grid-cols-2 gap-4">
                <label class="block"><span class="label-std text-slate-500">Filing Status</span>
                    <select data-id="filingStatus" class="input-base w-full mt-1 font-bold bg-slate-900 text-white">
                        <option ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                        <option ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                        <option ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
                    </select>
                </label>
                <label class="block"><span class="label-std text-slate-500">Family Size</span>
                    <input data-id="hhSize" type="number" value="${hhSize}" min="1" max="10" class="input-base w-full mt-1 font-bold text-white">
                </label>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <label class="flex flex-col h-full"><span class="label-std text-slate-500">Current Age</span><input data-id="currentAge" type="number" value="${a.currentAge}" class="input-base w-full mt-auto font-bold text-white"></label>
                <label class="flex flex-col h-full"><span class="label-std text-slate-500">Retirement Age</span><input data-id="retirementAge" type="number" value="${a.retirementAge}" class="input-base w-full mt-auto font-bold text-blue-400"></label>
            </div>
            <label class="block"><span class="label-std text-slate-500">SS Start Age</span><input data-id="ssStartAge" type="number" value="${a.ssStartAge}" class="input-base w-full mt-1 font-bold text-white"></label>
            <label class="block"><span class="label-std text-slate-500">SS Monthly Benefit</span><input data-id="ssMonthly" type="number" value="${a.ssMonthly}" class="input-base w-full mt-1 font-bold text-white"></label>
        </div>
        <div class="col-span-1 space-y-4">
            <div class="flex justify-between items-center pb-2 border-b border-slate-700/50">
                <h3 class="label-std text-slate-400 flex items-center gap-2"><i class="fas fa-chart-line text-emerald-400"></i> Market APY</h3>
                <button id="btn-toggle-advanced-apy" class="px-2 py-0.5 bg-slate-700 text-[8px] font-black rounded uppercase tracking-widest text-slate-300 hover:text-white transition-colors">${isAdv ? 'Simple View' : 'Advanced APY'}</button>
            </div>
            ${renderAPY('Stock', 'stockGrowth', 'text-emerald-400', a.stockGrowth)}
            ${renderAPY('Crypto', 'cryptoGrowth', 'text-orange-400', a.cryptoGrowth)}
            ${renderAPY('Metals', 'metalsGrowth', 'text-yellow-500', a.metalsGrowth)}
            ${renderAPY('Real Estate', 'realEstateGrowth', 'text-indigo-400', a.realEstateGrowth)}
            
            <label class="block pt-2 border-t border-slate-700/30"><span class="label-std text-slate-500">Inflation</span><div class="flex items-center gap-2 mt-1"><input data-id="inflation" type="range" min="0" max="10" step="0.1" value="${a.inflation}" class="input-range"><span class="text-red-400 font-bold mono-numbers w-10 text-right">${a.inflation}%</span></div></label>
        </div>
        <div class="col-span-1 space-y-6 lg:border-l lg:border-slate-700/30 lg:pl-8">
            <h3 class="label-std text-slate-400 pb-2 border-b border-slate-700/50 flex items-center gap-2"><i class="fas fa-couch text-pink-400"></i> Retirement Spending</h3>
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 space-y-4">
                <label class="block"><span class="label-std text-slate-500">GO-GO (Age 30-50)</span><div class="flex items-center gap-2 mt-1"><input data-id="slowGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${a.slowGoFactor}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round(a.slowGoFactor * 100)}%</span></div></label>
                <label class="block"><span class="label-std text-slate-500">SLOW-GO (Age 50-80)</span><div class="flex items-center gap-2 mt-1"><input data-id="midGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${a.midGoFactor}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round(a.midGoFactor * 100)}%</span></div></label>
                <label class="block"><span class="label-std text-slate-500">NO-GO (Age 80+)</span><div class="flex items-center gap-2 mt-1"><input data-id="noGoFactor" type="range" min="0.5" max="2.0" step="0.05" value="${a.noGoFactor}" class="input-range"><span class="text-pink-400 font-bold mono-numbers w-12 text-right">${Math.round(a.noGoFactor * 100)}%</span></div></label>
            </div>
        </div>
    `;
};

import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let simulationTrace = {}; 
let firstInsolvencyAge = null; 
let lastUsedRetirementAge = 65;
let traceAgeManuallySet = false;

export const burndown = {
    getIsRealDollars: () => isRealDollars,
    toggleRealDollars: () => {
        isRealDollars = !isRealDollars;
        return isRealDollars;
    },
    priorityOrder: ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa'],
    getInsolvencyAge: () => firstInsolvencyAge,

    init: () => {
        const viewContainer = document.getElementById('burndown-view-container');
        if (!viewContainer) return;

        viewContainer.innerHTML = `
            <div class="flex flex-col gap-4">
                <!-- Integrated Header & Controls -->
                <div class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 border-b border-white/5 pb-4">
                    
                    <!-- Title & Icon -->
                    <div class="flex items-center gap-4 px-1">
                        <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <i class="fas fa-microchip text-sm"></i>
                        </div>
                        <h2 class="text-xl font-bold text-white tracking-tight">Burndown Engine</h2>
                    </div>

                    <!-- Primary Controls -->
                    <div class="flex items-center gap-6">
                         <!-- Retirement Age -->
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retirement Age</label>
                            <div class="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                                <button id="btn-retire-minus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-minus text-[10px]"></i></button>
                                <span id="label-top-retire-age" class="text-blue-400 font-black mono-numbers text-sm w-6 text-center">--</span>
                                <button id="btn-retire-plus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-plus text-[10px]"></i></button>
                                <input type="range" id="input-top-retire-age" data-id="retirementAge" min="30" max="80" step="1" class="hidden"> 
                            </div>
                         </div>
                         
                         <!-- Budget -->
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Annual Spend</label>
                            <div class="flex items-center gap-2">
                                <div id="manual-budget-container" class="hidden">
                                    <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" value="$100,000" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-teal-400 font-bold text-right w-24 mono-numbers outline-none focus:border-blue-500">
                                </div>
                                <label class="flex items-center gap-2 cursor-pointer bg-slate-900/50 border border-white/10 px-2 py-1 rounded-lg hover:border-slate-600 transition-all">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Sync Budget</span>
                                    <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                </label>
                            </div>
                         </div>
                    </div>
                </div>

                <!-- Strategy Dashboard -->
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    
                    <!-- Card 1: MAGI Strategy -->
                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-center">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">MAGI Strategy Target</label>
                            <div class="flex items-center gap-2">
                                <span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[10px] uppercase tracking-widest bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">Platinum Zone</span>
                            </div>
                        </div>
                        <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full mb-2">
                        <div class="flex justify-between items-center mt-1">
                            <span class="text-[8px] font-bold text-slate-600 uppercase">Min (Medicaid)</span>
                            <span class="text-[8px] font-bold text-slate-600 uppercase">Max (Uncapped)</span>
                        </div>
                    </div>

                    <!-- Card 2: Cash Reserve Floor -->
                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-center">
                        <div class="flex justify-between items-center mb-2">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retain Cash Reserve</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px] tracking-widest bg-pink-400/10 px-2 py-0.5 rounded border border-pink-400/20">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="5000" value="25000" class="input-range w-full mb-2">
                        <div class="flex justify-between items-center mt-1">
                            <span class="text-[8px] font-bold text-slate-600 uppercase">$0</span>
                            <span class="text-[8px] font-bold text-slate-600 uppercase">$100K+</span>
                        </div>
                    </div>

                    <!-- Card 3: Feedback & Toggles -->
                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex items-center justify-between gap-4">
                        <!-- SNAP Badge -->
                        <div class="flex flex-col items-center justify-center border-r border-slate-800 pr-4 min-w-[80px]">
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Est. SNAP</span>
                            <span id="est-snap-indicator" class="text-lg font-black text-emerald-400 mono-numbers leading-none">$0</span>
                            <span class="text-[8px] font-bold text-slate-600">per month</span>
                        </div>

                        <!-- Toggles -->
                        <div class="flex gap-2 flex-wrap justify-end flex-grow">
                             <button id="btn-dwz-toggle" class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl flex items-center gap-2 group hover:bg-slate-700 transition-all">
                                <div class="w-3 h-3 rounded-full border border-slate-500 group-[.active]:bg-rose-500 group-[.active]:border-rose-500"></div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest group-[.active]:text-white">Die With Zero</span>
                             </button>
                             
                             <button id="toggle-burndown-real" class="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                                Nominal $
                             </button>
                        </div>
                    </div>
                </div>

                <!-- Priority List -->
                <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-wrap items-center gap-3">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Draw Order:</span>
                    <div id="draw-priority-list" class="flex flex-wrap items-center gap-2"></div>
                </div>

                <!-- Table -->
                <div class="card-container bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl mt-2">
                    <div id="burndown-table-container" class="max-h-[60vh] overflow-auto mono-numbers"></div>
                </div>
            </div>
        `;
        burndown.attachListeners();
        burndown.run(); 
    },

    attachListeners: () => {
        ['input-strategy-dial', 'toggle-budget-sync', 'input-top-retire-age', 'input-cash-reserve'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-strategy-dial') {
                    const lbl = document.getElementById('label-strategy-status');
                    const val = parseInt(el.value);
                    lbl.textContent = val <= 33 ? "Platinum Zone" : (val <= 66 ? "Silver CSR Zone" : "Budget Strategy");
                }
                if (id === 'input-cash-reserve') {
                    const lbl = document.getElementById('label-cash-reserve');
                    lbl.textContent = math.toCurrency(parseInt(el.value));
                }
                if (id === 'input-top-retire-age') {
                    document.getElementById('label-top-retire-age').textContent = el.value;
                }
                if (id === 'toggle-budget-sync') {
                    document.getElementById('manual-budget-container')?.classList.toggle('hidden', el.checked);
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        // Debug controls
        const debugAgeInp = document.getElementById('input-debug-age');
        const btnDebugMinus = document.getElementById('btn-debug-minus');
        const btnDebugPlus = document.getElementById('btn-debug-plus');
        
        if (debugAgeInp) {
            debugAgeInp.oninput = () => {
                traceAgeManuallySet = true;
                burndown.updateTraceLog();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }
        
        if (btnDebugMinus && debugAgeInp) {
            btnDebugMinus.onclick = () => {
                traceAgeManuallySet = true;
                const current = parseInt(debugAgeInp.value) || lastUsedRetirementAge;
                debugAgeInp.value = Math.max(18, current - 1);
                burndown.updateTraceLog();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }
        
        if (btnDebugPlus && debugAgeInp) {
            btnDebugPlus.onclick = () => {
                traceAgeManuallySet = true;
                const current = parseInt(debugAgeInp.value) || lastUsedRetirementAge;
                debugAgeInp.value = Math.min(100, current + 1);
                burndown.updateTraceLog();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const btnMinus = document.getElementById('btn-retire-minus');
        const btnPlus = document.getElementById('btn-retire-plus');
        const topRetireSlider = document.getElementById('input-top-retire-age');
        if (btnMinus && btnPlus && topRetireSlider) {
            btnMinus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) - 1; topRetireSlider.dispatchEvent(new Event('input')); };
            btnPlus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) + 1; topRetireSlider.dispatchEvent(new Event('input')); };
        }

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn) {
            dwzBtn.onclick = () => {
                dwzBtn.classList.toggle('active');
                if (dwzBtn.classList.contains('active')) {
                    const syncToggle = document.getElementById('toggle-budget-sync');
                    if (syncToggle?.checked) {
                        syncToggle.checked = false;
                        document.getElementById('manual-budget-container')?.classList.remove('hidden');
                    }
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const realBtn = document.getElementById('toggle-burndown-real');
        if (realBtn) {
            realBtn.onclick = () => {
                isRealDollars = !isRealDollars;
                burndown.updateToggleStyle(realBtn);
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const manualInput = document.getElementById('input-manual-budget');
        if (manualInput) {
            formatter.bindCurrencyEventListeners(manualInput);
            manualInput.oninput = () => { 
                burndown.run(); 
                if (window.debouncedAutoSave) window.debouncedAutoSave(); 
            };
        }

        // Logic Documentation Toggle
        const docBtn = document.getElementById('btn-toggle-engine-doc');
        const docContainer = document.getElementById('engine-logic-doc');
        if (docBtn && docContainer) {
            docBtn.onclick = () => {
                const isHidden = docContainer.classList.contains('hidden');
                docContainer.classList.toggle('hidden');
                docBtn.innerHTML = isHidden 
                    ? `<i class="fas fa-chevron-up mr-2"></i> HIDE DETAILS` 
                    : `<i class="fas fa-question-circle mr-2"></i> HOW IT WORKS`;
            };
        }
    },

    updateTraceLog: () => {
        const debugAgeInp = document.getElementById('input-debug-age');
        const log = document.getElementById('burndown-trace-log');
        if (!debugAgeInp || !log) return;
        
        const focusAge = parseInt(debugAgeInp.value);
        if (simulationTrace[focusAge]) {
            log.innerHTML = simulationTrace[focusAge].join('\n');
        } else {
            log.innerHTML = `No data found for age ${focusAge}. Select an age between 30 and 100.`;
        }
    },

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

    load: (data) => {
        if (data?.priority) burndown.priorityOrder = [...new Set(data.priority)];
        isRealDollars = !!data?.isRealDollars;
        traceAgeManuallySet = !!data?.traceAgeManuallySet;
        
        const sync = (id, val, isCheck = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isCheck) el.checked = val; else el.value = val;
                el.dispatchEvent(new Event('input'));
            }
        };

        if (data) {
            sync('input-strategy-dial', data.strategyDial || 33);
            sync('input-cash-reserve', data.cashReserve || 25000);
            sync('toggle-budget-sync', data.useSync ?? true, true);
            
            // Prioritize window.currentData.assumptions.retirementAge if local burndown retirementAge is missing
            const fallbackRetAge = window.currentData?.assumptions?.retirementAge || 65;
            sync('input-top-retire-age', data.retirementAge || fallbackRetAge);
            
            if (data.dieWithZero) document.getElementById('btn-dwz-toggle')?.classList.add('active');
            
            const manualInput = document.getElementById('input-manual-budget');
            if (data.manualBudget && manualInput) manualInput.value = math.toCurrency(data.manualBudget);

            if (traceAgeManuallySet && data.traceAge !== undefined) {
                const debugAgeInp = document.getElementById('input-debug-age');
                if (debugAgeInp) debugAgeInp.value = data.traceAge;
            }
        }

        burndown.run();
    },

    scrape: () => ({
        priority: burndown.priorityOrder,
        strategyDial: parseInt(document.getElementById('input-strategy-dial')?.value || 33),
        cashReserve: parseInt(document.getElementById('input-cash-reserve')?.value || 25000),
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        dieWithZero: document.getElementById('btn-dwz-toggle')?.classList.contains('active') ?? false,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        retirementAge: parseFloat(document.getElementById('input-top-retire-age')?.value || 65),
        isRealDollars,
        traceAge: parseInt(document.getElementById('input-debug-age')?.value || 65),
        traceAgeManuallySet
    }),

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false, isMagi: false },
        'taxable': { label: 'Taxable Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true, isMagi: true }, 
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Roth IRA'], isTaxable: false, isMagi: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false, isMagi: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true, isMagi: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth Gains'], isTaxable: false, isMagi: true },
        'crypto': { label: 'Crypto', short: 'Crypto', color: assetColors['Crypto'], isTaxable: true, isMagi: true },
        'metals': { label: 'Metals', short: 'Metals', color: assetColors['Metals'], isTaxable: true, isMagi: true },
        'hsa': { label: 'HSA', short: 'HSA', color: assetColors['HSA'], isTaxable: false, isMagi: false }
    },

    run: () => {
        const data = window.currentData;
        if (!data || !data.assumptions) return;

        const priorityList = document.getElementById('draw-priority-list');
        if (priorityList && !priorityList.innerHTML) {
            burndown.priorityOrder = [...new Set(burndown.priorityOrder)];
            priorityList.innerHTML = burndown.priorityOrder.map((k, idx) => {
                const meta = burndown.assetMeta[k];
                const arrow = idx < burndown.priorityOrder.length - 1 ? `<i class="fas fa-chevron-right text-slate-700 text-[8px] mx-1"></i>` : '';
                return `<div data-pk="${k}" class="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-[9px] font-bold cursor-move transition-colors flex items-center gap-2" style="color: ${meta.color}"><i class="fas fa-grip-vertical text-slate-700 mr-1"></i>${meta.short}</div>${arrow}`;
            }).join('');
            
            if (typeof Sortable !== 'undefined' && !burndown.sortable) {
                burndown.sortable = new Sortable(priorityList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-slate-700/30',
                    onEnd: () => {
                        burndown.priorityOrder = Array.from(priorityList.children)
                            .filter(el => el.dataset && el.dataset.pk)
                            .map(el => el.dataset.pk);
                        burndown.run(); 
                        if (window.debouncedAutoSave) window.debouncedAutoSave();
                    }
                });
            }
        }

        const config = burndown.scrape();
        lastUsedRetirementAge = config.retirementAge; 
        let results = [];

        if (config.dieWithZero) {
            let low = 0, high = 2000000, bestBudget = low;
            for (let i = 0; i < 20; i++) {
                let mid = (low + high) / 2;
                const sim = burndown.simulateProjection(data, mid);
                // Simple insolvency check for binary search
                if (sim.some(y => y.isInsolvent)) high = mid;
                else { bestBudget = mid; low = mid; }
            }
            results = burndown.simulateProjection(data, bestBudget);
            const manualInp = document.getElementById('input-manual-budget');
            if (manualInp && document.activeElement !== manualInp) manualInp.value = math.toCurrency(bestBudget);
        } else {
            results = burndown.simulateProjection(data);
        }

        if (results.length > 0) {
            const firstRetYear = results.find(r => r.age >= config.retirementAge) || results[0];
            const snapInd = document.getElementById('est-snap-indicator');
            if (snapInd) snapInd.textContent = `${formatter.formatCurrency((firstRetYear.snapBenefit || 0) / 12, 0)}`;
        }

        const tableContainer = document.getElementById('burndown-table-container');
        if (tableContainer) tableContainer.innerHTML = burndown.renderTable(results);

        const debugAgeInp = document.getElementById('input-debug-age');
        if (debugAgeInp) {
            // If linked (not manually set), update to retirement age
            if (!traceAgeManuallySet) {
                debugAgeInp.value = config.retirementAge;
            }
            burndown.updateTraceLog();
        }
    },

    simulateProjection: (data, overrideManualBudget = null) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = {}, debts = [] } = data;
        const config = burndown.scrape(); 
        const inflationRate = (assumptions.inflation || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const hhSize = benefits.hhSize || 1; 
        const currentYear = new Date().getFullYear();
        const dial = config.strategyDial, rAge = config.retirementAge, cashFloor = config.cashReserve;

        // User defined Federal Rates from Assumptions
        const ltcgRate = (assumptions.ltcgRate || 15) / 100;
        const colRate = (assumptions.collectiblesRate || 28) / 100;

        simulationTrace = {};
        firstInsolvencyAge = null;
        
        // Initialize Balances
        const bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-basis': investments.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-earnings': investments.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + Math.max(0, math.fromCurrency(i.value) - math.fromCurrency(i.costBasis)), 0),
            '401k': investments.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'crypto': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'cryptoBasis': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'metals': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'metalsBasis': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'hsa': investments.filter(i => i.type === 'HSA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'heloc': helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0)
        };
        
        const simRE = realEstate.map(r => ({ ...r, mortgage: math.fromCurrency(r.mortgage), principalPayment: math.fromCurrency(r.principalPayment) }));
        const simDebts = debts.map(d => ({ ...d, balance: math.fromCurrency(d.balance), principalPayment: math.fromCurrency(d.principalPayment) }));
        const simOA = otherAssets.map(o => ({ ...o, loan: math.fromCurrency(o.loan), principalPayment: math.fromCurrency(o.principalPayment) }));
        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0);
        const results = [];

        for (let i = 0; i <= (100 - assumptions.currentAge); i++) {
            const age = assumptions.currentAge + i, year = currentYear + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            const trace = [];
            trace.push(`<span class="text-blue-400 font-bold">--- STARTING AGE ${age} ---</span>`);

            // Apply Payments to Debts
            const totalMort = simRE.reduce((s, r) => s + (r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12)), 0);
            const totalOL = simOA.reduce((s, o) => s + (o.loan = Math.max(0, o.loan - (o.principalPayment || 0) * 12)), 0);
            const totalDebt = simDebts.reduce((s, d) => s + (d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12)), 0);

            // Determine Target Spend
            let baseBudget = overrideManualBudget ? overrideManualBudget * infFac : (config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac);
            
            let factor = 1.0;
            if (isRet) {
                if (age < 50) factor = assumptions.slowGoFactor || 1.0; 
                else if (age < 80) factor = assumptions.midGoFactor || 0.9; 
                else factor = assumptions.noGoFactor || 0.8; 
            }
            let targetBudget = isRet ? baseBudget * factor : baseBudget;
            trace.push(`Target Spending: ${math.toCurrency(targetBudget)} (Factor: ${Math.round(factor * 100)}%)`);

            // ----- INCOME FLOOR CALCULATION -----
            // This is "passive" income that comes in regardless of withdrawals.
            let floorOrdIncome = 0;
            let floorTotalIncome = 0;
            let floorNetCash = 0;
            let pretaxDed = 0; // For active years

            // Active Income & Passive Retirement Income
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const grossWithBonus = gross + gross * (parseFloat(inc.bonusPct) / 100 || 0);
                const expenses = math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                const netSrc = grossWithBonus - expenses;

                // Check "No Tax Until"
                const isTaxable = !inc.nonTaxableUntil || parseInt(inc.nonTaxableUntil) < year;
                
                if (isTaxable) {
                    floorOrdIncome += netSrc;
                    // For active years, calculate 401k deductions to remove from taxable flow
                    if (!isRet) {
                        const contribution = Math.min(gross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac);
                        pretaxDed += contribution;
                    }
                }
                floorTotalIncome += netSrc;
            });

            // Social Security
            if (age >= assumptions.ssStartAge) {
                const ssGross = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const taxableSS = engine.calculateTaxableSocialSecurity(ssGross, Math.max(0, floorOrdIncome), filingStatus);
                floorOrdIncome += taxableSS; 
                floorTotalIncome += ssGross;
                trace.push(`Social Security: ${math.toCurrency(ssGross)} (${math.toCurrency(taxableSS)} taxable)`);
            }

            // RMDs (Forced Withdrawal) - Treated as mandatory income
            let rmd = 0;
            if (age >= 75) { 
                rmd = engine.calculateRMD(bal['401k'], age); 
                bal['401k'] -= rmd; 
                floorOrdIncome += rmd; 
                floorTotalIncome += rmd;
                trace.push(`RMD Forced Draw: ${math.toCurrency(rmd)}`); 
            }

            // Stage 1: Accumulation (Before Retirement)
            if (!isRet) {
                // Add defined savings from table
                bal['401k'] += pretaxDed;
                (budget.savings || []).forEach(sav => {
                    const amt = math.fromCurrency(sav.annual) * infFac;
                    const keyMap = { 'Cash': 'cash', 'Taxable': 'taxable', 'Roth IRA': 'roth-basis', 'HSA': 'hsa', 'Crypto': 'crypto', 'Metals': 'metals' };
                    const key = keyMap[sav.type];
                    if (key) {
                        bal[key] += amt;
                        if (key === 'taxable' || key === 'crypto' || key === 'metals') bal[key + 'Basis'] += amt;
                    }
                });
                trace.push(`Working Year: Accumulated ${math.toCurrency(pretaxDed)} to 401k.`);
            }

            // ----- BASELINE DEFICIT CALCULATION -----
            // Calculate taxes and SNAP based on the "Floor" income.
            const baseTax = engine.calculateTax(Math.max(0, floorOrdIncome - pretaxDed), 0, filingStatus, assumptions.state, infFac);
            const baseSnap = engine.calculateSnapBenefit(floorOrdIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
            
            // Available Cash from Income = Gross Income - Taxes + SNAP
            // Note: For active years, we already subtracted pretaxDed from balances, so we don't subtract it from "Cash" flow here unless it wasn't added to balance.
            // Simplified: Net Cash = (TotalIncome - PreTaxSavings) - Tax + Snap
            floorNetCash = (floorTotalIncome - pretaxDed) - baseTax + baseSnap;
            
            let deficit = targetBudget - floorNetCash;
            let currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed);
            let currentLtcgIncome = 0;
            let currentDraws = {};
            let totalWithdrawn = 0;

            trace.push(`Base Net Income: ${math.toCurrency(floorNetCash)} (Tax: ${math.toCurrency(baseTax)}, SNAP: ${math.toCurrency(baseSnap)})`);
            
            if (deficit > 0) {
                trace.push(`<strong>Initial Shortfall: ${math.toCurrency(deficit)}</strong>`);
                
                // Strategy Targets
                const fpl = (16060 + (hhSize - 1) * 5650) * infFac;
                const medLim = fpl * (data.benefits?.isPregnant ? 1.95 : 1.38);
                const silverLim = fpl * 2.5;
                let magiTarget = dial <= 33 ? medLim * (dial / 33) : (dial <= 66 ? medLim + (silverLim - medLim) * ((dial - 33) / 33) : Math.max(silverLim, targetBudget * 1.5));
                
                // Allow "survival mode" to exceed strategy
                // If the floor income is already above target, the target is irrelevant for limitation, only for tax bracket calc.
                
                // ----- SMART FILL LOOP -----
                for (const pk of burndown.priorityOrder) {
                    if (deficit <= 1) break; // Buffer of $1

                    let available = (pk === 'heloc') ? Math.max(0, helocLimit - bal['heloc']) : ((pk === 'cash') ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0));
                    if (available <= 0) continue;

                    // 1. Determine Marginal Tax Rate for this bucket
                    // This is a heuristic to guess how much we need to pull to cover the deficit + new taxes.
                    let marginalRate = 0;
                    const meta = burndown.assetMeta[pk];
                    
                    if (meta.isTaxable) {
                        // Rough marginal rate including SNAP phase-out (30%)
                        // If current MAGI < SnapLimit, add 0.30.
                        const snapLimit = (fpl * 2.0); 
                        const effectiveSnapTax = (currentOrdIncome + currentLtcgIncome < snapLimit) ? 0.30 : 0;
                        
                        if (pk === '401k') {
                            marginalRate = 0.22 + (stateTaxRates[assumptions.state]?.rate || 0.04) + effectiveSnapTax; 
                        } else if (pk === 'taxable' || pk === 'crypto' || pk === 'metals') {
                            const basisRatio = (bal[pk] > 0) ? (bal[pk+'Basis'] / bal[pk]) : 0;
                            const gainRatio = 1 - basisRatio;
                            // Tax is only on the gain portion
                            marginalRate = gainRatio * (0.15 + (stateTaxRates[assumptions.state]?.rate || 0.04)) + effectiveSnapTax;
                        }
                    }

                    // 2. Gross Up
                    // We need 'deficit' in net cash. 
                    // GrossNeeded ~= Deficit / (1 - marginalRate)
                    // We cap marginalRate at 0.8 to prevent divide-by-zero or absurdity.
                    let safeRate = Math.min(0.8, marginalRate);
                    let grossNeeded = deficit / (1 - safeRate);

                    // 3. Apply Limits
                    let amountToTake = Math.min(grossNeeded, available);
                    
                    // SEPP Limit
                    if (pk === '401k' && age < 59.5) {
                        const seppLimit = engine.calculateMaxSepp(bal['401k'], age); // This should technically be fixed at start of 72t but simulating annual check
                        const remainingSepp = Math.max(0, seppLimit - (currentDraws['401k'] || 0));
                        amountToTake = Math.min(amountToTake, remainingSepp);
                    }

                    // MAGI Strategy Cap (Only if we aren't desperate)
                    // If taking this amount pushes us over MAGI target, AND we haven't already filled the deficit...
                    // Actually, the new logic says: priority is meeting budget. 
                    // But we should try to switch buckets if we hit the cap.
                    // Let's implement a soft cap: Try to limit to MAGI target first.
                    if (meta.isMagi) {
                        const currentMagi = currentOrdIncome + currentLtcgIncome;
                        const room = Math.max(0, magiTarget - currentMagi);
                        
                        // If we have room, take it. If we run out of room, STOP taking from this bucket IF there are other buckets left.
                        // But we don't know if other buckets have money.
                        // Simplified approach: Just take what's needed. The Priority Order dictates the strategy.
                        // User sets Priority. If they put 401k first, they want to use it.
                    }

                    if (amountToTake <= 0) continue;

                    // 4. Commit Withdrawal
                    if (pk === 'heloc') bal['heloc'] += amountToTake; 
                    else {
                        bal[pk] -= amountToTake;
                        if (bal[pk+'Basis']) {
                            const ratio = amountToTake / (available + amountToTake); // Re-add to get start bal
                            // Actually simplified: just reduce basis proportionally
                            const basisRed = bal[pk+'Basis'] * (amountToTake / available); 
                            bal[pk+'Basis'] -= basisRed;
                        }
                    }

                    // 5. Update Income Trackers
                    currentDraws[pk] = (currentDraws[pk] || 0) + amountToTake;
                    totalWithdrawn += amountToTake;

                    if (pk === '401k') currentOrdIncome += amountToTake;
                    else if (['taxable', 'crypto', 'metals'].includes(pk)) {
                        // Calculate gain
                        // Approximation for loop speed: Assume average basis ratio of *remaining* balance
                        // or use the specific lot logic? Let's use proportional.
                        // We already adjusted basis above.
                        // Gain = Amount - BasisPart
                        // Recalculating basis ratio from the snapshot before this specific draw is hard without temp var.
                        // Let's use the marginal rate heuristic for the income adder to be safe/fast.
                        // Actually, let's track Basis separately carefully.
                        // Gain = Amount * (1 - (Basis / Value))
                        // We updated balance, so let's use the 'available' snapshot.
                        const basisRatio = (bal[pk] + amountToTake) > 0 ? ((bal[pk+'Basis'] + (bal[pk+'Basis']*(amountToTake/available))) / (bal[pk] + amountToTake)) : 0;
                        // Correction: just use the global tracking
                        // Let's simplified: 
                        const impliedGain = amountToTake * (1 - (bal[pk+'Basis'] / (bal[pk] || 1))); // rough
                        currentLtcgIncome += Math.max(0, impliedGain); 
                        // Note: This is getting messy inside the loop. 
                        // Better: Just update the `currentLtcgIncome` accumulator based on a simple ratio.
                        // For the simulation, let's assume 50% basis if data missing, or actual.
                    }

                    // 6. Recalculate Deficit
                    const newTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                    const newSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
                    
                    const newNetCash = (floorTotalIncome - pretaxDed) + totalWithdrawn - newTax + newSnap;
                    deficit = targetBudget - newNetCash;
                    
                    trace.push(`Withdrew ${math.toCurrency(amountToTake)} from ${pk}. Remaining Shortfall: ${math.toCurrency(deficit)}`);
                }
            }

            // Final Calculation for the year
            const finalTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
            const finalSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
            const finalNetCash = (floorTotalIncome - pretaxDed) + totalWithdrawn - finalTax + finalSnap;
            const magi = currentOrdIncome + currentLtcgIncome;
            
            // Insolvency Check
            // We check liquid assets. If we still have a deficit > $100 and no liquid assets, we are insolvent.
            const liquidAssets = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            
            // Allow for a small margin of error ($100) due to step-wise filling
            const isActuallyInsolvent = (targetBudget - finalNetCash) > 100 && liquidAssets < 1000;

            const yearRes = { 
                age, year, budget: targetBudget, magi, netWorth: currentNW, 
                isInsolvent: isActuallyInsolvent, 
                balances: { ...bal }, draws: currentDraws, snapBenefit: finalSnap,
                taxes: finalTax,
                liquid: liquidAssets
            };
            
            // Status Logic
            const medLim = (16060 + (hhSize - 1) * 5650) * infFac * (data.benefits?.isPregnant ? 1.95 : 1.38);
            const silverLim = (16060 + (hhSize - 1) * 5650) * infFac * 2.5;
            yearRes.status = yearRes.isInsolvent ? 'INSOLVENT' : (age >= 65 ? 'Medicare' : (magi <= medLim ? 'Platinum' : (magi <= silverLim ? 'Silver' : 'Private')));

            if (yearRes.isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;
            
            simulationTrace[age] = trace;
            results.push(yearRes);

            // Growth Loop
            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, assumptions.currentAge, assumptions);

            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth)); 
            bal['crypto'] *= (1 + cryptoGrowth); bal['metals'] *= (1 + metalsGrowth);
            if (bal['heloc'] > 0) bal['heloc'] *= (1 + 0.07); 
            bal['roth-earnings'] += (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth;
        }
        return results;
    },

    renderTable: (results) => {
        const isMobile = window.innerWidth < 768, infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const formatCell = (v) => isMobile ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(v) : formatter.formatCurrency(v, 0);
        
        const header = isMobile 
            ? `<tr class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20"><th class="p-2 w-10 text-center">Age</th><th class="p-2 text-center">Spend</th><th class="p-2 text-center">MAGI</th><th class="p-2 text-center">Health</th><th class="p-2 text-center">Net Worth</th></tr>`
            : `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5"><th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th><th class="p-2 text-center !bg-[#1e293b]">Budget</th><th class="p-2 text-center !bg-[#1e293b]">MAGI</th><th class="p-2 text-center !bg-[#1e293b]">Health</th><th class="p-2 text-center !bg-[#1e293b]">SNAP</th>${burndown.priorityOrder.map(k => `<th class="p-2 text-center text-[9px] !bg-[#1e293b]" style="color:${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('')}<th class="p-2 text-center !bg-[#1e293b]">Net Worth</th></tr>`;

        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const badgeClass = r.status === 'INSOLVENT' ? 'bg-red-600 text-white' : (r.status === 'Medicare' ? 'bg-slate-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Silver' ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white')));
            const isRetYear = r.age === lastUsedRetirementAge;
            const retBadge = isRetYear ? `<span class="block text-[7px] text-yellow-400 mt-0.5 tracking-tighter">RET YEAR</span>` : '';

            if (isMobile) {
                if (r.age > 70 && r.age % 5 !== 0) return '';
                return `<tr class="border-b border-slate-800/50 text-[10px] ${r.isInsolvent ? 'bg-red-900/10' : ''}">
                    <td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-400' : ''}">${r.age}</td>
                    <td class="p-2 text-center">
                        <div class="text-slate-400">${formatCell(r.budget / inf)}</div>
                        <div class="text-[8px] text-red-400/70 font-bold">+${formatCell(r.taxes / inf)} Tax</div>
                    </td>
                    <td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td>
                    <td class="p-2 text-center">
                        <span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${badgeClass}">${r.status}</span>
                    </td>
                    <td class="p-2 text-center">
                        <div class="font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</div>
                        <div class="text-[8px] text-emerald-600 font-bold">Liq: ${formatCell(r.liquid / inf)}</div>
                    </td>
                </tr>`;
            }
            const draws = burndown.priorityOrder.map(k => `<td class="p-1.5 text-center border-l border-white/5"><div class="${r.draws?.[k] > 0 ? 'font-bold' : 'text-slate-700'}" style="color:${r.draws?.[k] > 0 ? burndown.assetMeta[k]?.color : ''}">${formatCell((r.draws?.[k] || 0) / inf)}</div><div class="text-[8px] opacity-40">${formatCell(r.balances[k] / inf)}</div></td>`).join('');
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[10px] ${r.isInsolvent ? 'bg-red-900/10' : (isRetYear ? 'bg-blue-900/10' : '')}"><td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-400' : ''}">${r.age}</td><td class="p-2 text-center text-slate-400">${formatCell(r.budget / inf)}</td><td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td><td class="p-2 text-center"><span class="px-2 py-1 rounded text-[9px] font-black uppercase ${badgeClass}">${r.status}</span>${retBadge}</td><td class="p-2 text-center text-emerald-500 font-bold">${formatCell(r.snapBenefit / inf)}</td>${draws}<td class="p-2 text-center font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</td></tr>`;
        }).join('');

        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
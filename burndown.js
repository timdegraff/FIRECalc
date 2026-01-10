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
                <div class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4 border-b border-white/5 pb-4">
                    <div class="flex items-center gap-4 px-1">
                        <div class="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400">
                            <i class="fas fa-microchip text-sm"></i>
                        </div>
                        <h2 class="text-xl font-bold text-white tracking-tight">Burndown Engine</h2>
                    </div>

                    <div class="flex items-center gap-6">
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Retirement Age</label>
                            <div class="flex items-center gap-2 bg-slate-900/50 p-1 rounded-lg border border-white/10">
                                <button id="btn-retire-minus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-minus text-[10px]"></i></button>
                                <span id="label-top-retire-age" class="text-blue-400 font-black mono-numbers text-sm w-6 text-center">--</span>
                                <button id="btn-retire-plus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-plus text-[10px]"></i></button>
                                <input type="range" id="input-top-retire-age" data-id="retirementAge" min="30" max="80" step="1" class="hidden"> 
                            </div>
                         </div>
                         
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Annual Spend</label>
                            <div class="flex items-center gap-2">
                                <div id="manual-budget-container" class="flex items-center">
                                    <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" value="$100,000" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-teal-400 font-bold text-right w-24 mono-numbers outline-none focus:border-blue-500 transition-all">
                                </div>
                                <label class="flex items-center gap-2 cursor-pointer bg-slate-900/50 border border-white/10 px-2 py-1 rounded-lg hover:border-slate-600 transition-all">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Sync Budget</span>
                                    <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                </label>
                            </div>
                         </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-infinity text-4xl text-amber-500"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Preservation Age</label>
                            <div id="card-preservation-val" class="text-3xl font-black text-amber-500 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div class="text-[9px] font-medium text-slate-500">Retire here & wealth stays flat (real $) to 100</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Funds Last Until</label>
                            <div id="card-runway-val" class="text-3xl font-black text-white mono-numbers tracking-tighter">--</div>
                        </div>
                        <div class="text-[9px] font-medium text-slate-500">Based on selected retirement age</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-glass-cheers"></i> Die With Zero Spend</label>
                            <div id="card-dwz-val" class="text-3xl font-black text-pink-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-dwz-sub" class="text-[9px] font-bold text-pink-500/60 uppercase mono-numbers leading-none">Starting at Retirement</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                     <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">MAGI Strategy</label>
                            <span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">Platinum Zone</span>
                        </div>
                        <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full">
                    </div>

                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Safety Net</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px]">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="1000" value="25000" class="input-range w-full">
                    </div>
                    
                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex items-center justify-between gap-4">
                        <button id="toggle-burndown-real" class="flex-grow px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                            Nominal $
                        </button>
                        <div class="text-right">
                            <span class="text-[8px] font-bold text-slate-500 uppercase tracking-widest block">Est. SNAP</span>
                            <span id="est-snap-indicator" class="text-lg font-black text-emerald-400 mono-numbers leading-none">$0</span>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-wrap items-center gap-3">
                    <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Draw Order:</span>
                    <div id="draw-priority-list" class="flex flex-wrap items-center gap-2"></div>
                </div>

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
                    document.getElementById('label-cash-reserve').textContent = math.toCurrency(parseInt(el.value));
                }
                if (id === 'input-top-retire-age') {
                    document.getElementById('label-top-retire-age').textContent = el.value;
                }
                if (id === 'toggle-budget-sync') {
                    const manualInput = document.getElementById('input-manual-budget');
                    if (manualInput) {
                        manualInput.disabled = el.checked;
                        manualInput.classList.toggle('opacity-40', el.checked);
                        manualInput.classList.toggle('cursor-not-allowed', el.checked);
                    }
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        const btnMinus = document.getElementById('btn-retire-minus');
        const btnPlus = document.getElementById('btn-retire-plus');
        const topRetireSlider = document.getElementById('input-top-retire-age');
        if (btnMinus && btnPlus && topRetireSlider) {
            btnMinus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) - 1; topRetireSlider.dispatchEvent(new Event('input')); };
            btnPlus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) + 1; topRetireSlider.dispatchEvent(new Event('input')); };
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

        // Advanced Logic Trace Handlers
        const debugAgeInput = document.getElementById('input-debug-age');
        if (debugAgeInput) {
            debugAgeInput.oninput = (e) => {
                const age = parseInt(e.target.value);
                if (age) {
                    traceAgeManuallySet = true;
                    burndown.showTrace(age);
                }
            };
        }

        const btnDebugMinus = document.getElementById('btn-debug-minus');
        const btnDebugPlus = document.getElementById('btn-debug-plus');
        if (btnDebugMinus && btnDebugPlus && debugAgeInput) {
            btnDebugMinus.onclick = () => {
                debugAgeInput.value = Math.max(30, parseInt(debugAgeInput.value || 40) - 1);
                debugAgeInput.dispatchEvent(new Event('input'));
            };
            btnDebugPlus.onclick = () => {
                debugAgeInput.value = Math.min(100, parseInt(debugAgeInput.value || 40) + 1);
                debugAgeInput.dispatchEvent(new Event('input'));
            };
        }

        // How It Works Toggle
        const btnDocToggle = document.getElementById('btn-toggle-engine-doc');
        const docPanel = document.getElementById('engine-logic-doc');
        if (btnDocToggle && docPanel) {
            btnDocToggle.onclick = () => {
                docPanel.classList.toggle('hidden');
                btnDocToggle.classList.toggle('text-white', !docPanel.classList.contains('hidden'));
                btnDocToggle.classList.toggle('bg-slate-700', !docPanel.classList.contains('hidden'));
            };
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
        
        const sync = (id, val, isCheck = false) => {
            const el = document.getElementById(id);
            if (el) {
                if (isCheck) el.checked = val; else el.value = val;
                el.dispatchEvent(new Event('input'));
            }
        };

        if (data) {
            sync('input-strategy-dial', data.strategyDial || 33);
            sync('toggle-budget-sync', data.useSync ?? true, true);
            sync('input-cash-reserve', data.cashReserve ?? 25000);
            const fallbackRetAge = window.currentData?.assumptions?.retirementAge || 65;
            sync('input-top-retire-age', data.retirementAge || fallbackRetAge);
            const manualInput = document.getElementById('input-manual-budget');
            if (data.manualBudget && manualInput) manualInput.value = math.toCurrency(data.manualBudget);
        }

        burndown.run();
    },

    scrape: () => ({
        priority: burndown.priorityOrder,
        strategyDial: parseInt(document.getElementById('input-strategy-dial')?.value || 33),
        cashReserve: parseInt(document.getElementById('input-cash-reserve')?.value || 25000), 
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        retirementAge: parseFloat(document.getElementById('input-top-retire-age')?.value || 65),
        isRealDollars
    }),

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false },
        'taxable': { label: 'Taxable Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true }, 
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Roth IRA'], isTaxable: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth Gains'], isTaxable: false },
        'crypto': { label: 'Crypto', short: 'Crypto', color: assetColors['Crypto'], isTaxable: true },
        'metals': { label: 'Metals', short: 'Metals', color: assetColors['Metals'], isTaxable: true },
        'hsa': { label: 'HSA', short: 'HSA', color: assetColors['HSA'], isTaxable: false }
    },

    showTrace: (age) => {
        const log = document.getElementById('burndown-trace-log');
        if (!log) return;
        if (simulationTrace[age]) {
            log.textContent = simulationTrace[age];
        } else {
            log.textContent = `No logic trace available for Age ${age}. Make sure the simulation has run for this age range.`;
        }
    },

    run: () => {
        const data = window.currentData;
        if (!data || !data.assumptions) return;

        const priorityList = document.getElementById('draw-priority-list');
        if (priorityList) {
            priorityList.innerHTML = burndown.priorityOrder.map((k, idx) => {
                const meta = burndown.assetMeta[k];
                const arrow = idx < burndown.priorityOrder.length - 1 ? `<i class="fas fa-chevron-right text-slate-700 text-[8px] mx-1"></i>` : '';
                return `
                    <div data-pk="${k}" class="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-[9px] font-bold cursor-move transition-colors flex items-center gap-2 drag-item" style="color: ${meta.color}">
                        <i class="fas fa-grip-vertical drag-handle text-slate-700 mr-1"></i>
                        ${meta.short}
                    </div>${arrow}`;
            }).join('');
            
            if (typeof Sortable !== 'undefined' && !burndown.sortable) {
                burndown.sortable = new Sortable(priorityList, {
                    animation: 150,
                    handle: '.drag-handle',
                    ghostClass: 'bg-slate-700/30',
                    onEnd: () => {
                        burndown.priorityOrder = Array.from(priorityList.querySelectorAll('.drag-item'))
                            .map(el => el.dataset.pk);
                        burndown.run(); 
                        if (window.debouncedAutoSave) window.debouncedAutoSave();
                    }
                });
            }
        }

        const config = burndown.scrape();
        lastUsedRetirementAge = config.retirementAge; 
        
        // Calculate the actual retirement year budget to show in the sync field
        if (config.useSync) {
            const currentAge = data.assumptions?.currentAge || 40;
            const retirementAge = config.retirementAge;
            const yrsToRetire = Math.max(0, retirementAge - currentAge);
            const inflation = (data.assumptions?.inflation || 3) / 100;
            const infFacRet = Math.pow(1 + inflation, yrsToRetire);
            
            const calculatedRetireBudget = (data.budget?.expenses || []).reduce((sum, exp) => {
                if (exp.remainsInRetirement === false) return sum;
                const base = math.fromCurrency(exp.annual);
                return sum + (exp.isFixed ? base : base * infFacRet);
            }, 0);
            
            const manualInput = document.getElementById('input-manual-budget');
            if (manualInput) {
                manualInput.value = math.toCurrency(calculatedRetireBudget);
                manualInput.disabled = true;
                manualInput.classList.add('opacity-40', 'cursor-not-allowed');
            }
        }

        simulationTrace = {}; 
        const results = burndown.simulateProjection(data, config);
        
        const runwayAge = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        const runwayEl = document.getElementById('card-runway-val');
        if (runwayEl) {
            runwayEl.textContent = runwayAge;
            runwayEl.className = firstInsolvencyAge ? "text-3xl font-black text-red-400 mono-numbers tracking-tighter" : "text-3xl font-black text-blue-400 mono-numbers tracking-tighter";
        }

        let preservationAge = "Never";
        const infRate = (data.assumptions.inflation || 3) / 100;
        for (let a = data.assumptions.currentAge; a <= 80; a++) {
            const tempConfig = { ...config, retirementAge: a };
            const tempResults = burndown.simulateProjection(data, tempConfig, true); 
            const retYear = tempResults.find(r => r.age === a);
            const endYear = tempResults[tempResults.length - 1]; 
            if (retYear && endYear && !endYear.isInsolvent) {
                const yrsDiff = 100 - a;
                const realEndNW = endYear.netWorth / Math.pow(1 + infRate, yrsDiff);
                if (realEndNW >= retYear.netWorth * 0.95) { preservationAge = a; break; }
            }
        }
        document.getElementById('card-preservation-val').textContent = preservationAge;

        // DIE WITH ZERO SEARCH
        let low = 0, high = 2500000, bestBudget = 0;
        for (let i = 0; i < 30; i++) {
            let mid = (low + high) / 2;
            const tempConfig = { ...config, manualBudget: mid, useSync: false }; 
            const sim = burndown.simulateProjection(data, tempConfig, true); 
            const last = sim[sim.length - 1];
            if (last.isInsolvent || last.netWorth < 100) high = mid; 
            else { low = mid; bestBudget = mid; }
        }

        const dwzValEl = document.getElementById('card-dwz-val');
        const dwzSubEl = document.getElementById('card-dwz-sub');
        if (dwzValEl && dwzSubEl) {
            // Respect real dollars toggle
            const displayBudget = bestBudget;
            dwzValEl.textContent = formatter.formatCurrency(displayBudget, true);
            dwzSubEl.textContent = `Max annual spend starting at age ${lastUsedRetirementAge}`;
        }

        if (results.length > 0) {
            const firstRetYear = results.find(r => r.age >= config.retirementAge) || results[0];
            const snapInd = document.getElementById('est-snap-indicator');
            if (snapInd) snapInd.textContent = `${formatter.formatCurrency((firstRetYear.snapBenefit || 0) / 12, 0)}`;
            
            const debugAgeInput = document.getElementById('input-debug-age');
            if (debugAgeInput && !traceAgeManuallySet) {
                debugAgeInput.value = data.assumptions.currentAge;
                burndown.showTrace(data.assumptions.currentAge);
            } else if (debugAgeInput) {
                burndown.showTrace(parseInt(debugAgeInput.value));
            }
        }

        const tableContainer = document.getElementById('burndown-table-container');
        if (tableContainer) tableContainer.innerHTML = burndown.renderTable(results);
    },

    simulateProjection: (data, configOverride = null, isSilent = false) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = {}, debts = [] } = data;
        const config = configOverride || burndown.scrape(); 
        const inflationRate = (assumptions.inflation || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const hhSize = benefits.hhSize || 1; 
        const currentYear = new Date().getFullYear();
        const dial = config.strategyDial, rAge = config.retirementAge, cashFloor = config.cashReserve;

        if (!isSilent) firstInsolvencyAge = null;

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
            
            let traceStr = `[ LOGIC TRACE: AGE ${age} (${year}) ]\n`;
            traceStr += `--------------------------------------\n`;

            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, assumptions.currentAge, assumptions);

            const totalMort = simRE.reduce((s, r) => s + (r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12)), 0);
            const totalOL = simOA.reduce((s, o) => s + (o.loan = Math.max(0, o.loan - (o.principalPayment || 0) * 12)), 0);
            const totalDebt = simDebts.reduce((s, d) => s + (d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12)), 0);

            let baseBudget = config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac;
            let factor = 1.0;
            if (isRet) {
                if (age < 50) factor = assumptions.slowGoFactor || 1.0; 
                else if (age < 80) factor = assumptions.midGoFactor || 0.9; 
                else factor = assumptions.noGoFactor || 0.8; 
            }
            let targetBudget = isRet ? baseBudget * factor : baseBudget;
            traceStr += `Target Spend: ${math.toCurrency(targetBudget)} (Factor: ${Math.round(factor*100)}%)\n`;

            let floorOrdIncome = 0, floorTotalIncome = 0, floorNetCash = 0, pretaxDed = 0; 
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const bonus = gross * (parseFloat(inc.bonusPct) / 100 || 0);
                const sourceGross = gross + bonus;
                const expenses = math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                const netSrc = sourceGross - expenses;
                const isTaxable = !inc.nonTaxableUntil || parseInt(inc.nonTaxableUntil) < year;
                if (isTaxable) { 
                    floorOrdIncome += netSrc; 
                    if (!isRet) pretaxDed += Math.min(sourceGross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac); 
                }
                floorTotalIncome += netSrc;
            });

            if (age >= assumptions.ssStartAge) {
                const ssGross = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const taxableSS = engine.calculateTaxableSocialSecurity(ssGross, Math.max(0, floorOrdIncome), filingStatus);
                floorOrdIncome += taxableSS; 
                floorTotalIncome += ssGross;
                traceStr += `Social Security: ${math.toCurrency(ssGross)} (Taxable: ${math.toCurrency(taxableSS)})\n`;
            }

            if (age >= 75) { let rmd = engine.calculateRMD(bal['401k'], age); bal['401k'] -= rmd; floorOrdIncome += rmd; floorTotalIncome += rmd; traceStr += `RMD Triggered: ${math.toCurrency(rmd)}\n`; }
            if (!isRet) {
                bal['401k'] += pretaxDed;
                (budget.savings || []).forEach(sav => {
                    const amt = math.fromCurrency(sav.annual) * infFac;
                    const keyMap = { 'Cash': 'cash', 'Taxable': 'taxable', 'Roth IRA': 'roth-basis', 'HSA': 'hsa', 'Crypto': 'crypto', 'Metals': 'metals' };
                    const key = keyMap[sav.type];
                    if (key) { bal[key] += amt; if (key === 'taxable' || key === 'crypto' || key === 'metals') bal[key + 'Basis'] += amt; }
                });
            }

            const baseTax = engine.calculateTax(Math.max(0, floorOrdIncome - pretaxDed), 0, filingStatus, assumptions.state, infFac);
            const baseSnap = engine.calculateSnapBenefit(OrdinaryIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
            floorNetCash = (floorTotalIncome - pretaxDed) - baseTax + baseSnap;
            traceStr += `Floor Net Cash: ${math.toCurrency(floorNetCash)} (Income - Tax + SNAP)\n`;
            
            let currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed), currentLtcgIncome = 0, currentDraws = {}, totalWithdrawn = 0;
            let deficit = targetBudget - floorNetCash;
            traceStr += `Deficit to solve: ${math.toCurrency(deficit)}\n`;

            const fpl = (16060 + (hhSize - 1) * 5650) * infFac;
            const medLim = fpl * (data.benefits?.isPregnant ? 1.95 : 1.38);
            const silverLim = fpl * 2.5;
            let magiTarget = dial <= 33 ? medLim * (dial / 33) : (dial <= 66 ? medLim + (silverLim - medLim) * ((dial - 33) / 33) : Math.max(silverLim, targetBudget * 1.5));
            traceStr += `MAGI Strategy Target: ${math.toCurrency(magiTarget)}\n`;

            for (let pass = 0; pass < 3; pass++) {
                if (deficit <= 5) break; 

                for (const pk of burndown.priorityOrder) {
                    if (deficit <= 5 && (currentOrdIncome + currentLtcgIncome) >= magiTarget) break;

                    let available = 0;
                    if (pk === 'heloc') available = (helocLimit > 0) ? Math.max(0, helocLimit - bal['heloc']) : 0;
                    else available = (pk === 'cash') ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0);
                    if (available <= 1) continue;

                    while (deficit > 5 && available > 1) {
                        let marginalRate = 0;
                        if (burndown.assetMeta[pk].isTaxable) {
                            const currentTotal = currentOrdIncome;
                            const bracketBoundary = (filingStatus === 'Married Filing Jointly' ? 96950 : 48475) * infFac;
                            const baseRate = currentTotal > bracketBoundary ? 0.22 : 0.12;
                            const stateRate = stateTaxRates[assumptions.state]?.rate || 0.04;
                            
                            if (pk === '401k') {
                                marginalRate = baseRate + stateRate;
                            } else {
                                const basisRatio = (bal[pk] > 0) ? (bal[pk+'Basis'] / bal[pk]) : 1;
                                const gainRatio = 1 - basisRatio;
                                marginalRate = gainRatio * (0.15 + stateRate);
                            }
                        }

                        let survivalNeed = Math.max(0, deficit);
                        let amountToTake = 0;
                        if (survivalNeed > 1) {
                            let grossNeeded = survivalNeed / (1 - marginalRate);
                            amountToTake = Math.min(grossNeeded, available);
                        } else {
                            break;
                        }

                        if (amountToTake <= 1) break;
                        if (pk === '401k' && age < 59.5) {
                            amountToTake = Math.min(amountToTake, Math.max(0, engine.calculateMaxSepp(bal['401k'], age) - (currentDraws['401k'] || 0)));
                        }
                        if (amountToTake <= 1) break;

                        traceStr += `> Pass ${pass+1}: Withdraw ${math.toCurrency(amountToTake)} from ${pk.toUpperCase()}\n`;

                        if (pk === 'heloc') bal['heloc'] += amountToTake; 
                        else {
                            if (bal[pk+'Basis'] !== undefined) {
                                const ratio = Math.min(1, amountToTake / bal[pk]);
                                bal[pk+'Basis'] -= bal[pk+'Basis'] * ratio;
                            }
                            bal[pk] -= amountToTake;
                        }

                        currentDraws[pk] = (currentDraws[pk] || 0) + amountToTake;
                        totalWithdrawn += amountToTake;
                        available -= amountToTake;

                        if (pk === '401k') currentOrdIncome += amountToTake;
                        else if (['taxable', 'crypto', 'metals'].includes(pk)) {
                            const gainRatio = (bal[pk] + amountToTake > 0) ? (1 - (bal[pk+'Basis'] / (bal[pk] + amountToTake))) : 1;
                            currentLtcgIncome += Math.max(0, amountToTake * gainRatio); 
                        }

                        const currentTaxEstimate = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                        const currentSnapEstimate = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
                        deficit = targetBudget - ((floorTotalIncome - pretaxDed) + totalWithdrawn - currentTaxEstimate + currentSnapEstimate);
                    }

                    if (deficit <= 5 && (currentOrdIncome + currentLtcgIncome) < magiTarget && available > 1) {
                        let harvestNeed = Math.max(0, magiTarget - (currentOrdIncome + currentLtcgIncome));
                        if (['401k', 'taxable', 'crypto', 'metals'].includes(pk)) {
                            let amountToHarvest = 0;
                            if (pk === '401k') amountToHarvest = Math.min(harvestNeed, available);
                            else {
                                const basisRatio = (bal[pk] > 0) ? (bal[pk+'Basis'] / bal[pk]) : 1;
                                const gainRatio = 1 - basisRatio;
                                if (gainRatio > 0.05) amountToHarvest = Math.min(harvestNeed / gainRatio, available);
                            }

                            if (amountToHarvest > 100) {
                                traceStr += `> Strategy: Harvest ${math.toCurrency(amountToHarvest)} from ${pk.toUpperCase()}\n`;
                                if (bal[pk+'Basis'] !== undefined) {
                                    bal[pk+'Basis'] -= bal[pk+'Basis'] * (amountToHarvest / bal[pk]);
                                }
                                bal[pk] -= amountToHarvest;
                                currentDraws[pk] = (currentDraws[pk] || 0) + amountToHarvest;
                                totalWithdrawn += amountToHarvest;
                                if (pk === '401k') currentOrdIncome += amountToHarvest;
                                else {
                                    const gainRatio = (bal[pk] + amountToHarvest > 0) ? (1 - (bal[pk+'Basis'] / (bal[pk] + amountToHarvest))) : 1;
                                    currentLtcgIncome += Math.max(0, amountToHarvest * gainRatio); 
                                }
                            }
                        }
                    }
                }
            }

            const finalTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
            const finalSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, assumptions.state, infFac) * 12;
            const finalNetCash = (floorTotalIncome - pretaxDed) + totalWithdrawn - finalTax + finalSnap;
            const magi = currentOrdIncome + currentLtcgIncome;
            const liquidAssets = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            const currentNW = (liquidAssets + realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0) + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0)) - (totalMort + totalOL + totalDebt + bal['heloc']);
            const isActuallyInsolvent = (targetBudget - finalNetCash) > 100 || currentNW < 100;

            traceStr += `Final MAGI: ${math.toCurrency(magi)}\n`;
            traceStr += `Final Net Cash: ${math.toCurrency(finalNetCash)}\n`;
            traceStr += `Final Net Worth: ${math.toCurrency(currentNW)}\n`;

            const yearRes = { 
                age, year, budget: targetBudget, magi, netWorth: currentNW, 
                isInsolvent: isActuallyInsolvent, 
                balances: { ...bal }, draws: currentDraws, snapBenefit: finalSnap,
                taxes: finalTax, liquid: liquidAssets, netCash: finalNetCash
            };
            yearRes.status = yearRes.isInsolvent ? 'INSOLVENT' : (age >= 65 ? 'Medicare' : (magi <= medLim ? 'Platinum' : (magi <= silverLim ? 'Silver' : 'Private')));
            if (!isSilent && yearRes.isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;
            
            if (!isSilent) simulationTrace[age] = traceStr;

            results.push(yearRes);

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
            : `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5"><th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th><th class="p-2 text-center !bg-[#1e293b]">Budget</th><th class="p-2 text-center !bg-[#1e293b]">MAGI</th><th class="p-2 text-center !bg-[#1e293b]">Health Status</th><th class="p-2 text-center !bg-[#1e293b]">SNAP</th>${burndown.priorityOrder.map(k => `<th class="p-2 text-center text-[9px] !bg-[#1e293b]" style="color:${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('')}<th class="p-2 text-center !bg-[#1e293b] text-teal-400">LIVE ON</th><th class="p-2 text-center !bg-[#1e293b]">Net Worth</th></tr>`;

        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const badgeClass = r.status === 'INSOLVENT' ? 'bg-red-600 text-white animate-pulse' : (r.status === 'Medicare' ? 'bg-slate-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Silver' ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white')));
            const isRetYear = r.age === lastUsedRetirementAge;
            const retBadge = isRetYear ? `<span class="block text-[7px] text-yellow-400 mt-0.5 tracking-tighter">RET YEAR</span>` : '';
            const rowClass = r.isInsolvent ? 'bg-red-500/20' : (isRetYear ? 'bg-blue-900/10' : '');

            if (isMobile) {
                if (r.age > 70 && r.age % 5 !== 0) return '';
                return `<tr class="border-b border-slate-800/50 text-[10px] ${rowClass}">
                    <td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-400' : ''}">${r.age}</td>
                    <td class="p-2 text-center"><div class="text-slate-400">${formatCell(r.budget / inf)}</div><div class="text-[8px] text-red-400/70 font-bold">+${formatCell(r.taxes / inf)} Tax</div></td>
                    <td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td>
                    <td class="p-2 text-center"><span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${badgeClass}">${r.status}</span></td>
                    <td class="p-2 text-center"><div class="font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</div><div class="text-[8px] text-emerald-600 font-bold">Liq: ${formatCell(r.liquid / inf)}</div></td>
                </tr>`;
            }

            const draws = burndown.priorityOrder.map(k => {
                const drawVal = (r.draws?.[k] || 0) / inf;
                const balVal = r.balances[k] / inf;
                const drawHtml = drawVal > 0 ? `<div class="font-black" style="color:${burndown.assetMeta[k]?.color}">${formatCell(drawVal)}</div>` : `<div class="text-slate-700">-</div>`;
                return `<td class="p-1.5 text-center border-l border-white/5 bg-black/10 hover:bg-black/20 transition-colors">
                    ${drawHtml}
                    <div class="text-[8px] text-slate-500 font-medium mt-0.5">${formatCell(balVal)}</div>
                </td>`;
            }).join('');
            
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[10px] ${rowClass}">
                <td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-500' : ''}">${r.age}</td>
                <td class="p-2 text-center text-slate-400 font-medium">${formatCell(r.budget / inf)}</td>
                <td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td>
                <td class="p-2 text-center"><span class="px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span>${retBadge}</td>
                <td class="p-2 text-center text-emerald-500 font-bold">${formatCell(r.snapBenefit / inf)}</td>
                ${draws}
                <td class="p-2 text-center font-black text-teal-400 border-l border-white/5 bg-teal-400/5">
                    ${formatCell(r.netCash / inf)}
                    <div class="text-[7px] text-slate-500 font-black uppercase tracking-tighter">AFTER TAX</div>
                </td>
                <td class="p-2 text-center font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</td>
            </tr>`;
        }).join('');

        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
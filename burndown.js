import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let simulationTrace = {}; 
let firstInsolvencyAge = null; 
let lastUsedRetirementAge = 65;

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
                                <span id="label-top-retire-age" class="text-blue-400 font-black mono-numbers text-sm w-6 text-center">65</span>
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
                burndown.updateTraceLog();
            };
        }
        
        if (btnDebugMinus && debugAgeInp) {
            btnDebugMinus.onclick = () => {
                const current = parseInt(debugAgeInp.value) || lastUsedRetirementAge;
                debugAgeInp.value = Math.max(18, current - 1);
                burndown.updateTraceLog();
            };
        }
        
        if (btnDebugPlus && debugAgeInp) {
            btnDebugPlus.onclick = () => {
                const current = parseInt(debugAgeInp.value) || lastUsedRetirementAge;
                debugAgeInp.value = Math.min(100, current + 1);
                burndown.updateTraceLog();
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
            sync('input-top-retire-age', data.retirementAge || 65);
            if (data.dieWithZero) document.getElementById('btn-dwz-toggle')?.classList.add('active');
            
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
        dieWithZero: document.getElementById('btn-dwz-toggle')?.classList.contains('active') ?? false,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        retirementAge: parseFloat(document.getElementById('input-top-retire-age')?.value || 65),
        isRealDollars
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
                    filter: '.fa-chevron-right', 
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
                if (sim[sim.length - 1].netWorth < 0) high = mid;
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
            // Set default if empty
            if (!debugAgeInp.value) {
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

        simulationTrace = {};
        firstInsolvencyAge = null;
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
            trace.push(`<span class="text-blue-400 font-bold">--- STARTING AGE ${age} (${year}) ---</span>`);

            const stockGrowth = math.getGrowthForAge('Stock', age, assumptions.currentAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, assumptions.currentAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, assumptions.currentAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, assumptions.currentAge, assumptions);

            const totalMort = simRE.reduce((s, r) => s + (r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12)), 0);
            const totalOL = simOA.reduce((s, o) => s + (o.loan = Math.max(0, o.loan - (o.principalPayment || 0) * 12)), 0);
            const totalDebt = simDebts.reduce((s, d) => s + (d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12)), 0);

            let baseBudget = overrideManualBudget ? overrideManualBudget * infFac : (config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.removedInRetirement) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac);
            
            let factor = 1.0;
            if (isRet) {
                if (age < 50) factor = assumptions.slowGoFactor || 1.1; 
                else if (age < 80) factor = assumptions.midGoFactor || 1.0; 
                else factor = assumptions.noGoFactor || 0.8; 
            }
            let targetBudget = isRet ? baseBudget * factor : baseBudget;
            trace.push(`Target Spending: ${math.toCurrency(targetBudget)} (Factor: ${Math.round(factor * 100)}%)`);

            const currentREVal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const currentNW = (bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0) + (currentREVal - totalMort)) - bal['heloc'] - totalOL - totalDebt;

            let ordInc = 0, netAvail = 0, pretaxDed = 0;
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const netSrc = (gross + gross * (parseFloat(inc.bonusPct) / 100 || 0)) - math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                if (inc.nonTaxableUntil && parseInt(inc.nonTaxableUntil) >= year) netAvail += netSrc;
                else { ordInc += netSrc; netAvail += netSrc; pretaxDed += Math.min(gross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac); }
            });

            // MAGI Clamping (Safety)
            ordInc = Math.max(0, ordInc);

            if (age >= assumptions.ssStartAge) {
                const ssGross = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const taxableSS = engine.calculateTaxableSocialSecurity(ssGross, Math.max(0, ordInc - pretaxDed), filingStatus);
                ordInc += taxableSS; netAvail += ssGross;
                trace.push(`Social Security: ${math.toCurrency(ssGross)} (${math.toCurrency(taxableSS)} taxable)`);
            }
            if (age >= 75) { const rmd = engine.calculateRMD(bal['401k'], age); bal['401k'] -= rmd; ordInc += rmd; netAvail += rmd; trace.push(`RMD Forced Draw: ${math.toCurrency(rmd)}`); }
            
            const hsaCont = budget.savings?.filter(s => s.type === 'HSA' && !(isRet && s.removedInRetirement)).reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
            ordInc = Math.max(0, ordInc - (pretaxDed + hsaCont));
            
            if (isRet && age < 59.5) {
                const projectedShortfall = targetBudget - (netAvail + bal['cash'] + bal['taxable']);
                if (projectedShortfall > 0 && bal['401k'] > 0) {
                    const seppMax = engine.calculateMaxSepp(bal['401k'], age);
                    const seppTake = Math.min(seppMax, projectedShortfall); 
                    if (seppTake > 0) {
                        bal['401k'] -= seppTake; ordInc += seppTake; netAvail += seppTake;
                        trace.push(`<span class="text-amber-400">⚠️ 72t Bridge Triggered: Withdrew ${math.toCurrency(seppTake)} (Max: ${math.toCurrency(seppMax)}) to cover shortfall.</span>`);
                    }
                }
            }

            trace.push(`Fixed Income & Deductions: ${math.toCurrency(netAvail)} cash, ${math.toCurrency(ordInc)} MAGI base`);
            
            const fpl = (16060 + (hhSize - 1) * 5650) * infFac, medLim = fpl * (data.benefits?.isPregnant ? 1.95 : 1.38), silverLim = fpl * 2.5;
            let magiTarget = dial <= 33 ? medLim * (dial / 33) : (dial <= 66 ? medLim + (silverLim - medLim) * ((dial - 33) / 33) : Math.max(silverLim, targetBudget));
            trace.push(`MAGI Strategy Target: ${math.toCurrency(magiTarget)} (FPL @ 100%: ${math.toCurrency(fpl)})`);

            let drawn = 0, ordIter = ordInc, yrDraws = {};
            // --- LOOP 1: HARVEST MAGI ---
            burndown.priorityOrder.forEach(pk => {
                const meta = burndown.assetMeta[pk];
                if (!meta.isMagi || pk === 'roth-earnings' || (magiTarget - ordIter) <= 0.01 || (bal[pk] || 0) <= 0) return;
                
                let availableInBucket = (pk === 'cash') ? Math.max(0, bal[pk] - cashFloor) : bal[pk];
                if (availableInBucket <= 0) return;

                const estimatedCashCap = (targetBudget + (ordIter * 0.25)) - (netAvail + drawn);
                if (estimatedCashCap <= 0.01) {
                    trace.push(`[Optimization] MAGI Harvesting capped for ${pk} - cash already covers needs.`);
                    return;
                }

                const gr = pk === 'taxable' ? Math.max(0.01, (bal['taxable'] - bal['taxableBasis']) / (bal['taxable'] || 1)) : 1;
                let take = Math.min(availableInBucket, (magiTarget - ordIter) / gr);
                take = Math.min(take, estimatedCashCap);
                if (take <= 0.01) return;

                bal[pk] -= take; if (pk === 'taxable') bal['taxableBasis'] -= (take * (1 - gr)); 
                drawn += take; ordIter += (take * gr); yrDraws[pk] = (yrDraws[pk] || 0) + take;
                trace.push(`MAGI Harvesting from ${pk}: sold ${math.toCurrency(take)} to get ${math.toCurrency(take * gr)} gain.`);
            });

            // --- LOOP 2: COVER CASH SHORTFALL (Iterative for Tax Sensitivity) ---
            // We run up to 3 passes to handle "tax spiraling" (where drawing money creates a tax bill that requires more drawing)
            for (let pass = 0; pass < 3; pass++) {
                let totalTax = engine.calculateTax(ordIter, 0, filingStatus, assumptions.state, infFac) + (ordIter > medLim && age < 65 && dial <= 66 ? ordIter * 0.085 : 0);
                const snapBen = engine.calculateSnapBenefit(ordIter, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, infFac) * 12;
                let shortfall = targetBudget + totalTax - (netAvail + drawn + snapBen);
                
                if (shortfall <= 0.01) break;
                
                trace.push(`Shortfall Detection (Pass ${pass + 1}): ${math.toCurrency(shortfall)}`);
                
                burndown.priorityOrder.forEach(pk => {
                    if (shortfall <= 0.01) return;
                    let availableLiquidity = 0;
                    if (pk === 'heloc') availableLiquidity = Math.max(0, helocLimit - bal['heloc']);
                    else if (pk === 'cash') availableLiquidity = Math.max(0, bal[pk] - cashFloor);
                    else availableLiquidity = (bal[pk] || 0);

                    if (availableLiquidity <= 0) return;

                    const take = Math.min(availableLiquidity, shortfall);
                    
                    let taxableAdd = 0;
                    if (pk === 'taxable') {
                        const gr = Math.max(0, (bal['taxable'] - bal['taxableBasis']) / (bal['taxable'] || 1));
                        bal['taxableBasis'] -= (take * (1 - gr));
                        taxableAdd = take * gr;
                    } else if (pk === '401k' || pk === 'pre-tax') {
                        taxableAdd = take;
                    } else if (['crypto', 'metals'].includes(pk)) {
                         const basisKey = pk + 'Basis';
                         const gr = Math.max(0, (bal[pk] - bal[basisKey]) / (bal[pk] || 1));
                         bal[basisKey] -= (take * (1 - gr));
                         taxableAdd = take * gr;
                    }
                    ordIter += taxableAdd;

                    if (pk === 'heloc') bal['heloc'] += take; else bal[pk] -= take;
                    drawn += take; shortfall -= take; yrDraws[pk] = (yrDraws[pk] || 0) + take;
                    trace.push(`Shortfall pull from ${pk}: ${math.toCurrency(take)}`);
                });
            }
            
            const finalTax = engine.calculateTax(ordIter, 0, filingStatus, assumptions.state, infFac) + (ordIter > medLim && age < 65 && dial <= 66 ? ordIter * 0.085 : 0);
            const finalSnap = engine.calculateSnapBenefit(ordIter, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, infFac) * 12;

            const magi = Math.max(0, ordIter);
            const liquidAssets = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            
            const yearRes = { 
                age, year, budget: targetBudget, magi, netWorth: currentNW, 
                isInsolvent: (netAvail + drawn + finalSnap - finalTax - targetBudget) < -1, 
                balances: { ...bal }, draws: yrDraws, snapBenefit: finalSnap,
                taxes: finalTax,
                liquid: liquidAssets
            };
            if (yearRes.isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;
            yearRes.status = yearRes.isInsolvent ? 'INSOLVENT' : (age >= 65 ? 'Medicare' : (magi <= medLim ? 'Platinum' : (magi <= silverLim ? 'Silver' : 'Private')));
            
            trace.push(`<span class="text-white">Year End MAGI: ${math.toCurrency(magi)}</span>`);
            trace.push(`<span class="text-red-400">Year End Taxes: ${math.toCurrency(finalTax)}</span>`);
            trace.push(`Year End Net Worth: ${math.toCurrency(currentNW)}`);
            simulationTrace[age] = trace;
            
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
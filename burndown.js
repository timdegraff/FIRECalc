
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
                <div class="card-container p-6 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
                    <div class="flex flex-wrap items-center justify-between gap-8 mb-6">
                        <div class="flex flex-col">
                            <h3 class="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                                <i class="fas fa-microchip text-purple-400"></i> Burndown Engine
                            </h3>
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Decumulation Logic Orchestrator</span>
                        </div>
                        <div class="flex items-center gap-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                             <div class="flex flex-col gap-1">
                                <label class="label-std text-slate-500 text-[9px]">Retirement Age <span id="label-top-retire-age" class="text-blue-400 font-black mono-numbers">65</span></label>
                                <div class="flex items-center gap-2">
                                    <button id="btn-retire-minus" class="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-[10px] font-black transition-all">-</button>
                                    <input type="range" id="input-top-retire-age" data-id="retirementAge" min="30" max="80" step="1" class="input-range w-24">
                                    <button id="btn-retire-plus" class="w-6 h-6 flex items-center justify-center bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-[10px] font-black transition-all">+</button>
                                </div>
                             </div>
                             <div class="w-[1px] h-8 bg-slate-700"></div>
                             <div class="flex flex-col gap-1">
                                <label class="label-std text-slate-500 text-[9px]">Budget Logic</label>
                                <div class="flex items-center gap-2">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                        <span class="text-[9px] text-slate-300 font-bold uppercase">Sync</span>
                                    </label>
                                    <div id="manual-budget-container" class="hidden">
                                        <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" value="$100,000" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-teal-400 font-black outline-none w-20 mono-numbers">
                                    </div>
                                </div>
                             </div>
                        </div>
                        <div class="h-10 w-[1px] bg-slate-700 mx-2 hidden lg:block"></div>
                        <div class="flex items-center gap-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <div class="flex flex-col gap-1.5 min-w-[280px]">
                                <div class="flex justify-between items-center w-full">
                                    <label class="label-std text-slate-500 text-[9px]">Burndown Dial (MAGI Target)</label>
                                    <span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span>
                                </div>
                                <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full">
                            </div>
                            <div class="w-[1px] h-10 bg-slate-700"></div>
                            <div class="flex flex-col items-center justify-center min-w-[90px]">
                                <span class="label-std text-slate-500 text-[8px]">Est. SNAP</span>
                                <span id="est-snap-indicator" class="text-emerald-400 font-black mono-numbers text-xs text-center w-full transition-all duration-300">$0/mo</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex flex-wrap items-center gap-4 border-t border-slate-700/50 pt-4">
                        <label class="flex items-center gap-4 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer group transition-all hover:bg-slate-900">
                            <input type="checkbox" id="toggle-rule-72t" class="w-4 h-4 accent-blue-500">
                            <div class="flex flex-col"><span class="label-std text-slate-300">Allow 72t Bridge</span><span class="text-[8px] text-slate-600 uppercase font-black">Auto-trigger</span></div>
                        </label>
                        <button id="btn-dwz-toggle" class="px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700 text-left transition-all hover:bg-slate-900 flex items-center gap-3 group min-w-[160px]">
                            <div class="w-4 h-4 rounded-full border-2 border-slate-700 flex items-center justify-center group-[.active]:border-rose-500 group-[.active]:bg-rose-500/20"><div class="w-1.5 h-1.5 rounded-full bg-slate-700 group-[.active]:bg-rose-500"></div></div>
                            <div class="flex flex-col"><span id="dwz-label" class="label-std text-slate-500 group-[.active]:text-rose-400">Die With Zero</span><span id="dwz-sub" class="text-[8px] text-slate-600 uppercase font-black">Target $0</span></div>
                        </button>
                        <button id="toggle-burndown-real" class="ml-auto px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl label-std font-black text-slate-400 hover:text-white transition-all flex items-center gap-2">
                            <i class="fas fa-calendar-alt"></i> Nominal Dollars
                        </button>
                    </div>
                    <div class="mt-4 pt-4 border-t border-slate-700/50">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="label-std text-slate-500 font-black">Draw Order Priority:</span>
                            <div id="draw-priority-list" class="flex flex-wrap gap-2"></div>
                        </div>
                    </div>
                </div>
                <div class="card-container p-6 bg-slate-900/50 rounded-3xl border border-slate-800 overflow-hidden shadow-inner">
                    <div id="burndown-table-container" class="max-h-[75vh] overflow-auto rounded-2xl border border-slate-800 mono-numbers"></div>
                </div>
            </div>
        `;
        burndown.attachListeners();
        burndown.run(); 
    },

    attachListeners: () => {
        ['input-strategy-dial', 'toggle-rule-72t', 'toggle-budget-sync', 'input-top-retire-age'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-strategy-dial') {
                    const lbl = document.getElementById('label-strategy-status');
                    const val = parseInt(el.value);
                    lbl.textContent = val <= 33 ? "Platinum Zone" : (val <= 66 ? "Silver CSR Zone" : "Standard / Budget Focus");
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

        const debugAgeInp = document.getElementById('input-debug-age');
        if (debugAgeInp) {
            debugAgeInp.oninput = () => {
                const age = parseInt(debugAgeInp.value);
                const log = document.getElementById('burndown-trace-log');
                if (log && simulationTrace[age]) {
                    log.innerHTML = simulationTrace[age].join('\n');
                } else if (log) {
                    log.innerHTML = `No data for age ${age || '??'}. Run simulation first.`;
                }
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
            manualInput.oninput = () => { burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
            manualInput.addEventListener('blur', (e) => { e.target.value = math.toCurrency(math.fromCurrency(e.target.value)); });
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
            sync('toggle-rule-72t', data.useSEPP || false, true);
            sync('toggle-budget-sync', data.useSync ?? true, true);
            sync('input-top-retire-age', data.retirementAge || 65);
            if (data.dieWithZero) document.getElementById('btn-dwz-toggle')?.classList.add('active');
            if (data.manualBudget) document.getElementById('input-manual-budget').value = math.toCurrency(data.manualBudget);
        }

        burndown.run();
    },

    scrape: () => ({
        priority: burndown.priorityOrder,
        strategyDial: parseInt(document.getElementById('input-strategy-dial')?.value || 33),
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        useSEPP: document.getElementById('toggle-rule-72t')?.checked ?? false,
        dieWithZero: document.getElementById('btn-dwz-toggle')?.classList.contains('active') ?? false,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        retirementAge: parseFloat(document.getElementById('input-top-retire-age')?.value || 65),
        isRealDollars
    }),

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false, isMagi: false },
        'taxable': { label: 'Taxable Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true, isMagi: true }, 
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Post-Tax (Roth)'], isTaxable: false, isMagi: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false, isMagi: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true, isMagi: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth Gains'], isTaxable: false, isMagi: true },
        'crypto': { label: 'Bitcoin', short: 'Bitcoin', color: assetColors['Crypto'], isTaxable: true, isMagi: true },
        'metals': { label: 'Metals', short: 'Metals', color: assetColors['Metals'], isTaxable: true, isMagi: true },
        'hsa': { label: 'HSA', short: 'HSA', color: assetColors['HSA'], isTaxable: false, isMagi: false }
    },

    run: () => {
        const data = window.currentData;
        if (!data || !data.assumptions) return;

        const priorityList = document.getElementById('draw-priority-list');
        if (priorityList && !priorityList.innerHTML) {
            burndown.priorityOrder = [...new Set(burndown.priorityOrder)];
            priorityList.innerHTML = burndown.priorityOrder.map(k => {
                const meta = burndown.assetMeta[k];
                return `<div data-pk="${k}" class="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[9px] font-bold cursor-move hover:border-slate-500" style="color: ${meta.color}">${meta.short}</div>`;
            }).join('');
            if (typeof Sortable !== 'undefined' && !burndown.sortable) {
                burndown.sortable = new Sortable(priorityList, {
                    animation: 150,
                    onEnd: () => {
                        burndown.priorityOrder = Array.from(priorityList.children).map(el => el.dataset.pk);
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
            if (snapInd) snapInd.textContent = `${formatter.formatCurrency((firstRetYear.snapBenefit || 0) / 12, 0)}/mo`;
        }

        const tableContainer = document.getElementById('burndown-table-container');
        if (tableContainer) tableContainer.innerHTML = burndown.renderTable(results);

        // Update Trace Log if focused age matches
        const debugAgeInp = document.getElementById('input-debug-age');
        const focusAge = parseInt(debugAgeInp?.value || results[0]?.age);
        const log = document.getElementById('burndown-trace-log');
        if (log && simulationTrace[focusAge]) {
            log.innerHTML = simulationTrace[focusAge].join('\n');
        }
    },

    simulateProjection: (data, overrideManualBudget = null) => {
        // Safe Destructuring with defaults
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = {}, debts = [] } = data;
        const config = burndown.scrape(); 
        const inflationRate = (assumptions.inflation || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const hhSize = benefits.hhSize || 1; 
        const currentYear = new Date().getFullYear();
        const dial = config.strategyDial, rAge = config.retirementAge;

        simulationTrace = {};
        firstInsolvencyAge = null;
        const bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-basis': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-earnings': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + Math.max(0, math.fromCurrency(i.value) - math.fromCurrency(i.costBasis)), 0),
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
            let targetBudget = isRet ? baseBudget * (age < 65 ? (assumptions.slowGoFactor || 1.1) : (age < 80 ? (assumptions.midGoFactor || 1.0) : (assumptions.noGoFactor || 0.85))) : baseBudget;
            trace.push(`Target Spending: ${math.toCurrency(targetBudget)}`);

            const currentREVal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const currentNW = (bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0) + (currentREVal - totalMort)) - bal['heloc'] - totalOL - totalDebt;

            let ordInc = 0, netAvail = 0, pretaxDed = 0;
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const netSrc = (gross + gross * (parseFloat(inc.bonusPct) / 100 || 0)) - math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                if (inc.nonTaxableUntil && parseInt(inc.nonTaxableUntil) >= year) netAvail += netSrc;
                else { ordInc += netSrc; netAvail += netSrc; pretaxDed += Math.min(gross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac); }
            });

            if (age >= assumptions.ssStartAge) {
                const ssGross = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const taxableSS = engine.calculateTaxableSocialSecurity(ssGross, ordInc - pretaxDed, filingStatus);
                ordInc += taxableSS; netAvail += ssGross;
                trace.push(`Social Security: ${math.toCurrency(ssGross)} (${math.toCurrency(taxableSS)} taxable)`);
            }
            if (age >= 75) { const rmd = engine.calculateRMD(bal['401k'], age); bal['401k'] -= rmd; ordInc += rmd; netAvail += rmd; trace.push(`RMD Forced Draw: ${math.toCurrency(rmd)}`); }
            
            const hsaCont = budget.savings?.filter(s => s.type === 'HSA' && !(isRet && s.removedInRetirement)).reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
            ordInc -= (pretaxDed + hsaCont);
            trace.push(`Fixed Income & Deductions: ${math.toCurrency(netAvail)} cash, ${math.toCurrency(ordInc)} MAGI base`);
            
            const fpl = (16060 + (hhSize - 1) * 5650) * infFac, medLim = fpl * (data.benefits?.isPregnant ? 1.95 : 1.38), silverLim = fpl * 2.5;
            let magiTarget = dial <= 33 ? medLim * (dial / 33) : (dial <= 66 ? medLim + (silverLim - medLim) * ((dial - 33) / 33) : Math.max(silverLim, targetBudget));
            trace.push(`MAGI Strategy Target: ${math.toCurrency(magiTarget)} (FPL @ 100%: ${math.toCurrency(fpl)})`);

            let drawn = 0, ordIter = ordInc, yrDraws = {};
            // --- LOOP 1: HARVEST MAGI ---
            burndown.priorityOrder.forEach(pk => {
                const meta = burndown.assetMeta[pk];
                if (!meta.isMagi || pk === 'roth-earnings' || (magiTarget - ordIter) <= 0.01 || (bal[pk] || 0) <= 0) return;
                
                // Buffer increased to 25% to avoid undershooting MAGI due to tax estimation errors
                const estimatedCashCap = (targetBudget + (ordIter * 0.25)) - (netAvail + drawn);
                if (estimatedCashCap <= 0.01) {
                    trace.push(`[Optimization] MAGI Harvesting capped for ${pk} - cash already covers needs.`);
                    return;
                }

                const gr = pk === 'taxable' ? Math.max(0.01, (bal['taxable'] - bal['taxableBasis']) / (bal['taxable'] || 1)) : 1;
                let take = Math.min(bal[pk], (magiTarget - ordIter) / gr);
                
                // Don't sell more total assets than the cash needed for the budget
                take = Math.min(take, estimatedCashCap);

                if (take <= 0.01) return;

                bal[pk] -= take; if (pk === 'taxable') bal['taxableBasis'] -= (take * (1 - gr)); 
                drawn += take; ordIter += (take * gr); yrDraws[pk] = (yrDraws[pk] || 0) + take;
                trace.push(`MAGI Harvesting from ${pk}: sold ${math.toCurrency(take)} to get ${math.toCurrency(take * gr)} gain.`);
            });

            // --- LOOP 2: COVER CASH SHORTFALL ---
            let totalTax = engine.calculateTax(ordIter, 0, filingStatus, assumptions.state, infFac) + (ordIter > medLim && age < 65 && dial <= 66 ? ordIter * 0.085 : 0);
            const snapBen = engine.calculateSnapBenefit(ordIter, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, infFac) * 12;
            
            let shortfall = targetBudget + totalTax - (netAvail + drawn + snapBen);
            
            if (snapBen > 0) trace.push(`<span class="text-emerald-400">SNAP Benefit covering: ${math.toCurrency(snapBen)}</span>`);

            if (shortfall > 0) {
                trace.push(`Cash Shortfall detected: ${math.toCurrency(shortfall)}`);
                burndown.priorityOrder.forEach(pk => {
                    if (shortfall <= 0.01) return;
                    
                    // FIXED: Ensure we don't take negative amounts if HELOC balance > limit
                    let availableLiquidity = 0;
                    if (pk === 'heloc') {
                        availableLiquidity = Math.max(0, helocLimit - bal['heloc']);
                    } else {
                        availableLiquidity = bal[pk] || 0;
                    }

                    const take = Math.min(availableLiquidity, shortfall);
                    if (take <= 0) return;

                    if (pk === 'heloc') bal['heloc'] += take; else bal[pk] -= take;
                    drawn += take; shortfall -= take; yrDraws[pk] = (yrDraws[pk] || 0) + take;
                    trace.push(`Shortfall pull from ${pk}: ${math.toCurrency(take)}`);
                });
            }

            const magi = ordIter;
            const yearRes = { age, year, budget: targetBudget, magi, netWorth: currentNW, isInsolvent: (netAvail + drawn + snapBen - totalTax - targetBudget) < -1, balances: { ...bal }, draws: yrDraws, snapBenefit: snapBen };
            if (yearRes.isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;
            yearRes.status = yearRes.isInsolvent ? 'INSOLVENT' : (age >= 65 ? 'Medicare' : (magi <= medLim ? 'Platinum' : (magi <= silverLim ? 'Silver' : 'Standard')));
            
            trace.push(`<span class="text-white">Year End MAGI: ${math.toCurrency(magi)}</span>`);
            trace.push(`<span class="text-red-400">Year End Taxes: ${math.toCurrency(totalTax)}</span>`);
            trace.push(`Year End Net Worth: ${math.toCurrency(currentNW)}`);
            simulationTrace[age] = trace;
            
            results.push(yearRes);

            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth)); 
            bal['crypto'] *= (1 + cryptoGrowth); 
            bal['metals'] *= (1 + metalsGrowth);
            if (bal['heloc'] > 0) bal['heloc'] *= (1 + 0.07); 
            bal['roth-earnings'] += (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth;
        }
        return results;
    },

    renderTable: (results) => {
        const isMobile = window.innerWidth < 768, infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const formatCell = (v) => isMobile ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(v) : formatter.formatCurrency(v, 0);
        
        const header = isMobile 
            ? `<tr class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20"><th class="p-2 w-10">Age</th><th class="p-2 text-right">Budget</th><th class="p-2 text-right">MAGI</th><th class="p-2 text-center">Status</th><th class="p-2 text-right">Net Worth</th></tr>`
            : `<tr class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20"><th class="p-2 w-10">Age</th><th class="p-2 text-right">Budget</th><th class="p-2 text-right">MAGI</th><th class="p-2 text-center">Status</th><th class="p-2 text-right">SNAP</th>${burndown.priorityOrder.map(k => `<th class="p-2 text-right text-[9px]" style="color:${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('')}<th class="p-2 text-right">Net Worth</th></tr>`;

        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const badgeClass = r.status === 'INSOLVENT' ? 'bg-red-600 text-white' : (r.status === 'Medicare' ? 'bg-slate-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'));
            const isRetYear = r.age === lastUsedRetirementAge;
            const retBadge = isRetYear ? `<span class="block text-[7px] text-yellow-400 mt-0.5 tracking-tighter">RET YEAR</span>` : '';

            if (isMobile) {
                return `<tr class="border-b border-slate-800/50 text-[10px] ${r.isInsolvent ? 'bg-red-900/10' : ''}"><td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-400' : ''}">${r.age}</td><td class="p-2 text-right text-slate-400">${formatCell(r.budget / inf)}</td><td class="p-2 text-right font-black text-white">${formatCell(r.magi / inf)}</td><td class="p-2 text-center"><span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${badgeClass}">${r.status}</span></td><td class="p-2 text-right font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</td></tr>`;
            }
            const draws = burndown.priorityOrder.map(k => `<td class="p-1.5 text-right border-l border-slate-800/50"><div class="${r.draws?.[k] > 0 ? 'font-bold' : 'text-slate-700'}" style="color:${r.draws?.[k] > 0 ? burndown.assetMeta[k]?.color : ''}">${formatCell((r.draws?.[k] || 0) / inf)}</div><div class="text-[8px] opacity-40">${formatCell(r.balances[k] / inf)}</div></td>`).join('');
            return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/10 text-[10px] ${r.isInsolvent ? 'bg-red-900/10' : (isRetYear ? 'bg-blue-900/10' : '')}"><td class="p-2 text-center font-bold ${r.isInsolvent ? 'text-red-400' : ''}">${r.age}</td><td class="p-2 text-right text-slate-400">${formatCell(r.budget / inf)}</td><td class="p-2 text-right font-black text-white">${formatCell(r.magi / inf)}</td><td class="p-2 text-center"><span class="px-2 py-1 rounded text-[9px] font-black uppercase ${badgeClass}">${r.status}</span>${retBadge}</td><td class="p-2 text-right text-emerald-500 font-bold">${formatCell(r.snapBenefit / inf)}</td>${draws}<td class="p-2 text-right font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</td></tr>`;
        }).join('');

        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};

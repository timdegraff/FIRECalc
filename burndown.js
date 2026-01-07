
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;
let simulationTrace = {}; // Stores year-by-year logic logs

export const burndown = {
    priorityOrder: ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa'],
    
    init: () => {
        const container = document.getElementById('tab-burndown');
        const viewContainer = document.getElementById('burndown-view-container');
        if (!viewContainer) return;

        viewContainer.innerHTML = `
            <div class="flex flex-col gap-4">
                <div class="card-container p-6 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
                    <div class="flex flex-wrap items-center justify-between gap-8 mb-6">
                        <div class="flex flex-col">
                            <h3 class="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                                <i class="fas fa-microchip text-purple-400"></i> Strategy Engine
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
                                        <input type="text" id="input-manual-budget" data-type="currency" value="$100,000" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] text-teal-400 font-black outline-none w-20 mono-numbers">
                                    </div>
                                </div>
                             </div>
                        </div>

                        <div class="h-10 w-[1px] bg-slate-700 mx-2 hidden lg:block"></div>
                        
                        <div class="flex items-center gap-6 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                            <div class="flex flex-col gap-1.5 min-w-[280px]">
                                <div class="flex justify-between items-center w-full">
                                    <label class="label-std text-slate-500 text-[9px]">Strategy Dial (MAGI Target)</label>
                                    <span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span>
                                </div>
                                <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full">
                                <div class="flex justify-between text-[7px] font-black text-slate-600 uppercase tracking-widest mt-0.5">
                                    <span title="Target $0 MAGI">0%</span>
                                    <span title="Max Benefits (138% FPL)" class="text-emerald-500/50">Platinum (33%)</span>
                                    <span title="Optimal Subsidies (250% FPL)" class="text-blue-500/50">Silver (66%)</span>
                                    <span title="Meet Budget regardless">Standard (100%)</span>
                                </div>
                            </div>
                            <div class="w-[1px] h-10 bg-slate-700"></div>
                            <div class="flex flex-col items-center justify-center min-w-[90px]">
                                <span class="label-std text-slate-500 text-[8px]">Est. SNAP</span>
                                <span id="est-snap-indicator" class="text-emerald-400 font-black mono-numbers text-xs text-center w-full">$0/mo</span>
                            </div>
                        </div>

                        <div id="swr-indicator" class="hidden flex flex-col items-center justify-center px-6 border-l border-slate-700">
                            <span class="label-std text-slate-500">Safe Draw (SWR)</span>
                            <span id="swr-value" class="text-teal-400 font-black mono-numbers text-xl">0%</span>
                        </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-4 border-t border-slate-700/50 pt-4">
                        <label class="flex items-center gap-4 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700 cursor-pointer group transition-all hover:bg-slate-900">
                            <input type="checkbox" id="toggle-rule-72t" class="w-4 h-4 accent-blue-500">
                            <div class="flex flex-col">
                                <span class="label-std text-slate-300 group-hover:text-blue-400 transition-colors">Allow 72t Bridge</span>
                                <span class="text-[8px] text-slate-600 uppercase font-black">Auto-trigger on shortfall</span>
                            </div>
                        </label>

                        <button id="btn-dwz-toggle" class="px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-700 text-left transition-all hover:bg-slate-900 flex items-center gap-3 group min-w-[160px]">
                            <div class="w-4 h-4 rounded-full border-2 border-slate-700 flex items-center justify-center group-[.active]:border-rose-500 group-[.active]:bg-rose-500/20">
                                <div class="w-1.5 h-1.5 rounded-full bg-slate-700 group-[.active]:bg-rose-500"></div>
                            </div>
                            <div class="flex flex-col">
                                <span id="dwz-label" class="label-std text-slate-500 group-[.active]:text-rose-400 transition-colors">Die With Zero</span>
                                <span id="dwz-sub" class="text-[8px] text-slate-600 uppercase font-black">Target $0 at Age 100</span>
                            </div>
                        </button>
                        
                        <button id="toggle-burndown-real" class="ml-auto px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl label-std font-black text-slate-400 hover:text-white transition-all flex items-center gap-2">
                            <i class="fas fa-calendar-alt"></i> Nominal Dollars
                        </button>
                    </div>
                    
                    <div class="mt-4 pt-4 border-t border-slate-700/50">
                        <div class="flex flex-wrap items-center gap-3">
                            <span class="label-std text-slate-500 font-black">Draw Order Priority:</span>
                            <button id="btn-optimize-priority" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[9px] font-bold uppercase tracking-widest transition-all"><i class="fas fa-magic mr-1"></i> Optimize</button>
                            <div class="w-[1px] h-4 bg-slate-700 mx-1"></div>
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
    },

    updateToggleStyle: (btn) => {
        if (!btn) return;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        btn.classList.toggle('border-blue-500/30', isRealDollars);
        btn.innerHTML = isRealDollars ? 
            '<i class="fas fa-sync-alt"></i> 2026 Dollars' : 
            '<i class="fas fa-calendar-alt"></i> Nominal Dollars';
    },

    attachListeners: () => {
        const triggers = ['input-strategy-dial', 'toggle-rule-72t', 'toggle-budget-sync', 'input-top-retire-age'];
        triggers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = (e) => {
                if (id === 'input-strategy-dial') {
                    const lbl = document.getElementById('label-strategy-status');
                    const val = parseInt(el.value);
                    if (val <= 33) lbl.textContent = "Platinum Zone";
                    else if (val <= 66) lbl.textContent = "Silver CSR Zone";
                    else lbl.textContent = "Standard / Budget Focus";
                }
                if (id === 'input-top-retire-age') {
                    const lbl = document.getElementById('label-top-retire-age');
                    if (lbl) lbl.textContent = el.value;
                }
                if (id === 'toggle-budget-sync') {
                    const manualContainer = document.getElementById('manual-budget-container');
                    if (manualContainer) manualContainer.classList.toggle('hidden', el.checked);
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        const debugAgeInp = document.getElementById('input-debug-age');
        if (debugAgeInp) {
            debugAgeInp.oninput = () => {
                const age = parseInt(debugAgeInp.value);
                const logEl = document.getElementById('burndown-trace-log');
                if (simulationTrace[age]) {
                    logEl.textContent = simulationTrace[age].join('\n');
                    logEl.scrollTop = 0;
                } else {
                    logEl.textContent = `No data for age ${age}. Ensure simulation has run.`;
                }
            };
        }

        const optBtn = document.getElementById('btn-optimize-priority');
        if (optBtn) {
            optBtn.onclick = () => {
                const dialVal = parseInt(document.getElementById('input-strategy-dial')?.value || 33);
                if (dialVal <= 66) {
                    // Benefit Focus: Kill taxable/cash first, preserve protected accounts
                    burndown.priorityOrder = ['taxable', 'cash', 'crypto', 'metals', 'roth-basis', 'hsa', 'heloc', '401k', 'roth-earnings'];
                } else {
                    // Standard: Preserve liquidity
                    burndown.priorityOrder = ['cash', 'taxable', 'roth-basis', 'crypto', 'metals', '401k', 'heloc', 'hsa', 'roth-earnings'];
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }
        
        const btnMinus = document.getElementById('btn-retire-minus');
        const btnPlus = document.getElementById('btn-retire-plus');
        const topRetireSlider = document.getElementById('input-top-retire-age');

        if (btnMinus && btnPlus && topRetireSlider) {
            btnMinus.onclick = () => { 
                topRetireSlider.value = parseInt(topRetireSlider.value) - 1; 
                topRetireSlider.dispatchEvent(new Event('input')); 
            };
            btnPlus.onclick = () => { 
                topRetireSlider.value = parseInt(topRetireSlider.value) + 1; 
                topRetireSlider.dispatchEvent(new Event('input')); 
            };
        }

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn) {
            dwzBtn.onclick = () => {
                dwzBtn.classList.toggle('active');
                const active = dwzBtn.classList.contains('active');
                const lblSub = document.getElementById('dwz-sub');
                if (lblSub) lblSub.textContent = active ? 'Target $0 at Age 100' : 'Hold Assets for Heirs';
                if (active) {
                    const syncToggle = document.getElementById('toggle-budget-sync');
                    if (syncToggle && syncToggle.checked) {
                        syncToggle.checked = false;
                        const manualContainer = document.getElementById('manual-budget-container');
                        if (manualContainer) manualContainer.classList.remove('hidden');
                    }
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const manualInput = document.getElementById('input-manual-budget');
        if (manualInput) {
            manualInput.oninput = () => { burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
            manualInput.addEventListener('blur', (e) => {
                const val = math.fromCurrency(e.target.value);
                e.target.value = math.toCurrency(val);
            });
            manualInput.addEventListener('focus', (e) => {
                const val = math.fromCurrency(e.target.value);
                e.target.value = val === 0 ? '' : val;
            });
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
    },

    load: (data) => {
        if (data?.priority) {
            burndown.priorityOrder = [...new Set(data.priority)];
        }
        isRealDollars = !!data?.isRealDollars;
        const config = [
            {id: 'input-strategy-dial', key: 'strategyDial', type: 'val'},
            {id: 'toggle-rule-72t', key: 'useSEPP', type: 'check'},
            {id: 'toggle-budget-sync', key: 'useSync', type: 'check'},
            {id: 'input-top-retire-age', key: 'retirementAge', type: 'val'}
        ];
        config.forEach(c => {
            const el = document.getElementById(c.id);
            if (el && data?.[c.key] !== undefined) {
                if (c.type === 'check') el.checked = data[c.key];
                else el.value = data[c.key];
                if (c.id === 'input-strategy-dial') {
                    const lbl = document.getElementById('label-strategy-status');
                    const val = parseInt(el.value);
                    if (val <= 33) lbl.textContent = "Platinum Zone";
                    else if (val <= 66) lbl.textContent = "Silver CSR Zone";
                    else lbl.textContent = "Standard / Budget Focus";
                }
                if (c.id === 'input-top-retire-age') {
                    const lbl = document.getElementById('label-top-retire-age');
                    if (lbl) lbl.textContent = el.value;
                }
            }
        });

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn && data?.dieWithZero !== undefined) {
            if (data.dieWithZero) dwzBtn.classList.add('active');
            else dwzBtn.classList.remove('active');
            const active = dwzBtn.classList.contains('active');
            const lblSub = document.getElementById('dwz-sub');
            if (lblSub) lblSub.textContent = active ? 'Target $0 at Age 100' : 'Hold Assets for Heirs';
        }

        const realBtn = document.getElementById('toggle-burndown-real');
        if (realBtn) {
            burndown.updateToggleStyle(realBtn);
        }
        
        const manualInput = document.getElementById('input-manual-budget');
        if (manualInput && data?.manualBudget !== undefined) {
            manualInput.value = math.toCurrency(data.manualBudget);
        }
    },

    scrape: () => {
        return { 
            priority: burndown.priorityOrder,
            strategyDial: parseInt(document.getElementById('input-strategy-dial')?.value || 33),
            useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
            useSEPP: document.getElementById('toggle-rule-72t')?.checked ?? false,
            dieWithZero: document.getElementById('btn-dwz-toggle')?.classList.contains('active') ?? false,
            manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
            retirementAge: parseFloat(document.getElementById('input-top-retire-age')?.value || 65),
            isRealDollars
        };
    },

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
        if (priorityList) {
            priorityList.innerHTML = burndown.priorityOrder.map(k => {
                const meta = burndown.assetMeta[k];
                if (!meta) return ''; 
                return `<div data-pk="${k}" class="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl label-std cursor-move flex items-center gap-2 group hover:border-slate-500 transition-all shadow-lg text-[10px]" style="color: ${meta.color}"><i class="fas fa-grip-vertical opacity-30 group-hover:opacity-100 transition-opacity"></i> ${meta.label}</div>`;
            }).join('');
            if (!burndown.sortable) {
                burndown.sortable = new Sortable(priorityList, { animation: 150, onEnd: () => { burndown.priorityOrder = Array.from(priorityList.children).map(el => el.dataset.pk); burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); } });
            }
        }

        const config = burndown.scrape();
        let results = [];

        if (config.dieWithZero) {
            let low = 0, high = 2000000, bestBudget = low;
            for (let i = 0; i < 25; i++) {
                let mid = (low + high) / 2;
                const simResults = burndown.simulateProjection(data, mid);
                const finalYear = simResults[simResults.length - 1];
                if (finalYear.netWorth < 0) high = mid;
                else { bestBudget = mid; low = mid; }
            }
            results = burndown.simulateProjection(data, bestBudget);
            const manualInp = document.getElementById('input-manual-budget');
            if (manualInp && document.activeElement !== manualInp) manualInp.value = math.toCurrency(bestBudget);
        } else {
            results = burndown.simulateProjection(data);
        }

        if (results.length > 0) {
            const rAge = parseFloat(document.getElementById('input-top-retire-age')?.value || data.assumptions.retirementAge || 65);
            const firstRetYear = results.find(r => r.age >= rAge) || results[0];
            const firstYearSnap = (firstRetYear.snapBenefit || 0) / 12;
            const snapInd = document.getElementById('est-snap-indicator');
            if (snapInd) snapInd.textContent = `${formatter.formatCurrency(firstYearSnap, 0)}/mo`;

            const debugAge = parseInt(document.getElementById('input-debug-age')?.value);
            if (debugAge && simulationTrace[debugAge]) {
                 document.getElementById('burndown-trace-log').textContent = simulationTrace[debugAge].join('\n');
            }
        }

        const tableContainer = document.getElementById('burndown-table-container');
        if (tableContainer) tableContainer.innerHTML = burndown.renderTable(results);
    },

    simulateProjection: (data, overrideManualBudget = null) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = [], debts = [] } = data;
        const stateConfig = burndown.scrape(); 
        const inflationRate = (assumptions.inflation || 3) / 100;
        const stockGrowth = (assumptions.stockGrowth || 8) / 100;
        const cryptoGrowth = (assumptions.cryptoGrowth || 10) / 100;
        const metalsGrowth = (assumptions.metalsGrowth || 6) / 100;
        const realEstateGrowth = (assumptions.realEstateGrowth || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const hhSize = benefits.hhSize || 1; 
        const currentYear = new Date().getFullYear();
        const dial = stateConfig.strategyDial || 33;
        const rAge = stateConfig.retirementAge || assumptions.retirementAge || 65;

        simulationTrace = {};

        const bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-basis': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + (math.fromCurrency(i.costBasis) || 0), 0),
            'roth-earnings': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + Math.max(0, math.fromCurrency(i.value) - (math.fromCurrency(i.costBasis) || 0)), 0),
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
        const duration = 100 - assumptions.currentAge;
        let seppAmt = 0, isSepp = false;

        for (let i = 0; i <= duration; i++) {
            const age = assumptions.currentAge + i, year = currentYear + i, isRet = age >= rAge;
            const yearRes = { age, year, draws: {}, seppAmount: 0, rmdAmount: 0, acaPremium: 0, snapBenefit: 0 };
            const infFac = Math.pow(1 + inflationRate, i);
            const trace = [`--- LOGIC TRACE FOR AGE ${age} (${year}) ---`];

            const amort = (arr, key) => arr.reduce((s, item) => { if (item[key] > 0) item[key] = Math.max(0, item[key] - (item.principalPayment || 0) * 12); return s + item[key]; }, 0);
            const totalMort = amort(simRE, 'mortgage'), totalOL = amort(simOA, 'loan'), totalDebt = amort(simDebts, 'balance');

            let baseBudget = 0;
            if (overrideManualBudget !== null) baseBudget = overrideManualBudget * infFac;
            else if (stateConfig.useSync) (budget.expenses || []).forEach(exp => { if (isRet && exp.removedInRetirement) return; const amt = math.fromCurrency(exp.annual); baseBudget += exp.isFixed ? amt : amt * infFac; });
            else baseBudget = (stateConfig.manualBudget || 100000) * infFac; 

            let targetBudget = baseBudget;
            if (isRet) targetBudget *= (age < 65 ? (assumptions.slowGoFactor || 1.1) : (age < 80 ? (assumptions.midGoFactor || 1.0) : (assumptions.noGoFactor || 0.85)));
            trace.push(`Target Budget (Inflation Adjusted): ${formatter.formatCurrency(targetBudget, 0)}`);

            const currentREVal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const currentNW = (bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0) + (currentREVal - totalMort)) - bal['heloc'] - totalOL - totalDebt;

            let ordInc = 0, ltcgInc = 0, netAvail = 0, pretaxDed = 0;
            const activeIncs = isRet ? income.filter(inc => inc.remainsInRetirement) : income;
            activeIncs.forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.
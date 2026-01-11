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
            <div class="flex flex-col gap-2.5">
                <div class="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-2 border-b border-white/5 pb-2">
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
                                <input type="number" id="input-retire-age-direct" data-id="retirementAge" class="bg-transparent border-none text-blue-400 font-black mono-numbers text-sm w-10 text-center outline-none" value="65">
                                <button id="btn-retire-plus" class="w-6 h-6 flex items-center justify-center hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"><i class="fas fa-plus text-[10px]"></i></button>
                                <input type="range" id="input-top-retire-age" data-id="retirementAge" min="18" max="72" step="1" class="hidden"> 
                            </div>
                         </div>
                         
                         <div class="flex flex-col items-end gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Annual Spend</label>
                            <div class="flex items-center gap-2">
                                <div id="manual-budget-container" class="flex items-center">
                                    <input type="text" id="input-manual-budget" data-type="currency" inputmode="decimal" class="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-sm text-teal-400 font-bold text-right w-24 mono-numbers outline-none focus:border-blue-500 transition-all">
                                </div>
                                <label class="flex items-center gap-2 cursor-pointer bg-slate-900/50 border border-white/10 px-2 py-1 rounded-lg hover:border-slate-600 transition-all">
                                    <span class="text-[9px] font-black text-slate-400 uppercase">Sync Budget</span>
                                    <input type="checkbox" id="toggle-budget-sync" checked class="w-3 h-3 accent-blue-500 rounded bg-slate-800 border-slate-600">
                                </label>
                            </div>
                         </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-infinity text-4xl text-amber-500"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Preservation Age</label>
                            <div id="card-preservation-val" class="text-3xl font-black text-amber-500 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-preservation-sub" class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter leading-none">FLAT REAL WEALTH UNTIL AGE 100</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-blue-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">SUSTAINABLE UNTIL THIS AGE</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-glass-cheers"></i> Die With Zero</label>
                            <div id="card-dwz-val" class="text-3xl font-black text-pink-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-dwz-sub" class="text-[9px] font-bold text-pink-500/60 uppercase tracking-tighter leading-none">MAX ANNUAL SPEND STARTING AT RETIREMENT</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center">
                        <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Draw Strategy</label>
                        <div id="persona-selector" class="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-lg border border-white/5">
                            <button data-mode="PLATINUM" class="py-2.5 rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-emerald-500/5">
                                <span class="text-emerald-400">138% FPL</span>
                                <span class="text-[9px] opacity-40">Handout Max</span>
                            </button>
                            <button data-mode="SILVER" class="py-2.5 rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-blue-500/5">
                                <span class="text-blue-400">200% FPL</span>
                                <span class="text-[9px] opacity-40">CSR Sweet Spot</span>
                            </button>
                            <button data-mode="UNCONSTRAINED" class="py-2.5 rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-slate-500/5">
                                <span class="text-slate-400">Pure Budget</span>
                                <span class="text-[9px] opacity-40">No strategy</span>
                            </button>
                        </div>
                    </div>

                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center">
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Safety Net</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px]">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="1000" value="25000" class="input-range w-full">
                    </div>
                    
                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 items-center justify-between gap-4 hidden md:flex">
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

                <div class="card-container bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
                    <div id="burndown-table-container" class="max-h-[60vh] overflow-auto mono-numbers"></div>
                </div>
            </div>
        `;
        burndown.attachListeners();
        burndown.run(); 
    },

    attachListeners: () => {
        ['toggle-budget-sync', 'input-top-retire-age', 'input-cash-reserve'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-cash-reserve') {
                    const lbl = document.getElementById('label-cash-reserve');
                    if (lbl) lbl.textContent = math.toCurrency(parseInt(el.value));
                }
                if (id === 'input-top-retire-age') {
                    let val = parseInt(el.value);
                    const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                    if (val < curAge) val = curAge;
                    if (val > 72) val = 72;
                    el.value = val;
                    const directInp = document.getElementById('input-retire-age-direct');
                    if (directInp) directInp.value = val;
                    
                    if (window.currentData?.assumptions) window.currentData.assumptions.retirementAge = val;
                    document.querySelectorAll('input[data-id="retirementAge"]').forEach(otherInput => {
                        if (otherInput !== el && otherInput !== directInp) otherInput.value = val;
                    });
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

        const directAgeInp = document.getElementById('input-retire-age-direct');
        if (directAgeInp) {
            directAgeInp.onchange = (e) => {
                let val = parseInt(e.target.value);
                const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                if (isNaN(val)) val = lastUsedRetirementAge;
                val = Math.max(curAge, Math.min(72, val));
                e.target.value = val;
                
                const slider = document.getElementById('input-top-retire-age');
                if (slider) slider.value = val;
                if (window.currentData?.assumptions) window.currentData.assumptions.retirementAge = val;
                document.querySelectorAll('input[data-id="retirementAge"]').forEach(otherInput => {
                    if (otherInput !== e.target && otherInput !== slider) otherInput.value = val;
                });
                
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
            directAgeInp.onkeydown = (e) => { if (e.key === 'Enter') e.target.blur(); };
        }

        const personaContainer = document.getElementById('persona-selector');
        if (personaContainer) {
            personaContainer.onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const mode = btn.dataset.mode;
                personaContainer.querySelectorAll('button').forEach(b => {
                    b.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'bg-blue-500/10', 'border-blue-500/30', 'bg-slate-500/10', 'border-slate-500/30');
                });
                const styleMap = {
                    'PLATINUM': 'bg-emerald-500/10 border-emerald-500/30',
                    'SILVER': 'bg-blue-500/10 border-blue-500/30',
                    'UNCONSTRAINED': 'bg-slate-500/10 border-slate-500/30'
                };
                btn.classList.add(...styleMap[mode].split(' '));
                personaContainer.dataset.value = mode;
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const btnMinus = document.getElementById('btn-retire-minus'), btnPlus = document.getElementById('btn-retire-plus'), topRetireSlider = document.getElementById('input-top-retire-age');
        if (btnMinus && btnPlus && topRetireSlider) {
            btnMinus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) - 1; topRetireSlider.dispatchEvent(new Event('input')); };
            btnPlus.onclick = () => { topRetireSlider.value = parseInt(topRetireSlider.value) + 1; topRetireSlider.dispatchEvent(new Event('input')); };
        }

        const realBtn = document.getElementById('toggle-burndown-real');
        if (realBtn) {
            realBtn.onclick = () => { isRealDollars = !isRealDollars; burndown.updateToggleStyle(realBtn); burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
        }

        const manualInput = document.getElementById('input-manual-budget');
        if (manualInput) { formatter.bindCurrencyEventListeners(manualInput); manualInput.oninput = () => { burndown.run(); if (window.debouncedAutoSave) window.debouncedAutoSave(); }; }

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

        const btnDebugMinus = document.getElementById('btn-debug-minus'), btnDebugPlus = document.getElementById('btn-debug-plus');
        if (btnDebugMinus && btnDebugPlus && debugAgeInput) {
            btnDebugMinus.onclick = () => { debugAgeInput.value = Math.max(18, parseInt(debugAgeInput.value || 40) - 1); debugAgeInput.dispatchEvent(new Event('input')); };
            btnDebugPlus.onclick = () => { debugAgeInput.value = Math.min(100, parseInt(debugAgeInput.value || 40) + 1); debugAgeInput.dispatchEvent(new Event('input')); };
        }
    },

    updateToggleStyle: (btn) => {
        if (!btn) return;
        const isMobile = window.innerWidth < 768;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        if (isMobile) btn.textContent = isRealDollars ? '2026 $' : 'Nominal $';
        else btn.innerHTML = isRealDollars ? '<i class="fas fa-sync-alt"></i> 2026 Dollars' : '<i class="fas fa-calendar-alt"></i> Nominal Dollars';
    },

    load: (data) => {
        if (data?.priority) burndown.priorityOrder = [...new Set(data.priority)];
        isRealDollars = !!data?.isRealDollars;
        const sync = (id, val, isCheck = false) => {
            const el = document.getElementById(id);
            if (el) { if (isCheck) el.checked = val; else el.value = val; el.dispatchEvent(new Event('input')); }
        };
        if (data) {
            const mode = data.strategyMode || 'PLATINUM', personaSelector = document.getElementById('persona-selector');
            if (personaSelector) { const btn = personaSelector.querySelector(`[data-mode="${mode}"]`); if (btn) btn.click(); }
            sync('toggle-budget-sync', data.useSync ?? true, true);
            sync('input-cash-reserve', data.cashReserve ?? 25000);
            
            const globalRetAge = window.currentData?.assumptions?.retirementAge || 65;
            sync('input-top-retire-age', Math.min(72, globalRetAge));
            
            const manualInput = document.getElementById('input-manual-budget');
            if (data.manualBudget && manualInput) manualInput.value = math.toCurrency(data.manualBudget);
        }
        burndown.run();
    },

    scrape: () => ({
        priority: burndown.priorityOrder,
        strategyMode: document.getElementById('persona-selector')?.dataset.value || 'PLATINUM',
        cashReserve: parseInt(document.getElementById('input-cash-reserve')?.value || 25000), 
        useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
        manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
        isRealDollars
    }),

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false },
        'taxable': { label: 'Taxable Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true }, 
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Roth IRA'], isTaxable: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth IRA'], isTaxable: false },
        'crypto': { label: 'Crypto', short: 'Crypto', color: assetColors['Crypto'], isTaxable: true },
        'metals': { label: 'Metals', short: 'Metals', color: assetColors['Metals'], isTaxable: true },
        'hsa': { label: 'HSA', short: 'HSA', color: assetColors['HSA'], isTaxable: false }
    },

    showTrace: (age) => {
        const log = document.getElementById('burndown-trace-log');
        if (!log) return;
        log.textContent = simulationTrace[age] || `No trace for Age ${age}. Ensure simulation has run.`;
    },

    run: () => {
        const data = window.currentData; if (!data || !data.assumptions || isNaN(data.assumptions.currentAge)) return;
        const priorityList = document.getElementById('draw-priority-list');
        if (priorityList) {
            priorityList.innerHTML = burndown.priorityOrder.map((k, idx) => {
                const meta = burndown.assetMeta[k], arrow = idx < burndown.priorityOrder.length - 1 ? `<i class="fas fa-chevron-right text-slate-700 text-[8px] mx-1"></i>` : '';
                return `<div data-pk="${k}" class="px-2 py-1 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-lg text-[9px] font-bold cursor-move transition-colors flex items-center gap-2 drag-item" style="color: ${meta.color}"><i class="fas fa-grip-vertical drag-handle text-slate-700 mr-1"></i>${meta.short}</div>${arrow}`;
            }).join('');
            if (typeof Sortable !== 'undefined' && !burndown.sortable) { burndown.sortable = new Sortable(priorityList, { animation: 150, handle: '.drag-handle', ghostClass: 'bg-slate-700/30', onEnd: () => { burndown.priorityOrder = Array.from(priorityList.querySelectorAll('.drag-item')).map(el => el.dataset.pk); burndown.run(); } }); }
        }
        
        lastUsedRetirementAge = parseFloat(data.assumptions.retirementAge) || 65;
        const slider = document.getElementById('input-top-retire-age');
        if (slider) { slider.value = lastUsedRetirementAge; const directInp = document.getElementById('input-retire-age-direct'); if (directInp) directInp.value = lastUsedRetirementAge; }

        const config = burndown.scrape();
        
        // Auto-Calc Budget Logic (Visual Update only)
        let calculatedBaseAnnual = 0;
        if (config.useSync) {
            calculatedBaseAnnual = (data.budget?.expenses || []).reduce((sum, exp) => {
                if (exp.remainsInRetirement === false) return sum;
                return sum + math.fromCurrency(exp.annual);
            }, 0);
            const budgetInput = document.getElementById('input-manual-budget');
            if (budgetInput) {
                budgetInput.value = math.toCurrency(calculatedBaseAnnual);
                formatter.updateZeroState(budgetInput);
            }
        }

        simulationTrace = {}; 
        const results = burndown.simulateProjection(data, config);
        
        if (!results || results.length === 0) return;

        // Trace Pre-population logic
        const debugAgeInp = document.getElementById('input-debug-age');
        if (debugAgeInp && !traceAgeManuallySet) {
            debugAgeInp.value = lastUsedRetirementAge;
        }

        const runwayAge = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        if (document.getElementById('card-runway-val')) { 
            document.getElementById('card-runway-val').textContent = runwayAge; 
            document.getElementById('card-runway-val').className = firstInsolvencyAge ? "text-3xl font-black text-red-400 mono-numbers tracking-tighter" : "text-3xl font-black text-blue-400 mono-numbers tracking-tighter"; 
        }

        let preservationAge = "--";
        const startNWReal = results[0].netWorth;
        const infRate = (data.assumptions.inflation || 3) / 100;
        for (let i = 0; i < results.length; i++) {
            const realNW = results[i].netWorth / Math.pow(1 + infRate, i);
            if (realNW < startNWReal * 0.99) {
                preservationAge = results[i].age;
                break;
            }
            if (i === results.length - 1) preservationAge = "100+";
        }
        if (document.getElementById('card-preservation-val')) document.getElementById('card-preservation-val').textContent = preservationAge;

        let dwzSpend = 0;
        let low = 10000, high = 1000000;
        for (let j = 0; j < 15; j++) {
            let mid = (low + high) / 2;
            const testConfig = { ...config, useSync: false, manualBudget: mid };
            const testRes = burndown.simulateProjection(data, testConfig, true);
            const isTestSolvent = !testRes.some(r => r.isInsolvent);
            if (isTestSolvent) { dwzSpend = mid; low = mid; } else { high = mid; }
        }
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(dwzSpend);

        const firstRetYear = results.find(r => r.age >= lastUsedRetirementAge) || results[0];
        if (document.getElementById('est-snap-indicator')) document.getElementById('est-snap-indicator').textContent = `${formatter.formatCurrency((firstRetYear.snapBenefit || 0) / 12, 0)}`;
        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(results);
        
        const debugAgeVal = parseInt(document.getElementById('input-debug-age')?.value);
        if (debugAgeVal) burndown.showTrace(debugAgeVal);
        else burndown.showTrace(results[0].age);
    },

    simulateProjection: (data, configOverride = null, isSilent = false) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = {}, debts = [], stockOptions = [] } = data;
        if (!assumptions || isNaN(parseFloat(assumptions.currentAge))) return [];
        
        const config = configOverride || burndown.scrape();
        const inflationRate = (assumptions.inflation || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const currentYear = new Date().getFullYear();
        const persona = config.strategyMode;
        const rAge = parseFloat(assumptions.retirementAge) || 65;
        const cashFloor = config.cashReserve;
        
        if (!isSilent) firstInsolvencyAge = null;

        const helocInterestRate = (helocs?.length > 0) ? (parseFloat(helocs[0].rate) || assumptions.helocRate || 7) / 100 : (assumptions.helocRate || 7) / 100;
        const stateMeta = stateTaxRates[assumptions.state] || { rate: 0.04, expanded: true };
        
        const optionsEquity = stockOptions.reduce((s, x) => {
            const shares = parseFloat(x.shares) || 0;
            const strike = math.fromCurrency(x.strikePrice);
            const fmv = math.fromCurrency(x.currentPrice);
            return s + Math.max(0, (fmv - strike) * shares);
        }, 0);

        const bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0) + optionsEquity,
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0) + stockOptions.reduce((s, x) => s + (math.fromCurrency(x.strikePrice) * (parseFloat(x.shares) || 0)), 0),
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
        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0);
        const results = [];
        const startAge = Math.max(18, Math.min(72, Math.floor(parseFloat(assumptions.currentAge) || 40)));

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = currentYear + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            
            let trace = `--- AGE ${age} (${year}) ---\n`;
            const dependCount = (benefits.dependents || []).filter(d => {
                const birthYear = parseInt(d.birthYear);
                return !isNaN(birthYear) && (birthYear + 19) >= year;
            }).length;
            const currentHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + dependCount;
            const fpl100 = math.getFPL(currentHhSize, assumptions.state) * infFac;
            trace += `Household Size: ${currentHhSize} (FPL 100%: ${math.toCurrency(fpl100)})\n`;

            const stockGrowth = math.getGrowthForAge('Stock', age, startAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, startAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, startAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, startAge, assumptions);

            simRE.forEach(r => r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12));
            simDebts.forEach(d => d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12));

            let baseBudget = config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac;
            baseBudget += (bal['heloc'] * helocInterestRate);
            
            let factor = isRet ? (age < 60 ? (assumptions.phaseGo1 ?? 1.0) : (age < 80 ? (assumptions.phaseGo2 ?? 0.9) : (assumptions.phaseGo3 ?? 0.8))) : 1.0;
            const targetBudget = baseBudget * factor;
            
            const budgetBaseNominal = config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + math.fromCurrency(exp.annual), 0) : config.manualBudget;
            trace += `Target Budget: ${math.toCurrency(targetBudget)} (Base: ${math.toCurrency(budgetBaseNominal)} * ${inflationRate*100}% inflation ^ ${i} years)\n`;

            let floorOrdIncome = 0, floorTotalIncome = 0, floorUntaxedMAGI = 0, pretaxDed = 0;
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i), bonus = gross * (parseFloat(inc.bonusPct) / 100 || 0), sourceGross = gross + bonus, netSrc = sourceGross - (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1));
                const unt = parseInt(inc.nonTaxableUntil);
                if (isNaN(unt) || year >= unt) { floorOrdIncome += netSrc; if (!isRet) pretaxDed += Math.min(sourceGross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac); }
                floorTotalIncome += netSrc;
            });

            if (age >= assumptions.ssStartAge) { 
                const ssGross = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const taxableSS = engine.calculateTaxableSocialSecurity(ssGross, Math.max(0, floorOrdIncome), filingStatus); 
                floorOrdIncome += taxableSS; 
                floorTotalIncome += ssGross; 
                floorUntaxedMAGI += (ssGross - taxableSS); 
                trace += `Social Security: ${math.toCurrency(ssGross)} (${math.toCurrency(taxableSS)} taxable)\n`;
            }

            if (age >= 75) { 
                let rmd = engine.calculateRMD(bal['401k'], age); 
                bal['401k'] -= rmd; 
                floorOrdIncome += rmd; 
                floorTotalIncome += rmd; 
                trace += `Forced RMD: ${math.toCurrency(rmd)}\n`;
            }

            if (!isRet) { 
                bal['401k'] += pretaxDed; 
                (budget.savings || []).forEach(sav => { 
                    const amt = math.fromCurrency(sav.annual) * infFac, keyMap = { 'Cash': 'cash', 'Taxable': 'taxable', 'Roth IRA': 'roth-basis', 'HSA': 'hsa', 'Crypto': 'crypto', 'Metals': 'metals' }, key = keyMap[sav.type]; 
                    if (key) { bal[key] += amt; if (['taxable', 'crypto', 'metals'].includes(key)) bal[key + 'Basis'] += amt; } 
                }); 
            }

            const liquidForSnap = bal['cash'] + bal['taxable'] + bal['crypto'];
            const baseSnap = engine.calculateSnapBenefit(floorOrdIncome, 0, liquidForSnap, currentHhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, benefits.childSupportPaid, benefits.depCare, benefits.medicalExps, assumptions.state, infFac) * 12;
            
            let currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed), currentLtcgIncome = 0, totalWithdrawn = 0, currentDraws = {};
            let floorNetCash = (floorTotalIncome - pretaxDed) - engine.calculateTax(currentOrdIncome, 0, filingStatus, assumptions.state, infFac) + baseSnap;
            let deficit = targetBudget - floorNetCash;
            const magiTarget = persona === 'PLATINUM' ? fpl100 * 1.38 : (persona === 'SILVER' ? fpl100 * 2.50 : 0);
            
            trace += `Initial Shortfall: ${math.toCurrency(deficit)} (Budget ${math.toCurrency(targetBudget)} - Inflow ${math.toCurrency(floorNetCash)})\n`;

            let effectiveOrder = [...burndown.priorityOrder];
            if (persona !== 'UNCONSTRAINED') {
                const zeroMAGIBuckets = ['cash', 'roth-basis', 'heloc', 'hsa'];
                effectiveOrder = [
                    ...zeroMAGIBuckets.filter(b => effectiveOrder.includes(b)),
                    ...effectiveOrder.filter(b => !zeroMAGIBuckets.includes(b))
                ];
                trace += `Strategy Active: Prioritizing non-MAGI sources (Cash/Roth Basis/HELOC).\n`;
            }

            for (let pass = 0; pass < 3; pass++) {
                if (deficit <= 5 && (persona === 'UNCONSTRAINED' || (currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI) >= magiTarget)) break;
                
                for (const pk of effectiveOrder) {
                    if (deficit <= 5 && (currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI) >= magiTarget) break;
                    
                    let available = (pk === 'heloc') ? Math.max(0, helocLimit - bal['heloc']) : (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0));
                    if (available <= 1) continue;

                    let currentBasisRatio = 1;
                    if (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) {
                        currentBasisRatio = bal[pk+'Basis'] / bal[pk];
                    }

                    if (persona !== 'UNCONSTRAINED' && pk !== 'roth-basis' && pk !== 'cash' && pk !== 'heloc') {
                        if ((currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI) >= magiTarget && deficit <= 5) continue;
                    }

                    let marginalRate = 0; 
                    if (burndown.assetMeta[pk].isTaxable) {
                        const bracketBoundary = (filingStatus === 'Married Filing Jointly' ? 96950 : 48475) * infFac;
                        const baseRate = currentOrdIncome > bracketBoundary ? 0.22 : 0.12;
                        const stateRate = stateMeta.rate;
                        if (pk === '401k') marginalRate = baseRate + stateRate; 
                        else marginalRate = (1 - currentBasisRatio) * (0.15 + stateRate); 
                    }

                    const curMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                    const curRatio = curMAGI / fpl100;
                    let healthCost = 0;
                    if (!stateMeta.expanded && curRatio < 1.0) healthCost = 13200 * infFac; 
                    else if (curRatio > 4.0) healthCost = 13200 * infFac; 
                    else if (curRatio > 1.38) healthCost = curMAGI * (0.021 + (curRatio - 1) * 0.074 / 3);
                    
                    let pull = Math.min(Math.max(0, (deficit + (healthCost/12)) / (1 - marginalRate)), available);
                    let strategyPull = false;

                    if (pull <= 1 && curMAGI < magiTarget && pk !== 'heloc' && persona !== 'UNCONSTRAINED') {
                        pull = Math.min(available, (magiTarget - curMAGI) / (pk === '401k' ? 1 : Math.max(0.1, (1 - currentBasisRatio))));
                        strategyPull = true;
                    }

                    if (pull <= 1) continue;
                    if (pk === '401k' && age < 59.5) {
                        const seppLimit = engine.calculateMaxSepp(bal['401k'], age);
                        pull = Math.min(pull, Math.max(0, seppLimit - (currentDraws['401k'] || 0)));
                    }

                    if (pull <= 1) continue;

                    if (pk === 'heloc') bal['heloc'] += pull; 
                    else { 
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk])); 
                        bal[pk] -= pull; 
                    }
                    
                    currentDraws[pk] = (currentDraws[pk] || 0) + pull; 
                    totalWithdrawn += pull; 
                    
                    if (pk === '401k') currentOrdIncome += pull; 
                    else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgIncome += (pull * (1 - currentBasisRatio));
                    
                    const curTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                    const newMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                    const newRatio = newMAGI / fpl100;
                    if (!stateMeta.expanded && newRatio < 1.0) healthCost = 13200 * infFac; 
                    else if (newRatio > 4.0) healthCost = 13200 * infFac; 
                    else if (newRatio > 1.38) healthCost = newMAGI * (0.021 + (newRatio - 1) * 0.074 / 3);

                    const curSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, 0, bal['cash']+bal['taxable']+bal['crypto'], currentHhSize, benefits.shelterCosts||700, benefits.hasSUA!==false, benefits.isDisabled!==false, benefits.childSupportPaid, benefits.depCare, benefits.medicalExps, assumptions.state, infFac)*12;
                    deficit = targetBudget + healthCost - ((floorTotalIncome - pretaxDed) + totalWithdrawn - curTax + curSnap);
                    
                    const reason = strategyPull ? `(Harvesting for strategy: Target ${math.toCurrency(magiTarget)})` : `(Deficit Coverage)`;
                    trace += `Pulled ${math.toCurrency(pull)} from ${pk} ${reason}. New deficit: ${math.toCurrency(deficit)}\n`;
                }
            }

            const finalTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
            const healthMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
            const finalRatio = healthMAGI / fpl100;
            let finalHealthCost = 0;
            if (!stateMeta.expanded && finalRatio < 1.0) finalHealthCost = 13200 * infFac;
            else if (finalRatio > 4.0) finalHealthCost = 13200 * infFac;
            else if (finalRatio > 1.38) finalHealthCost = healthMAGI * (0.021 + (finalRatio - 1) * 0.074 / 3);

            const finalSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, 0, bal['cash']+bal['taxable']+bal['crypto'], currentHhSize, benefits.shelterCosts||700, benefits.hasSUA!==false, benefits.isDisabled!==false, benefits.childSupportPaid, benefits.depCare, benefits.medicalExps, assumptions.state, infFac)*12;
            const netCash = (floorTotalIncome - pretaxDed) + totalWithdrawn + finalSnap - finalTax - finalHealthCost;
            
            let surplus = Math.max(0, netCash - targetBudget);
            if (isRet && surplus > 100) { 
                if (bal['heloc'] > 0) { 
                    const rep = Math.min(bal['heloc'], surplus); 
                    bal['heloc'] -= rep; 
                    surplus -= rep; 
                } 
                if (surplus > 100) {
                    bal['cash'] += surplus; 
                    trace += `Recycled surplus ${math.toCurrency(surplus)} back to Cash.\n`;
                }
            }

            const liquidAssets = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            const reValTotal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const debtTotal = simRE.reduce((s,r)=>s+r.mortgage,0) + simDebts.reduce((s,d)=>s+d.balance,0) + bal['heloc'];
            const currentNW = (liquidAssets + reValTotal + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0)) - debtTotal;
            
            const isInsolvent = (targetBudget - netCash) > 500 || currentNW < 100;
            
            let status = 'Private';
            if (isInsolvent) status = 'INSOLVENT';
            else if (age >= 65) status = 'Medicare';
            else if (!stateMeta.expanded && finalRatio < 1.0) status = 'No Cov';
            else if (finalRatio <= 1.38 && stateMeta.expanded) status = 'Platinum';
            else if (finalRatio <= 2.5) status = 'Silver';
            else if (finalRatio > 4.0) status = 'Private';

            trace += `Final MAGI: ${math.toCurrency(healthMAGI)} (${Math.round(finalRatio * 100)}% FPL)\n`;
            trace += `Status: ${status} | Health Cost: ${math.toCurrency(finalHealthCost)}\n`;
            
            // Year-end Growth trace
            trace += `Market Performance:\n`;
            const grow = (name, b, rate) => {
                const gain = b * rate;
                trace += `  - ${name}: ${math.toCurrency(b)} -> ${math.toCurrency(b + gain)} (+${(rate*100).toFixed(1)}%)\n`;
            };
            if (bal['taxable'] > 0) grow('Brokerage', bal['taxable'], stockGrowth);
            if (bal['401k'] > 0) grow('Pre-Tax', bal['401k'], stockGrowth);
            if (bal['crypto'] > 0) grow('Crypto', bal['crypto'], cryptoGrowth);
            
            trace += `Ending Net Worth: ${math.toCurrency(currentNW)}\n`;
            trace += `  Sum: ${math.toCurrency(liquidAssets)} (Liquid) + ${math.toCurrency(reValTotal)} (RE) - ${math.toCurrency(debtTotal)} (Debt) = ${math.toCurrency(currentNW)}\n`;

            if (!isSilent) simulationTrace[age] = trace;
            results.push({ age, year, budget: targetBudget, magi: healthMAGI, netWorth: currentNW, isInsolvent, balances: { ...bal }, draws: currentDraws, snapBenefit: finalSnap, taxes: finalTax, liquid: liquidAssets, netCash, status });
            if (!isSilent && isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;

            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth)); 
            bal['crypto'] *= (1 + cryptoGrowth); 
            bal['metals'] *= (1 + metalsGrowth); 
            bal['roth-earnings'] += (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth;
        }
        return results;
    },

    renderTable: (results) => {
        const isMobile = window.innerWidth < 768, infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const formatCell = (v) => isMobile ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 0 }).format(v) : formatter.formatCurrency(v, 0);
        const header = isMobile ? `<tr class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20"><th class="p-2 w-10 text-center">Age</th><th class="p-2 text-center">Spend</th><th class="p-2 text-center">MAGI</th><th class="p-2 text-center">Health</th><th class="p-2 text-center">Net Worth</th></tr>` : `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5"><th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th><th class="p-2 text-center !bg-[#1e293b]">Budget</th><th class="p-2 text-center !bg-[#1e293b]">MAGI</th><th class="p-2 text-center !bg-[#1e293b]">Health Plan</th><th class="p-2 text-center !bg-[#1e293b]">SNAP</th>${burndown.priorityOrder.map(k => `<th class="p-2 text-center text-[9px] !bg-[#1e293b]" style="color:${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('')}<th class="p-2 text-center !bg-[#1e293b] text-teal-400">LIVE ON</th><th class="p-2 text-center !bg-[#1e293b]">Net Worth</th></tr>`;
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            let badgeClass = 'bg-slate-700 text-slate-400';
            if (r.status === 'INSOLVENT') badgeClass = 'bg-red-600 text-white animate-pulse';
            else if (r.status === 'No Cov') badgeClass = 'bg-slate-800 text-slate-500';
            else if (r.status === 'Medicare') badgeClass = 'bg-slate-600 text-white';
            else if (r.status === 'Platinum') badgeClass = 'bg-emerald-500 text-white';
            else if (r.status === 'Silver') badgeClass = 'bg-blue-500 text-white';
            else if (r.status === 'Private') badgeClass = 'bg-slate-700 text-slate-300';
            
            const isRetireYear = r.age === Math.floor(lastUsedRetirementAge);
            const rowClass = r.isInsolvent ? 'bg-red-500/20' : (isRetireYear ? 'bg-blue-900/10' : '');
            const retireMarker = isRetireYear ? `<div class="text-[7px] text-amber-500/80 font-black leading-none mt-0.5 tracking-tighter">RETIRE</div>` : '';

            if (isMobile) { 
                if (r.age > 70 && r.age % 5 !== 0) return ''; 
                return `<tr class="border-b border-slate-800/50 text-[10px] ${rowClass}"><td class="p-2 text-center font-bold"><div>${r.age}</div>${retireMarker}</td><td class="p-2 text-center"><div class="text-slate-400">${formatCell(r.budget / inf)}</div><div class="text-[8px] text-red-400/70 font-bold">+${formatCell(r.taxes / inf)} Tax</div></td><td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td><td class="p-2 text-center"><span class="px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${badgeClass}">${r.status}</span></td><td class="p-2 text-center"><div class="font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</div></td></tr>`; 
            }
            const draws = burndown.priorityOrder.map(k => { const drawVal = (r.draws?.[k] || 0) / inf, balVal = r.balances[k] / inf; return `<td class="p-1.5 text-center border-l border-white/5 bg-black/10">${drawVal > 0 ? `<div class="font-black" style="color:${burndown.assetMeta[k]?.color}">${formatCell(drawVal)}</div>` : `<div class="text-slate-700">-</div>`}<div class="text-[8px] text-slate-500 font-medium mt-0.5">${formatCell(balVal)}</div></td>`; }).join('');
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[10px] ${rowClass}"><td class="p-2 text-center font-bold"><div>${r.age}</div>${retireMarker}</td><td class="p-2 text-center text-slate-400 font-medium">${formatCell(r.budget / inf)}</td><td class="p-2 text-center font-black text-white">${formatCell(r.magi / inf)}</td><td class="p-2 text-center"><span class="px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span></td><td class="p-2 text-center text-emerald-500 font-bold">${formatCell(r.snapBenefit / inf)}</td>${draws}<td class="p-2 text-center font-black text-teal-400 border-l border-white/5 bg-teal-400/5">${formatCell(r.netCash / inf)}</td><td class="p-2 text-center font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth / inf)}</td></tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
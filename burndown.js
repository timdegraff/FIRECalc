
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
                        <div id="card-preservation-sub" class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter leading-none">MAINTAINS FLAT REAL WEALTH AT $0K BUDGET UNTIL THIS AGE</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-blue-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">SUSTAINS $0K BUDGET IN 2026 DOLLARS UNTIL THIS AGE</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-glass-cheers"></i> Die With Zero</label>
                            <div id="card-dwz-val" class="text-3xl font-black text-pink-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-dwz-sub" class="text-[9px] font-bold text-pink-500/60 uppercase tracking-tighter leading-none">MAX SUSTAINABLE SPEND OF $0K STARTING AT RETIREMENT</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <!-- Card 1: Draw Strategy -->
                     <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">Draw Strategy</label>
                        <div id="persona-selector" class="grid grid-cols-3 gap-1 p-1 bg-black/40 rounded-lg border border-white/5 h-full">
                            <button data-mode="PLATINUM" class="rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-emerald-500/5">
                                <span class="text-emerald-400">138%</span>
                                <span class="text-[8px] opacity-40">Plat</span>
                            </button>
                            <button data-mode="SILVER" class="rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-blue-500/5">
                                <span class="text-blue-400">200%</span>
                                <span class="text-[8px] opacity-40">Silver</span>
                            </button>
                            <button data-mode="RAW" class="rounded-md text-xs font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-slate-500/5">
                                <span class="text-slate-400">Strict</span>
                                <span class="text-[8px] opacity-40">Iron Fist</span>
                            </button>
                        </div>
                    </div>

                    <!-- Card 2: Cash Safety Net -->
                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <div class="flex justify-between items-center mb-4">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Safety Net</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px]">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="1000" value="25000" class="input-range w-full">
                    </div>
                    
                    <!-- Card 3: SNAP & Nominal Control -->
                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-between h-28">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Est. SNAP</label>
                                <div id="est-snap-indicator" class="text-2xl font-black text-emerald-400 mono-numbers leading-none mt-0.5">$0</div>
                            </div>
                            <button id="toggle-burndown-real" class="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[8px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                                Nominal $
                            </button>
                        </div>
                        
                        <div class="space-y-1">
                            <div class="flex justify-between items-center">
                                <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Preserve Min</label>
                                <span id="label-snap-preserve" class="text-emerald-400 font-black mono-numbers text-[9px]">$0</span>
                            </div>
                            <input type="range" id="input-snap-preserve" min="0" max="2000" step="50" value="0" class="input-range w-full accent-emerald-500">
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
        ['toggle-budget-sync', 'input-top-retire-age', 'input-cash-reserve', 'input-snap-preserve'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.oninput = () => {
                if (id === 'input-cash-reserve') {
                    const lbl = document.getElementById('label-cash-reserve');
                    if (lbl) lbl.textContent = math.toCurrency(parseInt(el.value));
                }
                if (id === 'input-snap-preserve') {
                    const lbl = document.getElementById('label-snap-preserve');
                    if (lbl) lbl.textContent = parseInt(el.value) > 0 ? `${math.toCurrency(parseInt(el.value))}/mo` : '$0 (Ignore)';
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
                    'RAW': 'bg-slate-500/10 border-slate-500/30'
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
        else btn.textContent = isRealDollars ? '2026 $' : 'Nominal $';
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
            sync('input-snap-preserve', data.snapPreserve ?? 0);
            
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
        snapPreserve: parseInt(document.getElementById('input-snap-preserve')?.value || 0), 
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
        
        // Base Annual Budget (Real 2026 Dollars)
        let testedRealBudget = 0;
        if (config.useSync) {
            testedRealBudget = (data.budget?.expenses || []).reduce((sum, exp) => {
                if (exp.remainsInRetirement === false) return sum;
                return sum + math.fromCurrency(exp.annual);
            }, 0);
            const budgetInput = document.getElementById('input-manual-budget');
            if (budgetInput) {
                budgetInput.value = math.toCurrency(testedRealBudget);
                formatter.updateZeroState(budgetInput);
            }
        } else {
            testedRealBudget = config.manualBudget;
        }

        const compactBudgetStr = math.toSmartCompactCurrency(testedRealBudget);

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
        if (document.getElementById('card-runway-sub')) {
            document.getElementById('card-runway-sub').textContent = `SUSTAINS ${compactBudgetStr} BUDGET IN 2026 DOLLARS UNTIL THIS AGE`;
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
        if (document.getElementById('card-preservation-sub')) {
            document.getElementById('card-preservation-sub').textContent = `MAINTAINS FLAT REAL WEALTH AT ${compactBudgetStr} BUDGET UNTIL THIS AGE`;
        }

        // FIXED SOLVER: Solve target spend ONLY during retirement years.
        let dwzSpend = 0;
        let low = 10000, high = 1000000;
        for (let j = 0; j < 15; j++) {
            let mid = (low + high) / 2;
            const testRes = burndown.simulateProjection(data, { ...config, useSync: false }, true, mid);
            const isTestSolvent = !testRes.some(r => r.isInsolvent);
            if (isTestSolvent) { dwzSpend = mid; low = mid; } else { high = mid; }
        }
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(dwzSpend);
        if (document.getElementById('card-dwz-sub')) {
            document.getElementById('card-dwz-sub').textContent = `MAX SUSTAINABLE SPEND OF ${math.toSmartCompactCurrency(dwzSpend)} STARTING AT RETIREMENT`;
        }

        const firstRetYear = results.find(r => r.age >= lastUsedRetirementAge) || results[0];
        if (document.getElementById('est-snap-indicator')) document.getElementById('est-snap-indicator').textContent = `${formatter.formatCurrency((firstRetYear.snapBenefit || 0) / 12, 0)}`;
        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(results);
        
        const debugAgeVal = parseInt(document.getElementById('input-debug-age')?.value);
        if (debugAgeVal) burndown.showTrace(debugAgeVal);
        else burndown.showTrace(results[0].age);
    },

    simulateProjection: (data, configOverride = null, isSilent = false, retirementSpendOverride = null) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = {}, debts = [], stockOptions = [] } = data;
        if (!assumptions || isNaN(parseFloat(assumptions.currentAge))) return [];
        
        const config = configOverride || burndown.scrape();
        const inflationRate = (assumptions.inflation || 3) / 100;
        const filingStatus = assumptions.filingStatus || 'Single';
        const currentYear = new Date().getFullYear();
        const persona = config.strategyMode;
        const rAge = parseFloat(assumptions.retirementAge) || 65;
        const cashFloor = config.cashReserve;
        const snapPreserveMonthly = config.snapPreserve || 0;
        const waiveAssetTest = benefits.waiveAssetTest || false;
        
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
            
            if (!isSilent) {
                trace += `Household Size: ${currentHhSize} (FPL 100%: ${math.toCurrency(fpl100)})\n`;
                if (bal['heloc'] > 0) trace += `HELOC Balance Start: ${math.toCurrency(bal['heloc'])}\n`;
            }

            const stockGrowth = math.getGrowthForAge('Stock', age, startAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, startAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, startAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, startAge, assumptions);

            simRE.forEach(r => r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12));
            simDebts.forEach(d => d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12));

            // Budget Selection: If retired and override exists, use it. Otherwise use synced/manual config.
            let baseBudget = 100000;
            if (isRet && retirementSpendOverride !== null) {
                baseBudget = retirementSpendOverride * infFac;
            } else {
                baseBudget = config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac;
            }
            
            // Add HELOC Interest to required Budget
            const helocInterestDue = bal['heloc'] * helocInterestRate;
            if (bal['heloc'] > 0 && !isSilent) trace += `HELOC Interest: ${math.toCurrency(helocInterestDue)} (Added to budget)\n`;
            baseBudget += helocInterestDue;
            
            let factor = isRet ? (age < 60 ? (assumptions.phaseGo1 ?? 1.0) : (age < 80 ? (assumptions.phaseGo2 ?? 0.9) : (assumptions.phaseGo3 ?? 0.8))) : 1.0;
            const targetBudget = baseBudget * factor;
            
            const budgetBaseNominal = (isRet && retirementSpendOverride !== null) ? retirementSpendOverride : (config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + math.fromCurrency(exp.annual), 0) : config.manualBudget);
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
            
            let currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed), currentLtcgIncome = 0, totalWithdrawn = 0, currentDraws = {};
            // Taxes on the floor income
            let baseTaxes = engine.calculateTax(currentOrdIncome, 0, filingStatus, assumptions.state, infFac);
            
            // Calculate deficit based on what we have (Net Income) vs what we need (Target Budget)
            // Note: We deliberately exclude SNAP here for IRON FIST mode, treating it as a bonus later.
            // For other modes, we keep the original logic, but for now let's unify basic deficit calc.
            let currentNetCheck = (floorTotalIncome - pretaxDed) - baseTaxes;
            let deficit = targetBudget - currentNetCheck; 
            
            trace += `Initial Shortfall: ${math.toCurrency(deficit)} (Budget - Net Income)\n`;

            // Separate HELOC from liquid assets
            let liquidOrder = burndown.priorityOrder.filter(k => k !== 'heloc');
            
            // --- IRON FIST LOGIC (RAW) ---
            if (persona === 'RAW') {
                if (!isSilent) trace += `Strategy: IRON FIST (Strict Draw Order, Gross Up Withdrawals)\n`;
                
                for (const pk of liquidOrder) {
                    if (deficit <= 5) break;
                    
                    let available = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0));
                    if (available <= 1) continue;

                    let currentBasisRatio = 1;
                    if (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) {
                        currentBasisRatio = bal[pk+'Basis'] / bal[pk];
                    }

                    // Calculate withdrawal needed to cover deficit AFTER taxes
                    let grossPull = 0;
                    let taxGenerated = 0;
                    let hitSeppLimit = false;
                    let seppCap = 0;

                    if (burndown.assetMeta[pk].isTaxable) {
                        const bracketBoundary = (filingStatus === 'Married Filing Jointly' ? 96950 : 48475) * infFac;
                        const baseRate = currentOrdIncome > bracketBoundary ? 0.22 : 0.12;
                        const stateRate = stateTaxRates[assumptions.state]?.rate || 0.0425;
                        
                        let marginalRate = 0;
                        if (pk === '401k') marginalRate = baseRate + stateRate; 
                        else marginalRate = (1 - currentBasisRatio) * (0.15 + stateRate); 
                        
                        // Gross Up Formula: Need / (1 - Rate)
                        grossPull = Math.min(available, deficit / (1 - marginalRate));
                        
                        // Check SEPP
                        if (pk === '401k' && age < 59.5) {
                            const seppLimit = engine.calculateMaxSepp(bal['401k'], age);
                            const alreadyDrawn = currentDraws['401k'] || 0;
                            const availableSepp = Math.max(0, seppLimit - alreadyDrawn);
                            
                            if (grossPull > availableSepp) {
                                grossPull = availableSepp;
                                hitSeppLimit = true;
                                seppCap = seppLimit;
                            }
                        }

                        // Re-calculate tax exact for this chunk
                        taxGenerated = grossPull * marginalRate;
                    } else {
                        // Tax Free
                        grossPull = Math.min(available, deficit);
                    }

                    if (grossPull <= 1) {
                         // Optional: Log if we were blocked by SEPP even if we had money
                         if (pk === '401k' && hitSeppLimit && available > 1 && !isSilent) {
                             trace += `  -> Skipped 401k: Capped by 72(t) Limit of ${math.toCurrency(seppCap)} (Available: ${math.toCurrency(available)})\n`;
                         }
                         continue;
                    }

                    // Execute Pull
                    if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (grossPull / bal[pk])); 
                    bal[pk] -= grossPull;
                    
                    currentDraws[pk] = (currentDraws[pk] || 0) + grossPull;
                    totalWithdrawn += grossPull;

                    // Update Income Trackers
                    if (pk === '401k') currentOrdIncome += grossPull; 
                    else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgIncome += (grossPull * (1 - currentBasisRatio));

                    // Reduce Deficit by the NET amount (Gross - Tax)
                    const netReceived = grossPull - taxGenerated;
                    deficit -= netReceived;

                    if (!isSilent) {
                        let msg = `  -> Withdrew ${math.toCurrency(grossPull)} from ${pk}.`;
                        if (burndown.assetMeta[pk].isTaxable) msg += ` (Tax Est: ${math.toCurrency(taxGenerated)})`;
                        if (hitSeppLimit) msg += ` [CAPPED by 72(t): ${math.toCurrency(seppCap)}]`;
                        trace += msg + `\n`;
                    }
                }
            } 
            else {
                // --- PLATINUM / SILVER LOGIC (Original Multi-Pass) ---
                
                const magiTarget = persona === 'PLATINUM' ? fpl100 * 1.37 : (persona === 'SILVER' ? fpl100 * 2.48 : 0);
                
                // Re-organize order: Strategy Compliant Buckets first
                if (persona !== 'UNCONSTRAINED') {
                    const zeroMAGIBuckets = ['cash', 'roth-basis', 'hsa'];
                    liquidOrder = [
                        ...zeroMAGIBuckets.filter(b => liquidOrder.includes(b)),
                        ...liquidOrder.filter(b => !zeroMAGIBuckets.includes(b))
                    ];
                }

                const initialSnap = engine.calculateSnapBenefit(floorOrdIncome, 0, liquidForSnap, currentHhSize, (benefits.shelterCosts || 700) * infFac, benefits.hasSUA !== false, benefits.isDisabled !== false, (benefits.childSupportPaid || 0) * infFac, (benefits.depCare || 0) * infFac, (benefits.medicalExps || 0) * infFac, assumptions.state, infFac, waiveAssetTest) * 12;
                currentNetCheck += initialSnap; // Add initial SNAP to check
                deficit = targetBudget - currentNetCheck; // Reset deficit with SNAP

                // ... [Logic for Pass 1 and Pass 2 remains similar but abbreviated for this specific update request context] ... 
                // For brevity in this update, I will trust the user keeps the previous logic or I re-insert the previous logic if I need to modify it.
                // Re-inserting the previous Pass 1 & 2 logic to ensure no regression for Platinum/Silver users.
                
                // --- PASS 1: STRATEGY (Respect MAGI Limits) ---
                for (const pk of liquidOrder) {
                    if (deficit <= 5) break; 
                    let available = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0));
                    if (available <= 1) continue;
                    let currentBasisRatio = 1;
                    if (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) currentBasisRatio = bal[pk+'Basis'] / bal[pk];
                    if (persona !== 'UNCONSTRAINED' && pk !== 'roth-basis' && pk !== 'cash') {
                        if ((currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI) >= magiTarget) continue;
                    }
                    let marginalRate = 0; 
                    if (burndown.assetMeta[pk].isTaxable) {
                        const bracketBoundary = (filingStatus === 'Married Filing Jointly' ? 96950 : 48475) * infFac;
                        const baseRate = currentOrdIncome > bracketBoundary ? 0.22 : 0.12;
                        const stateRate = stateTaxRates[assumptions.state]?.rate || 0.0425;
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
                    if (persona !== 'UNCONSTRAINED' && pk !== 'cash' && pk !== 'roth-basis') {
                        const room = Math.max(0, magiTarget - curMAGI);
                        const grossPullAllowed = room / (pk === '401k' ? 1 : Math.max(0.1, (1 - currentBasisRatio)));
                        pull = Math.min(pull, grossPullAllowed);
                    }
                    if (pull <= 1) continue;
                    if (pk === '401k' && age < 59.5) {
                        const seppLimit = engine.calculateMaxSepp(bal['401k'], age);
                        pull = Math.min(pull, Math.max(0, seppLimit - (currentDraws['401k'] || 0)));
                    }
                    if (pull <= 1) continue;
                    if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk])); 
                    bal[pk] -= pull; 
                    currentDraws[pk] = (currentDraws[pk] || 0) + pull; 
                    totalWithdrawn += pull; 
                    if (pk === '401k') currentOrdIncome += pull; 
                    else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgIncome += (pull * (1 - currentBasisRatio));
                    const curTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                    const curSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, 0, bal['cash']+bal['taxable']+bal['crypto'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, waiveAssetTest)*12;
                    const newMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                    const newRatio = newMAGI / fpl100;
                    if (!stateMeta.expanded && newRatio < 1.0) healthCost = 13200 * infFac; 
                    else if (newRatio > 4.0) healthCost = 13200 * infFac; 
                    else if (newRatio > 1.38) healthCost = newMAGI * (0.021 + (newRatio - 1) * 0.074 / 3);
                    deficit = targetBudget + healthCost - ((floorTotalIncome - pretaxDed) + totalWithdrawn - curTax + curSnap);
                }

                // --- PASS 2: SURVIVAL (Ignore MAGI, Avoid HELOC) ---
                if (deficit > 5) {
                    if (!isSilent) trace += `!!! SURVIVAL MODE !!! Strategy failed to meet budget. Blowing MAGI caps to avoid debt.\n`;
                    for (const pk of liquidOrder) {
                        if (deficit <= 5) break;
                        let available = (pk === 'cash' ? Math.max(0, bal[pk] - 1000) : (bal[pk] || 0)); // Leave $1k dust
                        if (available <= 1) continue;
                        let currentBasisRatio = 1;
                        if (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) currentBasisRatio = bal[pk+'Basis'] / bal[pk];
                        let marginalRate = 0;
                        if (burndown.assetMeta[pk].isTaxable) {
                            const bracketBoundary = (filingStatus === 'Married Filing Jointly' ? 96950 : 48475) * infFac;
                            const baseRate = currentOrdIncome > bracketBoundary ? 0.22 : 0.12;
                            const stateRate = stateTaxRates[assumptions.state]?.rate || 0.0425;
                            if (pk === '401k') marginalRate = baseRate + stateRate; 
                            else marginalRate = (1 - currentBasisRatio) * (0.15 + stateRate); 
                        }
                        let pull = Math.min(available, (deficit * 1.2) / (1 - marginalRate)); 
                        if (pk === '401k' && age < 59.5) {
                            const seppLimit = engine.calculateMaxSepp(bal['401k'], age);
                            pull = Math.min(pull, Math.max(0, seppLimit - (currentDraws['401k'] || 0)));
                        }
                        if (pull <= 1) continue;
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk])); 
                        bal[pk] -= pull;
                        currentDraws[pk] = (currentDraws[pk] || 0) + pull;
                        totalWithdrawn += pull;
                        if (pk === '401k') currentOrdIncome += pull; 
                        else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgIncome += (pull * (1 - currentBasisRatio));
                        const curTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                        const curSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, 0, bal['cash']+bal['taxable']+bal['crypto'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, waiveAssetTest)*12;
                        const newMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                        const newRatio = newMAGI / fpl100;
                        let healthCost = 0;
                        if (!stateMeta.expanded && newRatio < 1.0) healthCost = 13200 * infFac; 
                        else if (newRatio > 4.0) healthCost = 13200 * infFac; 
                        else if (newRatio > 1.38) healthCost = newMAGI * (0.021 + (newRatio - 1) * 0.074 / 3);
                        deficit = targetBudget + healthCost - ((floorTotalIncome - pretaxDed) + totalWithdrawn - curTax + curSnap);
                        if (!isSilent) trace += `Pass 2 (Survival): Pulled ${math.toCurrency(pull)} from ${pk}. New deficit: ${math.toCurrency(deficit)}\n`;
                    }
                }
            }

            // --- PASS 3: DEBT (HELOC Last Resort) ---
            if (deficit > 5) {
                const pk = 'heloc';
                let available = Math.max(0, helocLimit - bal['heloc']);
                if (available > 0) {
                    let pull = Math.min(available, deficit);
                    bal['heloc'] += pull;
                    currentDraws[pk] = (currentDraws[pk] || 0) + pull; 
                    deficit -= pull;
                    if (!isSilent) trace += `Pass 3 (Debt): Borrowed ${math.toCurrency(pull)} from HELOC. Remaining deficit: ${math.toCurrency(deficit)}\n`;
                }
            }

            // Final Calculations
            const finalTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
            const healthMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
            const finalRatio = healthMAGI / fpl100;
            let finalHealthCost = 0;
            if (!stateMeta.expanded && finalRatio < 1.0) finalHealthCost = 13200 * infFac;
            else if (finalRatio > 4.0) finalHealthCost = 13200 * infFac;
            else if (finalRatio > 1.38) finalHealthCost = healthMAGI * (0.021 + (finalRatio - 1) * 0.074 / 3);

            // Re-calculate benefits based on final totals (Bonus for Iron Fist)
            const finalSnap = engine.calculateSnapBenefit(currentOrdIncome + currentLtcgIncome, 0, bal['cash']+bal['taxable']+bal['crypto'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, waiveAssetTest)*12;
            
            const netCash = (floorTotalIncome - pretaxDed) + totalWithdrawn + finalSnap - finalTax - finalHealthCost;
            
            let surplus = Math.max(0, netCash - targetBudget);
            
            // Surplus Management: Pay HELOC First, then Cash
            if (surplus > 100) { 
                if (bal['heloc'] > 0) { 
                    const rep = Math.min(bal['heloc'], surplus); 
                    bal['heloc'] -= rep; 
                    surplus -= rep; 
                    if (!isSilent) trace += `Surplus applied to HELOC Principal: ${math.toCurrency(rep)}. New Balance: ${math.toCurrency(bal['heloc'])}\n`;
                } 
                if (surplus > 100) {
                    bal['cash'] += surplus; 
                    if (!isSilent && isRet) trace += `Recycled surplus ${math.toCurrency(surplus)} back to Cash.\n`;
                }
            }

            const liquidAssets = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            const reValTotal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const debtTotal = simRE.reduce((s,r)=>s+r.mortgage,0) + simDebts.reduce((s,d)=>s+d.balance,0) + bal['heloc'];
            const currentNW = (liquidAssets + reValTotal + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0)) - debtTotal;
            
            // Check for Liquidity Failure (Shortfall > $500 despite having Assets)
            const failedCashFlow = (targetBudget - netCash) > 500;
            const failedNetWorth = currentNW < 100;
            const isInsolvent = failedCashFlow || failedNetWorth;
            
            let status = 'Private';
            if (isInsolvent) {
                if (failedNetWorth) status = 'DEPLETED'; // Truly broke
                else status = 'ILLIQUID'; // Has assets, but locked/capped
            }
            else if (age >= 65) status = 'Medicare';
            else if (!stateMeta.expanded && finalRatio < 1.0) status = 'No Cov';
            else if (finalRatio <= 1.385 && stateMeta.expanded) status = 'Platinum'; 
            else if (finalRatio <= 2.505) status = 'Silver';
            else if (finalRatio > 4.0) status = 'Private';

            if (!isSilent) {
                trace += `Final MAGI: ${math.toCurrency(healthMAGI)} (${Math.round(finalRatio * 100)}% FPL)\n`;
                if (finalSnap > 0) trace += `Benefit Bonus: +${math.toCurrency(finalSnap)} SNAP included in Net Cash.\n`;
                trace += `Status: ${status} | Health Cost: ${math.toCurrency(finalHealthCost)}\n`;
                if (status === 'ILLIQUID') trace += `PLAN FAILURE: Liquidity Crisis. Assets exist (${math.toCurrency(currentNW)}), but are inaccessible or capped.\n`;
                trace += `Total Tax Bill: ${math.toCurrency(finalTax)}\n`;
                trace += `Ending Net Worth: ${math.toCurrency(currentNW)}\n`;
                simulationTrace[age] = trace;
            }

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
            if (r.status === 'DEPLETED') badgeClass = 'bg-red-600 text-white animate-pulse';
            else if (r.status === 'ILLIQUID') badgeClass = 'bg-orange-500 text-white animate-pulse';
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

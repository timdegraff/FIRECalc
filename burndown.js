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
    lastCalculatedResults: { dwz: 0, preservationAge: null },

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
                         
                         <div class="flex flex-col items-center gap-1">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Currency Mode</label>
                            <button id="toggle-burndown-real" class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                                Nominal $
                            </button>
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
                    <div id="card-preservation" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer hover:border-amber-500/30 transition-all">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-infinity text-4xl text-amber-500 opacity-20 group-hover:opacity-100 transition-opacity"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-shield-alt"></i> Preservation Age</label>
                            <div id="card-preservation-val" class="text-3xl font-black text-amber-500 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-preservation-sub" class="text-[9px] font-bold text-amber-500/60 uppercase tracking-tighter leading-none">STAYS SOLVENT AT CURRENT BUDGET UNTIL AGE 100+</div>
                    </div>

                    <div class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-road text-4xl text-blue-400 opacity-20"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-flag-checkered"></i> Retirement Runway</label>
                            <div id="card-runway-val" class="text-3xl font-black text-red-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-runway-sub" class="text-[9px] font-bold text-blue-400/60 uppercase tracking-tighter leading-none">SUSTAINS $0K BUDGET IN 2026 DOLLARS UNTIL THIS AGE</div>
                    </div>

                    <div id="card-dwz" class="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 flex flex-col justify-between h-28 relative overflow-hidden group cursor-pointer hover:border-pink-500/30 transition-all">
                        <div class="absolute right-0 top-0 p-3"><i class="fas fa-skull text-4xl text-pink-400 opacity-20 group-hover:opacity-100 transition-opacity"></i></div>
                        <div>
                            <label class="text-[9px] font-bold text-pink-400 uppercase tracking-widest mb-1 flex items-center gap-1"><i class="fas fa-glass-cheers"></i> Die With Zero</label>
                            <div id="card-dwz-val" class="text-3xl font-black text-pink-400 mono-numbers tracking-tighter">--</div>
                        </div>
                        <div id="card-dwz-sub" class="text-[9px] font-bold text-pink-500/60 uppercase tracking-tighter leading-none">MAX SUSTAINABLE SPEND OF $0K STARTING AT RETIREMENT</div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                     <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <label class="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Burn Down Engines</label>
                        <div id="persona-selector" class="grid grid-cols-2 gap-1 p-1 bg-black/40 rounded-lg border border-white/5 h-full">
                            <button data-mode="PLATINUM" class="rounded-md text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-emerald-500/5">
                                <span class="text-emerald-400 text-xs">HANDOUT HUNTER</span>
                                <span class="text-[6.5px] opacity-40 leading-none mt-1 uppercase text-center">aggressive aid maximization</span>
                            </button>
                            <button data-mode="RAW" class="rounded-md text-[10px] font-black uppercase tracking-tight transition-all flex flex-col items-center justify-center border border-transparent hover:bg-slate-500/5">
                                <span class="text-slate-400 text-xs">IRON FIST</span>
                                <span class="text-[6.5px] opacity-40 leading-none mt-1 uppercase text-center">strict priority burn</span>
                            </button>
                        </div>
                    </div>

                    <div id="card-snap-wrapper" class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-between h-28 transition-all duration-300">
                        <div class="flex justify-between items-start mb-1">
                            <div>
                                <label class="text-[9px] font-bold text-emerald-500 uppercase tracking-widest block">Aid Optimizer</label>
                                <div id="est-snap-indicator" class="text-2xl font-black text-emerald-400 mono-numbers leading-none mt-0.5">$0</div>
                            </div>
                            <div class="text-right">
                                <span class="text-[7px] text-slate-500 font-black uppercase tracking-widest block">Est. Payout</span>
                                <span id="label-annual-snap-est" class="text-[9px] font-bold text-slate-400 mono-numbers">$0/yr</span>
                            </div>
                        </div>
                        
                        <div class="space-y-1.5">
                            <div class="flex justify-between items-end">
                                <div class="flex flex-col">
                                    <label class="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none">Target Monthly Aid</label>
                                    <p class="text-[6px] text-slate-600 font-bold uppercase mt-0.5">Solve for specific benefit floor</p>
                                </div>
                                <span id="label-snap-preserve" class="text-emerald-400 font-black mono-numbers text-[10px]">$0/mo</span>
                            </div>
                            <input type="range" id="input-snap-preserve" min="0" max="2000" step="50" value="0" class="input-range w-full accent-emerald-500">
                        </div>
                    </div>

                    <div class="bg-slate-900/30 rounded-xl border border-slate-800/50 p-3 flex flex-col justify-center h-28">
                        <div class="flex justify-between items-center mb-4">
                            <label class="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Cash Safety Net</label>
                            <span id="label-cash-reserve" class="text-pink-400 font-black mono-numbers text-[10px]">$25,000</span>
                        </div>
                        <input type="range" id="input-cash-reserve" min="0" max="100000" step="1000" value="25000" class="input-range w-full">
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
                    val = Math.max(curAge, Math.min(72, val));
                    el.value = val;
                    const directInp = document.getElementById('input-retire-age-direct');
                    if (directInp) directInp.value = val;
                    if (window.currentData?.assumptions) window.currentData.assumptions.retirementAge = val;
                }
                if (id === 'toggle-budget-sync') {
                    const manualInput = document.getElementById('input-manual-budget');
                    if (manualInput) {
                        manualInput.disabled = el.checked;
                        manualInput.classList.toggle('opacity-40', el.checked);
                    }
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        const dwzCard = document.getElementById('card-dwz');
        if (dwzCard) {
            dwzCard.onclick = () => {
                if (burndown.lastCalculatedResults.dwz > 0) {
                    const syncToggle = document.getElementById('toggle-budget-sync');
                    const manualInput = document.getElementById('input-manual-budget');
                    if (syncToggle && syncToggle.checked) {
                        syncToggle.checked = false;
                        syncToggle.dispatchEvent(new Event('input'));
                    }
                    if (manualInput) {
                        manualInput.value = math.toCurrency(Math.floor(burndown.lastCalculatedResults.dwz));
                        manualInput.dispatchEvent(new Event('input'));
                    }
                }
            };
        }

        const preservationCard = document.getElementById('card-preservation');
        if (preservationCard) {
            preservationCard.onclick = () => {
                const age = burndown.lastCalculatedResults.preservationAge;
                if (age && typeof age === 'number' && age <= 72) {
                    const topRetireSlider = document.getElementById('input-top-retire-age');
                    if (topRetireSlider) {
                        topRetireSlider.value = age;
                        topRetireSlider.dispatchEvent(new Event('input'));
                    }
                }
            };
        }

        const directAgeInp = document.getElementById('input-retire-age-direct');
        if (directAgeInp) {
            directAgeInp.onchange = (e) => {
                let val = parseInt(e.target.value);
                const curAge = parseFloat(window.currentData?.assumptions?.currentAge) || 40;
                val = Math.max(curAge, Math.min(72, val));
                e.target.value = val;
                const slider = document.getElementById('input-top-retire-age');
                if (slider) slider.value = val;
                if (window.currentData?.assumptions) window.currentData.assumptions.retirementAge = val;
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const personaContainer = document.getElementById('persona-selector');
        if (personaContainer) {
            personaContainer.onclick = (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;
                const mode = btn.dataset.mode;
                personaContainer.querySelectorAll('button').forEach(b => {
                    b.classList.remove('bg-emerald-500/10', 'border-emerald-500/30', 'bg-slate-500/10', 'border-slate-500/30');
                });
                const styleMap = { 'PLATINUM': 'bg-emerald-500/10 border-emerald-500/30', 'RAW': 'bg-slate-500/10 border-slate-500/30' };
                btn.classList.add(...styleMap[mode].split(' '));
                personaContainer.dataset.value = mode;

                const snapWrapper = document.getElementById('card-snap-wrapper');
                const snapSlider = document.getElementById('input-snap-preserve');
                if (snapWrapper && snapSlider) {
                    const isIronFist = mode === 'RAW';
                    snapWrapper.classList.toggle('opacity-20', isIronFist);
                    snapWrapper.classList.toggle('pointer-events-none', isIronFist);
                    snapSlider.disabled = isIronFist;
                }
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
            debugAgeInput.oninput = (e) => { const age = parseInt(e.target.value); if (age) { traceAgeManuallySet = true; burndown.showTrace(age); } }; 
        }

        const btnDebugMinus = document.getElementById('btn-debug-minus'), btnDebugPlus = document.getElementById('btn-debug-plus');
        if (btnDebugMinus && btnDebugPlus && debugAgeInput) {
            btnDebugMinus.onclick = () => { debugAgeInput.value = Math.max(18, parseInt(debugAgeInput.value || 40) - 1); debugAgeInput.dispatchEvent(new Event('input')); };
            btnDebugPlus.onclick = () => { debugAgeInput.value = Math.min(100, parseInt(debugAgeInput.value || 40) + 1); debugAgeInput.dispatchEvent(new Event('input')); };
        }
    },

    updateToggleStyle: (btn) => {
        if (!btn) return;
        btn.classList.toggle('bg-blue-600/20', isRealDollars);
        btn.classList.toggle('text-blue-400', isRealDollars);
        btn.textContent = isRealDollars ? '2026 Dollars' : 'Nominal Dollars';
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
            if (personaSelector) { 
                const btn = personaSelector.querySelector(`[data-mode="${mode}"]`); 
                if (btn) btn.click();
            }
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
        const config = burndown.scrape();
        let testedRealBudget = 0;
        if (config.useSync) {
            testedRealBudget = (data.budget?.expenses || []).reduce((sum, exp) => {
                if (exp.remainsInRetirement === false) return sum;
                return sum + math.fromCurrency(exp.annual);
            }, 0);
            const budgetInput = document.getElementById('input-manual-budget');
            if (budgetInput) { budgetInput.value = math.toCurrency(testedRealBudget); formatter.updateZeroState(budgetInput); }
        } else { testedRealBudget = config.manualBudget; }

        simulationTrace = {}; 
        const results = burndown.simulateProjection(data, config);
        if (!results || results.length === 0) return;

        const debugAgeInp = document.getElementById('input-debug-age');
        if (debugAgeInp && !traceAgeManuallySet) debugAgeInp.value = lastUsedRetirementAge;
        
        const runwayAge = firstInsolvencyAge ? firstInsolvencyAge : "100+";
        if (document.getElementById('card-runway-val')) { 
            document.getElementById('card-runway-val').textContent = runwayAge; 
            document.getElementById('card-runway-val').className = firstInsolvencyAge ? "text-3xl font-black text-red-400 mono-numbers tracking-tighter" : "text-3xl font-black text-blue-400 mono-numbers tracking-tighter"; 
        }

        let preservationAge = "--", preservationAgeNum = null, startNWReal = results[0].netWorth, infRate = (data.assumptions.inflation || 3) / 100;
        for (let i = 0; i < results.length; i++) {
            const realNW = results[i].netWorth / Math.pow(1 + infRate, i);
            if (realNW < startNWReal * 0.99) { preservationAgeNum = results[i].age; preservationAge = results[i].age; break; }
            if (i === results.length - 1) { preservationAge = "100+"; preservationAgeNum = 100; }
        }
        burndown.lastCalculatedResults.preservationAge = preservationAgeNum;
        if (document.getElementById('card-preservation-val')) document.getElementById('card-preservation-val').textContent = preservationAge;
        
        let dwzSpend = 0, low = 10000, high = 1000000;
        for (let j = 0; j < 15; j++) {
            let mid = (low + high) / 2;
            const testRes = burndown.simulateProjection(data, { ...config, useSync: false }, true, mid);
            const isTestSolvent = !testRes.some(r => r.isInsolvent);
            if (isTestSolvent) { dwzSpend = mid; low = mid; } else { high = mid; }
        }
        burndown.lastCalculatedResults.dwz = dwzSpend;
        if (document.getElementById('card-dwz-val')) document.getElementById('card-dwz-val').textContent = math.toSmartCompactCurrency(dwzSpend);

        const firstRetYear = results.find(r => r.age >= lastUsedRetirementAge) || results[0];
        if (document.getElementById('est-snap-indicator')) {
            const val = (firstRetYear.snapBenefit || 0) / 12;
            document.getElementById('est-snap-indicator').textContent = formatter.formatCurrency(val, 0);
            if (document.getElementById('label-annual-snap-est')) document.getElementById('label-annual-snap-est').textContent = math.toCurrency(firstRetYear.snapBenefit) + '/yr';
        }
        if (document.getElementById('burndown-table-container')) document.getElementById('burndown-table-container').innerHTML = burndown.renderTable(results);
        const debugAgeVal = parseInt(document.getElementById('input-debug-age')?.value);
        burndown.showTrace(debugAgeVal || results[0].age);
    },

    simulateProjection: (data, configOverride = null, isSilent = false, retirementSpendOverride = null) => {
        const { assumptions, investments = [], realEstate = [], income = [], budget = {}, benefits = {}, helocs = [], debts = [], stockOptions = [] } = data;
        if (!assumptions || isNaN(parseFloat(assumptions.currentAge))) return [];
        const config = configOverride || burndown.scrape(), inflationRate = (assumptions.inflation || 3) / 100, filingStatus = assumptions.filingStatus || 'Single', currentYear = new Date().getFullYear(), persona = config.strategyMode, rAge = parseFloat(assumptions.retirementAge) || 65, cashFloor = config.cashReserve;
        if (!isSilent) firstInsolvencyAge = null;
        const helocInterestRate = (helocs?.length > 0) ? (parseFloat(helocs[0].rate) || assumptions.helocRate || 7) / 100 : (assumptions.helocRate || 7) / 100;
        const optionsEquity = stockOptions.reduce((s, x) => s + Math.max(0, (math.fromCurrency(x.currentPrice) - math.fromCurrency(x.strikePrice)) * (parseFloat(x.shares) || 0)), 0);

        let bal = {
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
        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0), results = [];
        const startAge = Math.max(18, Math.min(72, Math.floor(parseFloat(assumptions.currentAge) || 40)));

        for (let i = 0; i <= (100 - startAge); i++) {
            const age = startAge + i, year = currentYear + i, isRet = age >= rAge, infFac = Math.pow(1 + inflationRate, i);
            let trace = `--- AGE ${age} (${year}) ---\n`;
            const dependCount = (benefits.dependents || []).filter(d => (parseInt(d.birthYear) + 19) >= year).length;
            const currentHhSize = 1 + (filingStatus === 'Married Filing Jointly' ? 1 : 0) + dependCount;
            const fpl100 = math.getFPL(currentHhSize, assumptions.state) * infFac;
            if (!isSilent) trace += `Household Size: ${currentHhSize} (FPL 100%: ${math.toCurrency(fpl100)})\n`;

            const stockGrowth = math.getGrowthForAge('Stock', age, startAge, assumptions);
            const cryptoGrowth = math.getGrowthForAge('Crypto', age, startAge, assumptions);
            const metalsGrowth = math.getGrowthForAge('Metals', age, startAge, assumptions);
            const realEstateGrowth = math.getGrowthForAge('RealEstate', age, startAge, assumptions);
            simRE.forEach(r => r.mortgage = Math.max(0, r.mortgage - (r.principalPayment || 0) * 12));
            simDebts.forEach(d => d.balance = Math.max(0, d.balance - (d.principalPayment || 0) * 12));

            let baseBudget = (isRet && retirementSpendOverride !== null) ? retirementSpendOverride * infFac : (config.useSync ? (budget.expenses || []).reduce((s, exp) => (isRet && exp.remainsInRetirement === false) ? s : s + (exp.isFixed ? math.fromCurrency(exp.annual) : math.fromCurrency(exp.annual) * infFac), 0) : (config.manualBudget || 100000) * infFac);
            const helocInterestDue = bal['heloc'] * helocInterestRate;
            baseBudget += helocInterestDue;
            const factor = isRet ? (age < 60 ? (assumptions.phaseGo1 ?? 1.0) : (age < 80 ? (assumptions.phaseGo2 ?? 0.9) : (assumptions.phaseGo3 ?? 0.8))) : 1.0;
            const targetBudget = baseBudget * factor;
            if (!isSilent) trace += `Target Budget: ${math.toCurrency(targetBudget)}\n`;

            let floorOrdIncome = 0, floorTotalIncome = 0, floorUntaxedMAGI = 0, pretaxDed = 0;
            (isRet ? income.filter(inc => inc.remainsInRetirement) : income).forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i), sourceGross = gross + (gross * (parseFloat(inc.bonusPct) / 100 || 0)), netSrc = sourceGross - (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1));
                const unt = parseInt(inc.nonTaxableUntil);
                if (isNaN(unt) || year >= unt) { floorOrdIncome += netSrc; if (!isRet) pretaxDed += Math.min(sourceGross * (parseFloat(inc.contribution) / 100 || 0), (age >= 50 ? 31000 : 23500) * infFac); }
                floorTotalIncome += netSrc;
            });

            if (age >= assumptions.ssStartAge) { 
                const ssG = engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac);
                const tSS = engine.calculateTaxableSocialSecurity(ssG, Math.max(0, floorOrdIncome), filingStatus); 
                floorOrdIncome += tSS; floorTotalIncome += ssG; floorUntaxedMAGI += (ssG - tSS);
            }

            if (!isRet) {
                bal['401k'] += pretaxDed;
                (budget.savings || []).forEach(sav => { 
                    const amt = math.fromCurrency(sav.annual) * infFac, keyMap = { 'Cash': 'cash', 'Taxable': 'taxable', 'Roth IRA': 'roth-basis', 'HSA': 'hsa', 'Crypto': 'crypto', 'Metals': 'metals' }, key = keyMap[sav.type]; 
                    if (key) { bal[key] += amt; if (['taxable', 'crypto', 'metals'].includes(key)) bal[key + 'Basis'] += amt; } 
                });
            }

            const startOfYearBal = { ...bal };
            let currentOrdIncome = 0, currentLtcgIncome = 0, totalWithdrawn = 0, currentDraws = {}, finalSnap = 0;
            let liquidOrder = burndown.priorityOrder;
            if (persona !== 'RAW') liquidOrder = liquidOrder.filter(k => k !== 'heloc');

            // --- Handout Hunter Solver ---
            if (persona === 'PLATINUM' && config.snapPreserve > 0) {
                const targetAid = config.snapPreserve;
                if (!isSilent) trace += `AID OPTIMIZER: Targeting ${math.toCurrency(targetAid)}/mo SNAP.\n`;

                // Phase 0: Binary Search for MAGI Ceiling
                let low = 0, high = 1000000, ceilingMAGI = 0;
                for (let j = 0; j < 20; j++) {
                    let mid = (low + high) / 2;
                    let testAid = engine.calculateSnapBenefit(mid/12, 0, bal['cash']+bal['taxable'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, true);
                    if (testAid >= targetAid) { ceilingMAGI = mid; low = mid; } else { high = mid; }
                }
                
                if (!isSilent) trace += `  Solved MAGI Ceiling: ${math.toCurrency(ceilingMAGI)}/yr.\n`;

                // 5-Pass Spiral Loop
                for (let iter = 0; iter < 5; iter++) {
                    bal = { ...startOfYearBal }; 
                    currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed); 
                    currentLtcgIncome = 0; 
                    totalWithdrawn = 0; 
                    currentDraws = {};

                    // Split Draw Order into MAGI and Non-MAGI
                    const magiAssets = liquidOrder.filter(k => burndown.assetMeta[k].isTaxable);
                    const bridgeAssets = liquidOrder.filter(k => !burndown.assetMeta[k].isTaxable);

                    const solveForGap = () => {
                        const curTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                        const curMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                        const curRatio = curMAGI / fpl100;
                        const curHealth = (curRatio > 1.38 ? curMAGI * (0.021 + (curRatio - 1) * 0.074 / 3) : 0);
                        const res = (floorTotalIncome - pretaxDed) + totalWithdrawn + (iter >= 1 ? finalSnap : 0) - curTax - curHealth;
                        return targetBudget - res;
                    };

                    // Draw Logic:
                    // 1. Draw MAGI assets up to the solved Ceiling
                    for (const pk of magiAssets) {
                        let gap = solveForGap(); if (gap <= 5) break;
                        let av = bal[pk]; if (av <= 1) continue;
                        let bR = (bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                        let curMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI;
                        let pull = Math.min(av, (ceilingMAGI - curMAGI) / (pk === '401k' ? 1 : Math.max(0.1, 1 - bR)));
                        if (pk === '401k' && age < 60) pull = Math.min(pull, engine.calculateMaxSepp(bal['401k'], age));
                        if (pull <= 1) continue;
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk]));
                        bal[pk] -= pull; currentDraws[pk] = (currentDraws[pk] || 0) + pull; totalWithdrawn += pull;
                        if (pk === '401k') currentOrdIncome += pull; else currentLtcgIncome += (pull * (1 - bR));
                    }

                    // 2. Draw Bridge (Basis) assets to fill budget
                    for (const pk of bridgeAssets) {
                        let gap = solveForGap(); if (gap <= 5) break;
                        let av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0));
                        if (av <= 1) continue;
                        let pull = Math.min(av, gap);
                        bal[pk] -= pull; currentDraws[pk] = (currentDraws[pk] || 0) + pull; totalWithdrawn += pull;
                    }

                    // 3. Survival Overflow (Back to MAGI)
                    for (const pk of magiAssets) {
                        let gap = solveForGap(); if (gap <= 5) break;
                        let av = bal[pk]; if (av <= 1) continue;
                        let bR = (bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                        let pull = Math.min(av, gap / (1 - 0.25)); // Assumed penalty/tax drag for emergency
                        if (pk === '401k' && age < 60) pull = Math.min(pull, engine.calculateMaxSepp(bal['401k'], age) - (currentDraws[pk]||0));
                        if (pull <= 1) continue;
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk]));
                        bal[pk] -= pull; currentDraws[pk] = (currentDraws[pk] || 0) + pull; totalWithdrawn += pull;
                        if (pk === '401k') currentOrdIncome += pull; else currentLtcgIncome += (pull * (1 - bR));
                    }
                    finalSnap = engine.calculateSnapBenefit((currentOrdIncome+currentLtcgIncome)/12, 0, bal['cash']+bal['taxable'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, true)*12;
                }
            } else {
                // IRON FIST / RAW Loop
                for (let iter = 0; iter < 5; iter++) {
                    bal = { ...startOfYearBal }; currentOrdIncome = Math.max(0, floorOrdIncome - pretaxDed); currentLtcgIncome = 0; totalWithdrawn = 0; currentDraws = {};
                    const estSnap = engine.calculateSnapBenefit(currentOrdIncome / 12, 0, bal['cash']+bal['taxable'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, true) * 12;
                    for (const pk of liquidOrder) {
                        const curMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI, curRatio = curMAGI / fpl100;
                        let curHealth = (!stateTaxRates[assumptions.state]?.expanded && curRatio < 1.0) ? 13200*infFac : (curRatio > 4.0 ? 13200*infFac : (curRatio > 1.38 ? curMAGI * (0.021 + (curRatio - 1) * 0.074 / 3) : 0));
                        const curTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
                        const res = (floorTotalIncome - pretaxDed) + totalWithdrawn + (iter >= 1 ? estSnap : 0) - curTax - curHealth;
                        let gap = targetBudget - res; if (gap <= 5) break;
                        if (pk === 'heloc') { let av = Math.max(0, helocLimit - bal['heloc']); if (av > 0) { let draw = Math.min(av, gap); bal['heloc'] += draw; currentDraws['heloc'] = (currentDraws['heloc'] || 0) + draw; totalWithdrawn += draw; } continue; }
                        let av = (pk === 'cash' ? Math.max(0, bal[pk] - cashFloor) : (bal[pk] || 0)); if (av <= 1) continue;
                        let bR = (['taxable', 'crypto', 'metals'].includes(pk) && bal[pk] > 0) ? bal[pk+'Basis'] / bal[pk] : 1;
                        let rate = burndown.assetMeta[pk].isTaxable ? 0.22 : 0;
                        let pull = Math.min(av, gap / (1 - rate));
                        if (pk === '401k' && age < 60) pull = Math.min(pull, engine.calculateMaxSepp(bal['401k'], age));
                        if (pull <= 1) continue;
                        if (bal[pk+'Basis'] !== undefined) bal[pk+'Basis'] -= (bal[pk+'Basis'] * (pull / bal[pk]));
                        bal[pk] -= pull; currentDraws[pk] = (currentDraws[pk] || 0) + pull; totalWithdrawn += pull;
                        if (pk === '401k') currentOrdIncome += pull; else if (['taxable', 'crypto', 'metals'].includes(pk)) currentLtcgIncome += (pull * (1 - bR));
                    }
                    finalSnap = engine.calculateSnapBenefit((currentOrdIncome+currentLtcgIncome)/12, 0, bal['cash']+bal['taxable'], currentHhSize, (benefits.shelterCosts||700)*infFac, benefits.hasSUA!==false, benefits.isDisabled!==false, (benefits.childSupportPaid||0)*infFac, (benefits.depCare||0)*infFac, (benefits.medicalExps||0)*infFac, assumptions.state, infFac, true)*12;
                }
            }

            const finalTax = engine.calculateTax(currentOrdIncome, currentLtcgIncome, filingStatus, assumptions.state, infFac);
            const finalMAGI = currentOrdIncome + currentLtcgIncome + floorUntaxedMAGI, fRatio = finalMAGI / fpl100;
            let finalH = (fRatio > 4.0 ? 13200*infFac : (fRatio > 1.38 ? finalMAGI * (0.021 + (fRatio - 1) * 0.074 / 3) : 0));
            const netCash = (floorTotalIncome - pretaxDed) + totalWithdrawn + finalSnap - finalTax - finalH;
            
            if (!isSilent) {
                trace += `  Income Floor: ${math.toCurrency(floorTotalIncome - pretaxDed)}\n`;
                if (finalSnap > 0) trace += `  + SNAP Aid: ${math.toCurrency(finalSnap)}\n`;
                Object.entries(currentDraws).forEach(([k,v]) => trace += `  + Phase Draw: ${math.toCurrency(v)} from ${k}\n`);
                trace += `  - Taxes: ${math.toCurrency(finalTax)}\n`;
                trace += `  - Health: ${math.toCurrency(finalH)}\n`;
                trace += `  = FINAL NET: ${math.toCurrency(netCash)} (Target: ${math.toCurrency(targetBudget)})\n`;
                trace += `Ending MAGI: ${math.toCurrency(finalMAGI)} (${Math.round(fRatio * 100)}% FPL)\n`;
            }

            const liq = bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'];
            const curNW = (liq + simRE.reduce((s,r)=>s+r.mortgage,0)) - (simRE.reduce((s,r)=>s+r.mortgage,0) + simDebts.reduce((s,d)=>s+d.balance,0) + bal['heloc']);
            const isInsolvent = (targetBudget - netCash) > 500 || curNW < 100;
            let stat = 'Private'; if (isInsolvent) stat = curNW < 100 ? 'DEPLETED' : 'ILLIQUID'; else if (age >= 65) stat = 'Medicare'; else if (fRatio <= 1.385) stat = 'Platinum'; else if (fRatio <= 2.505) stat = 'Silver';
            if (!isSilent) { trace += `Status: ${stat}\n`; simulationTrace[age] = trace; }
            results.push({ age, year, budget: targetBudget, magi: finalMAGI, netWorth: curNW, isInsolvent, balances: { ...bal }, draws: currentDraws, snapBenefit: finalSnap, taxes: finalTax, liquid: liq, netCash, status: stat });
            if (!isSilent && isInsolvent && firstInsolvencyAge === null) firstInsolvencyAge = age;
            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth)); bal['crypto'] *= (1 + cryptoGrowth); bal['metals'] *= (1 + metalsGrowth); bal['roth-earnings'] += (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth;
        }
        return results;
    },

    renderTable: (results) => {
        const infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const header = `<tr class="sticky top-0 bg-[#1e293b] !text-slate-500 label-std z-20 border-b border-white/5"><th class="p-2 w-10 text-center !bg-[#1e293b]">Age</th><th class="p-2 text-center !bg-[#1e293b]">Budget</th><th class="p-2 text-center !bg-[#1e293b]">MAGI</th><th class="p-2 text-center !bg-[#1e293b]">Health</th><th class="p-2 text-center !bg-[#1e293b]">SNAP</th>${burndown.priorityOrder.map(k => `<th class="p-2 text-center text-[9px] !bg-[#1e293b]" style="color:${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('')}<th class="p-2 text-center !bg-[#1e293b] text-teal-400">LIVE ON</th><th class="p-2 text-center !bg-[#1e293b]">Net Worth</th></tr>`;
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const formatCell = (v) => formatter.formatCurrency(v / inf, 0);
            let badgeClass = 'bg-slate-700 text-slate-400';
            if (r.status === 'DEPLETED') badgeClass = 'bg-red-600 text-white animate-pulse';
            else if (r.status === 'ILLIQUID') badgeClass = 'bg-orange-500 text-white animate-pulse';
            else if (r.status === 'Medicare') badgeClass = 'bg-slate-600 text-white';
            else if (r.status === 'Platinum') badgeClass = 'bg-emerald-500 text-white';
            else if (r.status === 'Silver') badgeClass = 'bg-blue-500 text-white';
            const isRet = r.age === Math.floor(lastUsedRetirementAge), rowClass = r.isInsolvent ? 'bg-red-500/20' : (isRet ? 'bg-blue-900/10' : '');
            const draws = burndown.priorityOrder.map(k => { const dV = (r.draws?.[k] || 0) / inf, bV = r.balances[k] / inf; return `<td class="p-1.5 text-center border-l border-white/5 bg-black/10">${dV > 0 ? `<div class="font-black" style="color:${burndown.assetMeta[k]?.color}">${formatCell(dV * inf)}</div>` : `<div class="text-slate-700">-</div>`}<div class="text-[8px] text-slate-500 font-medium mt-0.5">${formatCell(bV * inf)}</div></td>`; }).join('');
            return `<tr class="border-b border-white/5 hover:bg-white/5 text-[10px] ${rowClass}"><td class="p-2 text-center font-bold"><div>${r.age}</div>${isRet ? `<div class="text-[7px] text-amber-500 font-black">RETIRE</div>` : ''}</td><td class="p-2 text-center text-slate-400 font-medium">${formatCell(r.budget)}</td><td class="p-2 text-center font-black text-white">${formatCell(r.magi)}</td><td class="p-2 text-center"><span class="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${badgeClass}">${r.status}</span></td><td class="p-2 text-center text-emerald-500 font-bold">${formatCell(r.snapBenefit)}</td>${draws}<td class="p-2 text-center font-black text-teal-400 border-l border-white/5 bg-teal-400/5">${formatCell(r.netCash)}</td><td class="p-2 text-center font-black ${r.isInsolvent ? 'text-red-400' : 'text-teal-400'}">${formatCell(r.netWorth)}</td></tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto">${header}<tbody>${rows}</tbody></table>`;
    }
};
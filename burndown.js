
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;

export const burndown = {
    priorityOrder: ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa'],
    
    init: () => {
        const container = document.getElementById('tab-burndown');
        container.innerHTML = `
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
                                <input type="range" id="input-top-retire-age" data-id="retirementAge" min="30" max="80" step="1" class="input-range w-32">
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
                        
                        <div class="flex flex-col gap-1.5">
                            <label class="label-std text-slate-500">Draw Strategy</label>
                            <select id="burndown-strategy" class="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs font-black text-blue-400 outline-none focus:border-blue-500 transition-all cursor-pointer">
                                <option value="standard">Standard (Priority Order)</option>
                                <option value="medicaid">Platinum Max (Limit Income to 138% FPL)</option>
                                <option value="perpetual">Wealth Preservation (Real Flat Principal)</option>
                            </select>
                        </div>
                        
                        <!-- OPTIMIZATION TUNER (HIDDEN BY DEFAULT) -->
                        <div id="strategy-tuner" class="hidden flex flex-col gap-1 w-48 border-l border-slate-700 pl-4 animate-fade-in">
                            <div class="flex justify-between items-center">
                                <label class="label-std text-slate-500">Income Utilization</label>
                                <span id="tuner-pct-display" class="text-[9px] font-bold text-white mono-numbers">100%</span>
                            </div>
                            <input type="range" id="input-strategy-tuner" min="0" max="100" step="5" value="100" class="input-range h-1.5 accent-emerald-500">
                            <div class="flex justify-between text-[8px] text-slate-600 font-bold uppercase mt-1">
                                <span>Max SNAP</span>
                                <span>Max Spend</span>
                            </div>
                            <div class="mt-1 text-center bg-emerald-500/10 rounded px-2 py-1 border border-emerald-500/20">
                                <span class="text-[8px] text-emerald-400 font-bold uppercase mr-1">Est. SNAP:</span>
                                <span id="tuner-snap-est" class="text-[9px] font-black text-white mono-numbers">$0/mo</span>
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
        const triggers = ['burndown-strategy', 'toggle-rule-72t', 'toggle-budget-sync'];
        triggers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.onchange = () => {
                if (id === 'burndown-strategy') {
                    const strategy = el.value;
                    const swrInd = document.getElementById('swr-indicator');
                    if (swrInd) swrInd.classList.toggle('hidden', strategy !== 'perpetual');
                    
                    const tuner = document.getElementById('strategy-tuner');
                    if (tuner) tuner.classList.toggle('hidden', strategy !== 'medicaid');
                }
                if (id === 'toggle-budget-sync') {
                    const manualContainer = document.getElementById('manual-budget-container');
                    if (manualContainer) manualContainer.classList.toggle('hidden', el.checked);
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });

        const tunerInput = document.getElementById('input-strategy-tuner');
        if (tunerInput) {
            tunerInput.oninput = (e) => {
                const val = e.target.value;
                document.getElementById('tuner-pct-display').textContent = `${val}%`;
                
                // Live preview of SNAP estimate
                const data = window.currentData;
                const hhSize = data.benefits?.hhSize || 1;
                const fpl = 16060 + (hhSize - 1) * 5650;
                const limitMult = data.benefits?.isPregnant ? 1.95 : 1.38;
                const maxMAGI = fpl * limitMult;
                const targetMAGI = maxMAGI * (val / 100);
                
                // Simple estimate for visual feedback (actual logic is in simulation)
                const estSnap = engine.calculateSnapBenefit(targetMAGI, hhSize, data.benefits?.shelterCosts || 700, data.benefits?.hasSUA, data.benefits?.isDisabled);
                document.getElementById('tuner-snap-est').textContent = `${math.toCurrency(estSnap)}/mo`;

                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }

        const optBtn = document.getElementById('btn-optimize-priority');
        if (optBtn) {
            optBtn.onclick = () => {
                const strategy = document.getElementById('burndown-strategy')?.value || 'standard';
                if (strategy === 'medicaid') {
                    burndown.priorityOrder = ['taxable', 'cash', 'roth-basis', 'hsa', 'heloc', 'crypto', 'metals', '401k', 'roth-earnings'];
                } else {
                    burndown.priorityOrder = ['cash', 'taxable', 'roth-basis', 'crypto', 'metals', '401k', 'heloc', 'hsa', 'roth-earnings'];
                }
                burndown.run();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        }
        
        const topRetireSlider = document.getElementById('input-top-retire-age');
        if (topRetireSlider) {
            topRetireSlider.oninput = (e) => {
                const val = e.target.value;
                const lbl = document.getElementById('label-top-retire-age');
                if (lbl) lbl.textContent = val;
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
            {id: 'burndown-strategy', key: 'strategy', type: 'val'},
            {id: 'toggle-rule-72t', key: 'useSEPP', type: 'check'},
            {id: 'toggle-budget-sync', key: 'useSync', type: 'check'},
            {id: 'input-strategy-tuner', key: 'tunerValue', type: 'val'}
        ];
        config.forEach(c => {
            const el = document.getElementById(c.id);
            if (el && data?.[c.key] !== undefined) {
                if (c.type === 'check') el.checked = data[c.key];
                else el.value = data[c.key];
            }
        });
        
        // Initial visibility check
        const strat = document.getElementById('burndown-strategy')?.value;
        const tuner = document.getElementById('strategy-tuner');
        if (tuner && strat === 'medicaid') tuner.classList.remove('hidden');

        // Initial label update for tuner
        const tunerInp = document.getElementById('input-strategy-tuner');
        if (tunerInp) {
             document.getElementById('tuner-pct-display').textContent = `${tunerInp.value}%`;
             if (tunerInp.oninput) tunerInp.oninput({target: tunerInp}); // trigger snap calc
        }

        const rAge = window.currentData?.assumptions?.retirementAge || 65;
        const rSlider = document.getElementById('input-top-retire-age');
        if (rSlider) {
             rSlider.value = rAge;
             const lbl = document.getElementById('label-top-retire-age');
             if (lbl) lbl.textContent = rAge;
        }

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn && data?.dieWithZero !== undefined) {
            if (data.dieWithZero) dwzBtn.classList.add('active');
            else dwzBtn.classList.remove('active');
            const active = dwzBtn.classList.contains('active');
            const lblSub = document.getElementById('dwz-sub');
            if (lblSub) lblSub.textContent = active ? 'Target $0 at Age 100' : 'Hold Assets for Heirs';
        }
        
        const swrInd = document.getElementById('swr-indicator');
        if (swrInd) swrInd.classList.toggle('hidden', (data?.strategy !== 'perpetual'));

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
            strategy: document.getElementById('burndown-strategy')?.value || 'standard',
            useSync: document.getElementById('toggle-budget-sync')?.checked ?? true,
            useSEPP: document.getElementById('toggle-rule-72t')?.checked ?? false,
            dieWithZero: document.getElementById('btn-dwz-toggle')?.classList.contains('active') ?? false,
            manualBudget: math.fromCurrency(document.getElementById('input-manual-budget')?.value || "$100,000"),
            tunerValue: parseFloat(document.getElementById('input-strategy-tuner')?.value || 100),
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

        const stockGrowth = (data.assumptions.stockGrowth || 8) / 100;
        const inflationRate = (data.assumptions.inflation || 3) / 100;
        const swrValue = Math.max(0, stockGrowth - inflationRate);
        const swrEl = document.getElementById('swr-value');
        if (swrEl) swrEl.textContent = `${(swrValue * 100).toFixed(1)}%`;

        let results = [];
        const config = burndown.scrape();

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
        } else results = burndown.simulateProjection(data);

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

        const bal = {
            'cash': investments.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxable': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'taxableBasis': investments.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.costBasis), 0),
            'roth-basis': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + (math.fromCurrency(i.costBasis) || 0), 0),
            'roth-earnings': investments.filter(i => i.type === 'Post-Tax (Roth)').reduce((s, i) => s + Math.max(0, math.fromCurrency(i.value) - (math.fromCurrency(i.costBasis) || 0)), 0),
            '401k': investments.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'crypto': investments.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
            'metals': investments.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
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
            const age = assumptions.currentAge + i, year = currentYear + i, isRet = age >= assumptions.retirementAge;
            const yearRes = { age, year, draws: {}, seppAmount: 0, rmdAmount: 0, acaPremium: 0, snapBenefit: 0 };
            const infFac = Math.pow(1 + inflationRate, i);

            const amort = (arr, key) => arr.reduce((s, item) => { if (item[key] > 0) item[key] = Math.max(0, item[key] - (item.principalPayment || 0) * 12); return s + item[key]; }, 0);
            const totalMort = amort(simRE, 'mortgage'), totalOL = amort(simOA, 'loan'), totalDebt = amort(simDebts, 'balance');

            let baseBudget = 0;
            if (overrideManualBudget !== null) baseBudget = overrideManualBudget * infFac;
            else if (stateConfig.useSync) (budget.expenses || []).forEach(exp => { if (isRet && exp.removedInRetirement) return; const amt = math.fromCurrency(exp.annual); baseBudget += exp.isFixed ? amt : amt * infFac; });
            else baseBudget = (stateConfig.manualBudget || 100000) * infFac; 

            let targetBudget = baseBudget;
            if (isRet) targetBudget *= (age < 65 ? (assumptions.slowGoFactor || 1.1) : (age < 80 ? (assumptions.midGoFactor || 1.0) : (assumptions.noGoFactor || 0.85)));

            const currentREVal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const currentNW = (bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0) + (currentREVal - totalMort)) - bal['heloc'] - totalOL - totalDebt;
            if (stateConfig.strategy === 'perpetual') targetBudget = currentNW * Math.max(0, stockGrowth - inflationRate);

            let ordInc = 0, ltcgInc = 0, netAvail = 0, pretaxDed = 0;
            const activeIncs = isRet ? income.filter(inc => inc.remainsInRetirement) : income;
            activeIncs.forEach(inc => {
                let gross = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + (inc.increase / 100 || 0), i);
                const bonus = gross * (parseFloat(inc.bonusPct) / 100 || 0), totalComp = gross + bonus;
                const netSrc = totalComp - math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                if (inc.nonTaxableUntil && parseInt(inc.nonTaxableUntil) >= year) netAvail += netSrc;
                else {
                    ordInc += netSrc; netAvail += netSrc;
                    const contribRate = parseFloat(inc.contribution) / 100 || 0;
                    let rawContrib = gross * contribRate; if (inc.contribOnBonus) rawContrib += bonus * contribRate;
                    const limit = (age >= 50 ? 31000 : 23500) * infFac; pretaxDed += Math.min(rawContrib, limit);
                }
            });

            const ssGross = (age >= assumptions.ssStartAge) ? engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, infFac) : 0;
            ordInc += engine.calculateTaxableSocialSecurity(ssGross, ordInc - pretaxDed, filingStatus); netAvail += ssGross;
            const initialSnap = engine.calculateSnapBenefit(ordInc, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, infFac) * 12;
            if (initialSnap > 0) { netAvail += initialSnap; yearRes.snapBenefit = initialSnap; }

            if (stateConfig.useSEPP && isSepp && age < 60 && bal['401k'] > 0) {
                 const amt = Math.min(bal['401k'], seppAmt); bal['401k'] -= amt; ordInc += amt; netAvail += amt; yearRes.seppAmount = amt; yearRes.draws['401k'] = (yearRes.draws['401k'] || 0) + amt;
            } else if (age >= 60) isSepp = false;
            if (age >= 75) {
                const rmd = engine.calculateRMD(bal['401k'], age); bal['401k'] -= rmd; ordInc += rmd; netAvail += rmd; yearRes.rmdAmount = rmd; yearRes.draws['401k'] = (yearRes.draws['401k'] || 0) + rmd;
            }
            pretaxDed += (budget.savings?.filter(s => s.type === 'HSA').reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0);
            ordInc -= pretaxDed; netAvail -= pretaxDed;

            const fpl = (16060 + (hhSize - 1) * 5650) * infFac, medLim = fFac => fpl * (data.benefits?.isPregnant ? 1.95 : 1.38);
            let isMedStrat = stateConfig.strategy === 'medicaid' && age < 65;
            
            // Apply Tuner Factor if Medicaid Strategy is active
            const tunerFactor = (stateConfig.tunerValue || 100) / 100;
            const effectiveMedLim = () => medLim() * tunerFactor;
            
            if (isMedStrat && ordInc > effectiveMedLim()) isMedStrat = false;

            const maxSnapBenefit = (295 + (hhSize - 1) * 215) * infFac;
            const snapDeductions = ((hhSize <= 3 ? 205 : (hhSize === 4 ? 220 : (hhSize === 5 ? 255 : 295))) + (benefits.hasSUA !== false ? 680 : 0)) * infFac;
            const snapPhaseOutLimit = (maxSnapBenefit / 0.3) + snapDeductions;

            let strategyPhases = [];
            if (isMedStrat) {
                const magiAssets = burndown.priorityOrder.filter(k => { const m = burndown.assetMeta[k]; return m.isMagi || k === '401k' || k === 'roth-earnings'; });
                const nonMagiAssets = burndown.priorityOrder.filter(k => { const m = burndown.assetMeta[k]; return !m.isMagi && k !== '401k' && k !== 'roth-earnings'; });
                strategyPhases = [{ keys: magiAssets, limitByMagi: true }, { keys: nonMagiAssets, limitByMagi: false }, { keys: magiAssets, limitByMagi: false }];
            } else strategyPhases = [{ keys: burndown.priorityOrder, limitByMagi: false }];

            let ordIter = ordInc, ltcgIter = ltcgInc, drawn = 0;
            strategyPhases.forEach(phase => {
                let shortfall = targetBudget + engine.calculateTax(ordIter, ltcgIter, filingStatus, assumptions.state, infFac) - (netAvail + drawn);
                if (shortfall <= 5) return;
                phase.keys.forEach(pk => {
                    if (pk === 'roth-earnings' && bal['roth-basis'] > 0) return;
                    shortfall = targetBudget + engine.calculateTax(ordIter, ltcgIter, filingStatus, assumptions.state, infFac) - (netAvail + drawn);
                    if (shortfall <= 5) return;
                    let avail = (pk === 'heloc') ? (helocLimit - bal['heloc']) : bal[pk];
                    if (pk === '401k' && age < 59.5) {
                        if (isSepp) avail = 0; 
                        else if (stateConfig.useSEPP) {
                             seppAmt = Math.min(shortfall, bal['401k'] * (engine.calculateMaxSepp(100000, age) / 100000));
                             isSepp = true; bal['401k'] -= seppAmt; ordIter += seppAmt; 
                             yearRes.seppAmount = seppAmt; yearRes.draws['401k'] = (yearRes.draws['401k'] || 0) + seppAmt; drawn += seppAmt; avail = 0; return;
                        } else avail = 0; 
                    }
                    if (avail <= 0) return;
                    let dLim = avail;
                    const increasesMagi = burndown.assetMeta[pk].isMagi || pk === '401k' || pk === 'roth-earnings'; 
                    if (phase.limitByMagi && increasesMagi) {
                        const currentMagi = ordIter + ltcgIter;
                        const hardCap = Math.min(effectiveMedLim(), snapPhaseOutLimit);
                        const room = Math.max(0, hardCap - currentMagi);
                        if (room < 1000) dLim = 0; // CRUMB FILTER: Prevents tiny fragmented withdrawals
                        else {
                            if (pk === 'taxable' && bal['taxable'] > 0) {
                                 const ratio = Math.max(0, (bal['taxable'] - bal['taxableBasis']) / bal['taxable']);
                                 if (ratio > 0) dLim = Math.min(dLim, room / ratio);
                            } else dLim = Math.min(dLim, room);
                        }
                    }
                    const take = Math.min(avail, dLim, shortfall);
                    if (take > 0.01) {
                        if (pk === 'heloc') bal['heloc'] += take; else bal[pk] -= take;
                        yearRes.draws[pk] = (yearRes.draws[pk] || 0) + take; drawn += take;
                        if (pk === 'taxable') {
                             const preBal = bal['taxable'] + take, ratio = preBal > 0 ? Math.max(0, (preBal - bal['taxableBasis']) / preBal) : 0;
                             const g = take * ratio; ltcgIter += g; bal['taxableBasis'] -= (take - g);
                        } else if (increasesMagi) ordIter += take;
                    }
                });
            });

            const magi = ordIter + ltcgIter;
            if (isMedStrat && magi > medLim()) yearRes.acaPremium = magi * 0.085;
            if (yearRes.snapBenefit > 0) {
                 const finalSnap = engine.calculateSnapBenefit(magi, hhSize, benefits.shelterCosts || 700, benefits.hasSUA !== false, benefits.isDisabled !== false, infFac) * 12;
                 yearRes.snapBenefit = finalSnap; 
            }
            let surplus = netAvail + drawn - engine.calculateTax(ordIter, ltcgIter, filingStatus, assumptions.state, infFac) - yearRes.acaPremium - targetBudget;
            if (surplus > 0) { if (bal['heloc'] > 0) { const p = Math.min(bal['heloc'], surplus); bal['heloc'] -= p; } else { bal['taxable'] += surplus; bal['taxableBasis'] += surplus; } }
            else if (surplus < 0) { if (bal['cash'] > Math.abs(surplus)) bal['cash'] += surplus; else bal['heloc'] -= surplus; }
            yearRes.balances = { ...bal }; yearRes.budget = targetBudget; yearRes.magi = magi; yearRes.netWorth = currentNW;
            yearRes.status = age >= 65 ? 'Medicare' : (magi <= medLim() ? 'Platinum' : (magi <= fpl * 2.5 ? 'Silver' : 'Standard'));
            results.push(yearRes);
            ['taxable', '401k', 'hsa'].forEach(k => bal[k] *= (1 + stockGrowth)); bal['crypto'] *= (1 + cryptoGrowth); bal['metals'] *= (1 + metalsGrowth);
            if (bal['heloc'] > 0) bal['heloc'] *= (1 + (helocs.reduce((s, h) => s + math.fromCurrency(h.balance) * (h.rate || 7), 0) / (bal['heloc'] || 1)) / 100);
            const rg = (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth; bal['roth-earnings'] += rg;
        }
        return results;
    },

    renderTable: (results) => {
        const keys = burndown.priorityOrder, infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const headerCells = keys.map(k => `<th class="p-2 text-right text-[9px] min-w-[75px]" style="color: ${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('');
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const draws = keys.map(k => {
                const amt = (r.draws[k] || 0) / inf, bal = r.balances[k] / inf, m = burndown.assetMeta[k];
                const note = k === '401k' ? (r.seppAmount > 0 ? '72t' : (r.rmdAmount > 0 ? 'RMD' : '')) : '';
                return `<td class="p-1.5 text-right border-l border-slate-800/50"><div class="${amt > 0 ? 'font-bold' : 'text-slate-700'}" style="${amt > 0 ? `color: ${m.color}` : ''}">${formatter.formatCurrency(amt, 0)}${note ? `<span class="text-[7px] block opacity-60">${note}</span>` : ''}</div><div class="text-[8px] opacity-40">${formatter.formatCurrency(bal, 0)}</div></td>`;
            }).join('');
            let badge = `<span class="px-2 py-1 rounded text-[9px] font-black uppercase ${r.status === 'Medicare' ? 'bg-slate-600 text-white' : (r.status === 'Platinum' ? 'bg-emerald-500 text-white' : (r.status === 'Silver' ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'))}">${r.status}</span>`;
            if (r.status === 'Silver' && r.acaPremium > 0) badge += `<div class="text-[7px] text-slate-500 mt-1">Prem: ${formatter.formatCurrency(r.acaPremium / inf, 0)}</div>`;
            return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/10 text-[10px]"><td class="p-2 text-center font-bold border-r border-slate-700 bg-slate-800/20">${r.age}</td><td class="p-2 text-right text-slate-400">${formatter.formatCurrency(r.budget / inf, 0)}</td><td class="p-2 text-right font-black text-white">${formatter.formatCurrency(r.magi / inf, 0)}</td><td class="p-2 text-center border-x border-slate-800/50">${badge}</td><td class="p-2 text-right border-r border-slate-800/50">${r.snapBenefit > 0 ? `<span class="text-emerald-400 font-bold">${formatter.formatCurrency(r.snapBenefit / inf, 0)}</span>` : '<span class="text-slate-700">-</span>'}</td>${draws}<td class="p-2 text-right font-black border-l border-slate-700 text-teal-400 bg-slate-800/20">${formatter.formatCurrency(r.netWorth / inf, 0)}</td></tr>`;
        }).join('');
        return `<table class="w-full text-left border-collapse table-auto"><thead class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20"><tr><th class="p-2 border-r border-slate-700 w-10">Age</th><th class="p-2 text-right">Budget</th><th class="p-2 text-right">MAGI</th><th class="p-2 text-center border-x border-slate-800/50">Status</th><th class="p-2 text-right border-r border-slate-800/50 text-emerald-500">SNAP</th>${headerCells}<th class="p-2 text-right border-l border-slate-700">Net Worth</th></tr></thead><tbody>${rows}</tbody></table>`;
    }
};

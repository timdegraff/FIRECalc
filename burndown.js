
import { formatter } from './formatter.js';
import { math, engine, assetColors, stateTaxRates } from './utils.js';

let isRealDollars = false;

export const burndown = {
    // Default order
    priorityOrder: ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa'],
    
    init: () => {
        const container = document.getElementById('tab-burndown');
        container.innerHTML = `
            <div class="flex flex-col gap-6">
                <!-- Strategy Control Bar (Consolidated) -->
                <div class="card-container p-6 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
                    <div class="flex flex-wrap items-center justify-between gap-8 mb-8">
                        <div class="flex flex-col">
                            <h3 class="text-2xl font-black text-white flex items-center gap-3 uppercase tracking-tighter">
                                <i class="fas fa-microchip text-purple-400"></i> Strategy Engine
                            </h3>
                            <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">Decumulation Logic Orchestrator</span>
                        </div>
                        
                        <!-- Top Inputs -->
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
                                <option value="medicaid">Medicaid Max (Limit Income to 138% FPL)</option>
                                <option value="perpetual">Wealth Preservation (Real Flat Principal)</option>
                            </select>
                        </div>

                        <div id="swr-indicator" class="hidden flex flex-col items-center justify-center px-6 border-l border-slate-700">
                            <span class="label-std text-slate-500">Safe Draw (SWR)</span>
                            <span id="swr-value" class="text-teal-400 font-black mono-numbers text-xl">0%</span>
                        </div>
                    </div>

                    <!-- ADVANCED FIRE TOGGLES -->
                    <div class="flex flex-wrap items-center gap-4 border-t border-slate-700/50 pt-6">
                        <label class="flex items-center gap-4 px-5 py-3 bg-slate-900/50 rounded-2xl border border-slate-700 cursor-pointer group transition-all hover:bg-slate-900">
                            <input type="checkbox" id="toggle-rule-72t" class="w-5 h-5 accent-blue-500">
                            <div class="flex flex-col">
                                <span class="label-std text-slate-300 group-hover:text-blue-400 transition-colors">SEPP (72t) Bridge</span>
                                <span class="text-[8px] text-slate-600 uppercase font-black">Dynamic Trigger</span>
                            </div>
                        </label>

                        <button id="btn-dwz-toggle" class="px-5 py-3 bg-slate-900/50 rounded-2xl border border-slate-700 text-left transition-all hover:bg-slate-900 flex items-center gap-4 group min-w-[180px]">
                            <div class="w-5 h-5 rounded-full border-2 border-slate-700 flex items-center justify-center group-[.active]:border-rose-500 group-[.active]:bg-rose-500/20">
                                <div class="w-2 h-2 rounded-full bg-slate-700 group-[.active]:bg-rose-500"></div>
                            </div>
                            <div class="flex flex-col">
                                <span id="dwz-label" class="label-std text-slate-500 group-[.active]:text-rose-400 transition-colors">Die With Zero</span>
                                <span id="dwz-sub" class="text-[8px] text-slate-600 uppercase font-black">Target $0 at Age 100</span>
                            </div>
                        </button>
                        
                        <button id="toggle-burndown-real" class="ml-auto px-5 py-3 bg-slate-900/50 border border-slate-700 rounded-2xl label-std font-black text-slate-400 hover:text-white transition-all flex items-center gap-3">
                            <i class="fas fa-calendar-alt"></i> Nominal Dollars
                        </button>
                    </div>
                    
                    <!-- Priority Reordering (Merged) -->
                    <div class="mt-6 pt-6 border-t border-slate-700/50">
                        <div class="flex flex-wrap items-center gap-4">
                            <span class="label-std text-slate-500 font-black">Draw Order Priority:</span>
                            <div id="draw-priority-list" class="flex flex-wrap gap-2">
                                <!-- Draggable items -->
                            </div>
                            <span class="text-[9px] text-slate-600 italic ml-auto font-bold uppercase tracking-widest"><i class="fas fa-info-circle mr-1"></i> Drag to Reorder</span>
                        </div>
                    </div>

                    <!-- Spending Phases & SS Years -->
                    <div id="burndown-live-sliders" class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6 mt-8 pt-8 border-t border-slate-700/50">
                        <!-- Populated by JS -->
                    </div>
                </div>

                <!-- Main Table -->
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

                    // Auto-Sort Priority based on Strategy
                    if (strategy === 'medicaid') {
                        burndown.priorityOrder = ['taxable', 'cash', 'roth-basis', 'hsa', 'heloc', 'roth-earnings', 'crypto', 'metals', '401k'];
                    } else {
                        // Standard / Perpetual
                        burndown.priorityOrder = ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa'];
                    }
                }
                if (id === 'toggle-budget-sync') {
                    const manualContainer = document.getElementById('manual-budget-container');
                    if (manualContainer) manualContainer.classList.toggle('hidden', el.checked);
                }
                burndown.run();
                window.debouncedAutoSave();
            };
        });
        
        const topRetireSlider = document.getElementById('input-top-retire-age');
        if (topRetireSlider) {
            topRetireSlider.oninput = (e) => {
                const val = e.target.value;
                document.getElementById('label-top-retire-age').textContent = val;
            };
        }

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn) {
            dwzBtn.onclick = () => {
                dwzBtn.classList.toggle('active');
                const active = dwzBtn.classList.contains('active');
                document.getElementById('dwz-sub').textContent = active ? 'Target $0 at Age 100' : 'Hold Assets for Heirs';
                burndown.run();
                window.debouncedAutoSave();
            };
        }

        const manualInput = document.getElementById('input-manual-budget');
        if (manualInput) {
            manualInput.oninput = () => { burndown.run(); window.debouncedAutoSave(); };
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
                window.debouncedAutoSave();
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
        ];
        config.forEach(c => {
            const el = document.getElementById(c.id);
            if (el && data?.[c.key] !== undefined) {
                if (c.type === 'check') el.checked = data[c.key];
                else el.value = data[c.key];
            }
        });
        
        const rAge = window.currentData?.assumptions?.retirementAge || 65;
        const rSlider = document.getElementById('input-top-retire-age');
        if (rSlider) {
             rSlider.value = rAge;
             document.getElementById('label-top-retire-age').textContent = rAge;
        }

        const dwzBtn = document.getElementById('btn-dwz-toggle');
        if (dwzBtn && data?.dieWithZero !== undefined) {
            if (data.dieWithZero) dwzBtn.classList.add('active');
            else dwzBtn.classList.remove('active');
            const active = dwzBtn.classList.contains('active');
            document.getElementById('dwz-sub').textContent = active ? 'Target $0 at Age 100' : 'Hold Assets for Heirs';
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
            isRealDollars
        };
    },

    assetMeta: {
        'cash': { label: 'Cash', short: 'Cash', color: assetColors['Cash'], isTaxable: false, isMagi: false },
        'taxable': { label: 'Taxable Brokerage', short: 'Brokerage', color: assetColors['Taxable'], isTaxable: true, isMagi: true }, // Gains are MAGI
        'roth-basis': { label: 'Roth Basis', short: 'Roth Basis', color: assetColors['Post-Tax (Roth)'], isTaxable: false, isMagi: false },
        'heloc': { label: 'HELOC', short: 'HELOC', color: assetColors['HELOC'], isTaxable: false, isMagi: false },
        '401k': { label: '401k/IRA', short: '401k/IRA', color: assetColors['Pre-Tax (401k/IRA)'], isTaxable: true, isMagi: true },
        'roth-earnings': { label: 'Roth Gains', short: 'Roth Gains', color: assetColors['Roth Gains'], isTaxable: false, isMagi: true }, // Taxable if early
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
                burndown.sortable = new Sortable(priorityList, { animation: 150, onEnd: () => { burndown.priorityOrder = Array.from(priorityList.children).map(el => el.dataset.pk); burndown.run(); window.debouncedAutoSave(); } });
            }
        }

        const stockGrowth = (data.assumptions.stockGrowth || 8) / 100;
        const inflationRate = (data.assumptions.inflation || 3) / 100;
        const swrValue = Math.max(0, stockGrowth - inflationRate);
        const swrEl = document.getElementById('swr-value');
        if (swrEl) swrEl.textContent = `${(swrValue * 100).toFixed(1)}%`;

        let results = [];
        const config = burndown.scrape();

        // DIE WITH ZERO SOLVER (Iterative)
        if (config.dieWithZero && !config.useSync) {
            let low = 0;
            let high = 500000; // Cap solver at 500k to prevent inf loops
            let bestBudget = low;
            let iterations = 0;

            // Simple binary search for budget that leaves ~0 at age 100
            while (low <= high && iterations < 12) {
                const mid = Math.floor((low + high) / 2);
                const simResults = burndown.simulateProjection(data, mid);
                const finalYear = simResults[simResults.length - 1];
                
                if (finalYear.netWorth < 0) {
                    high = mid - 1000;
                } else {
                    bestBudget = mid;
                    low = mid + 1000;
                }
                iterations++;
            }
            // Apply solved budget
            results = burndown.simulateProjection(data, bestBudget);
            
            // Update manual input visually to show the solved number
            const manualInp = document.getElementById('input-manual-budget');
            if (manualInp && document.activeElement !== manualInp) {
                manualInp.value = math.toCurrency(bestBudget);
            }
        } else {
            results = burndown.simulateProjection(data);
        }

        const tableContainer = document.getElementById('burndown-table-container');
        if (tableContainer) tableContainer.innerHTML = burndown.renderTable(results);
    },

    calculate: (data) => {
        // Wrapper for compatibility, now redirects to simulate
        return burndown.simulateProjection(data);
    },

    simulateProjection: (data, overrideManualBudget = null) => {
        const { assumptions, investments = [], otherAssets = [], realEstate = [], income = [], budget = {}, helocs = [], benefits = [], debts = [] } = data;
        const stateConfig = burndown.scrape(); 
        const inflationRate = (assumptions.inflation || 3) / 100;
        
        // Growth Rates
        const stockGrowth = (assumptions.stockGrowth || 8) / 100;
        const cryptoGrowth = (assumptions.cryptoGrowth || 10) / 100;
        const metalsGrowth = (assumptions.metalsGrowth || 6) / 100;
        const realEstateGrowth = (assumptions.realEstateGrowth || 3) / 100;
        
        const filingStatus = assumptions.filingStatus || 'Single';
        const hhSize = benefits.hhSize || 1; 
        const currentYear = new Date().getFullYear();

        // Initialize Balances
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
        
        const simRealEstate = realEstate.map(r => ({ ...r, mortgage: math.fromCurrency(r.mortgage), principalPayment: math.fromCurrency(r.principalPayment) }));
        const simDebts = debts.map(d => ({ ...d, balance: math.fromCurrency(d.balance), principalPayment: math.fromCurrency(d.principalPayment) }));
        const simOtherAssets = otherAssets.map(o => ({ ...o, loan: math.fromCurrency(o.loan), principalPayment: math.fromCurrency(o.principalPayment) }));

        const helocLimit = helocs.reduce((s, h) => s + math.fromCurrency(h.limit), 0);
        
        const baseFpl = 16060 + (hhSize - 1) * 5650;
        const results = [];
        const duration = 100 - assumptions.currentAge;
        
        // SEPP (72t) State
        let seppFixedAmount = 0; 
        let isSeppStarted = false;

        for (let i = 0; i <= duration; i++) {
            const age = assumptions.currentAge + i;
            const currentYearIter = currentYear + i;
            const isRetired = age >= assumptions.retirementAge;
            const yearResult = { age, year: currentYearIter, draws: {}, rothConversion: 0, penalty: 0, seppAmount: 0, acaPremium: 0 };
            const inflationFactor = Math.pow(1 + inflationRate, i);
            const fpl = baseFpl * inflationFactor;

            // 1. Amortize Debts
            const amortize = (arr, key) => arr.reduce((s, item) => {
                if (item[key] > 0) {
                     const annualPrincipal = (item.principalPayment || 0) * 12;
                     item[key] = Math.max(0, item[key] - annualPrincipal);
                }
                return s + item[key];
            }, 0);
            
            const totalMortgage = amortize(simRealEstate, 'mortgage');
            const totalOtherLoans = amortize(simOtherAssets, 'loan');
            const totalDebt = amortize(simDebts, 'balance');

            // 2. Determine Budget
            let baseBudget = 0;
            if (stateConfig.useSync) {
                (budget.expenses || []).forEach(exp => {
                    if (isRetired && exp.removedInRetirement) return;
                    const amount = math.fromCurrency(exp.annual);
                    if (exp.isFixed) baseBudget += amount;
                    else baseBudget += (amount * inflationFactor);
                });
            } else {
                // If override is provided (from Solver), use it
                const startBudget = overrideManualBudget !== null ? overrideManualBudget : (stateConfig.manualBudget || 100000);
                baseBudget = startBudget * inflationFactor;
            }

            // Apply Spending Phases
            let targetBudget = baseBudget;
            if (isRetired) {
                if (age < 65) targetBudget *= (assumptions.slowGoFactor || 1.1);
                else if (age < 80) targetBudget *= (assumptions.midGoFactor || 1.0);
                else targetBudget *= (assumptions.noGoFactor || 0.85);
            }

            const currentREVal = realEstate.reduce((s, r) => s + (math.fromCurrency(r.value) * Math.pow(1 + realEstateGrowth, i)), 0);
            const currentREEquity = currentREVal - totalMortgage;
            const fixedOtherAssetsVal = otherAssets.reduce((s, o) => s + math.fromCurrency(o.value), 0);
            const currentNW = (bal['cash'] + bal['taxable'] + bal['roth-basis'] + bal['roth-earnings'] + bal['401k'] + bal['crypto'] + bal['metals'] + bal['hsa'] + fixedOtherAssetsVal + currentREEquity) - bal['heloc'] - totalOtherLoans - totalDebt;

            if (stateConfig.strategy === 'perpetual') {
                const safeRate = Math.max(0, stockGrowth - inflationRate);
                targetBudget = currentNW * safeRate;
            }

            // 3. Build Income Stack (Pre-Draw)
            let ordinaryIncomeBase = 0;
            let ltcgIncomeBase = 0;
            let netIncomeAvailable = 0; 
            let totalPreTaxDeductions = 0;

            // 3a. Active Income
            const activeIncomes = isRetired ? income.filter(inc => inc.remainsInRetirement) : income;
            activeIncomes.forEach(inc => {
                let grossBase = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1);
                let directExp = math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly ? 12 : 1);
                grossBase *= Math.pow(1 + (inc.increase / 100 || 0), i);
                const bonus = grossBase * (parseFloat(inc.bonusPct) / 100 || 0);
                const netSourceIncome = (grossBase + bonus) - directExp;

                if (inc.nonTaxableUntil && parseInt(inc.nonTaxableUntil) >= currentYearIter) {
                    netIncomeAvailable += netSourceIncome;
                } else {
                    ordinaryIncomeBase += netSourceIncome;
                    netIncomeAvailable += netSourceIncome;
                    totalPreTaxDeductions += grossBase * (parseFloat(inc.contribution) / 100 || 0);
                }
            });

            // 3b. Social Security
            const ssGross = (age >= assumptions.ssStartAge) ? engine.calculateSocialSecurity(assumptions.ssMonthly || 0, assumptions.workYearsAtRetirement || 35, inflationFactor) : 0;
            const ssTaxableFederal = engine.calculateTaxableSocialSecurity(ssGross, ordinaryIncomeBase - totalPreTaxDeductions, filingStatus);
            ordinaryIncomeBase += ssTaxableFederal;
            netIncomeAvailable += ssGross;

            // 3c. Mandatory Distributions (RMDs & SEPP - if started)
            let mandatoryDist = 0;
            
            // SEPP (72t) - Mandatory Phase
            if (stateConfig.useSEPP && isSeppStarted && age < 60 && bal['401k'] > 0) {
                 const amt = Math.min(bal['401k'], seppFixedAmount);
                 bal['401k'] -= amt;
                 ordinaryIncomeBase += amt;
                 netIncomeAvailable += amt;
                 mandatoryDist += amt;
                 yearResult.seppAmount = amt;
                 yearResult.draws['401k'] = (yearResult.draws['401k'] || 0) + amt;
            } else if (age >= 60) {
                 isSeppStarted = false; // Turn off at 60
            }

            // RMDs - Precheck Collision with Medicaid
            let rmd = 0;
            if (age >= 75) {
                rmd = engine.calculateRMD(bal['401k'], age);
                bal['401k'] -= rmd;
                ordinaryIncomeBase += rmd;
                netIncomeAvailable += rmd;
                mandatoryDist += rmd;
                yearResult.rmdAmount = rmd;
                yearResult.draws['401k'] = (yearResult.draws['401k'] || 0) + rmd;
            }

            // Deduct contributions
            totalPreTaxDeductions += (budget.savings?.filter(s => s.type === 'HSA').reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0);
            ordinaryIncomeBase -= totalPreTaxDeductions;
            netIncomeAvailable -= totalPreTaxDeductions;

            // 4. Optimization Engine (Medicaid vs Standard)
            const medicaidCeiling = fpl * (data.isPregnant ? 1.95 : 1.38);
            
            // RMD Collision Check: If RMD blows up Medicaid, disable strategy for this year
            let isMedicaidStrategy = stateConfig.strategy === 'medicaid' && age < 65;
            if (isMedicaidStrategy && (ordinaryIncomeBase + ltcgIncomeBase) > medicaidCeiling) {
                // RMD or Income already exceeded limit, fallback to standard to avoid failure loop
                isMedicaidStrategy = false; 
            }
            
            const passes = [];
            const priority = burndown.priorityOrder; 

            if (isMedicaidStrategy) {
                const magiSources = priority.filter(k => burndown.assetMeta[k].isMagi);
                const nonMagiSources = priority.filter(k => !burndown.assetMeta[k].isMagi);
                // Pass 1: Taxable (Fill Bracket/Standard Deduction) - Skim Basis first
                passes.push({ keys: magiSources, limitByMagi: true });
                // Pass 2: Non-Taxable (Fill Budget)
                passes.push({ keys: nonMagiSources, limitByMagi: false });
                // Pass 3: Taxable (Overflow)
                passes.push({ keys: magiSources, limitByMagi: false });
            } else {
                // Standard: One pass
                passes.push({ keys: priority, limitByMagi: false });
            }

            let ordinaryIncomeIter = ordinaryIncomeBase;
            let ltcgIncomeIter = ltcgIncomeBase;
            let assetsDrawnThisYear = 0;

            // Converge Tax Loop
            for (let taxLoop = 0; taxLoop < 3; taxLoop++) {
                let iterationTax = engine.calculateTax(ordinaryIncomeIter, ltcgIncomeIter, filingStatus, assumptions.state, inflationFactor);
                let currentTotalNeed = targetBudget + iterationTax;
                let cashOnHand = netIncomeAvailable + assetsDrawnThisYear; 
                let shortfall = currentTotalNeed - cashOnHand;

                if (shortfall <= 5) break; 

                // Execute Passes
                passes.forEach(pass => {
                    if (shortfall <= 0) return;
                    
                    pass.keys.forEach(pk => {
                         if (shortfall <= 0) return;
                         let available = (pk === 'heloc') ? (helocLimit - bal['heloc']) : bal[pk];
                         if (available <= 0) return;
                         
                         // Check SEPP Constraints for 401k
                         if (pk === '401k' && age < 59.5) {
                             if (isSeppStarted) {
                                 available = 0; // Already took mandatory amount
                             } else if (stateConfig.useSEPP) {
                                 // PARTITIONED SEPP LOGIC
                                 // We only enable SEPP if we actually need the money.
                                 // Calculate EXACTLY how much we need from 401k to fill gap
                                 const neededFrom401k = shortfall; // Assuming no other sources after this
                                 
                                 // Max Allowed Factor (Annuitization approximation)
                                 const maxFactor = engine.calculateMaxSepp(100000, age) / 100000;
                                 
                                 // The actual 72t amount must be determined now and fixed
                                 // We want to withdraw 'neededFrom401k'. 
                                 // Constraint: neededFrom401k <= bal['401k'] * maxFactor
                                 const maxPossibleSepp = bal['401k'] * maxFactor;
                                 
                                 const targetSepp = Math.min(neededFrom401k, maxPossibleSepp);
                                 
                                 // Start SEPP
                                 isSeppStarted = true;
                                 seppFixedAmount = targetSepp;
                                 
                                 // Execute Draw
                                 bal['401k'] -= targetSepp;
                                 ordinaryIncomeIter += targetSepp;
                                 yearResult.seppAmount = targetSepp;
                                 yearResult.draws['401k'] = (yearResult.draws['401k'] || 0) + targetSepp;
                                 assetsDrawnThisYear += targetSepp;
                                 shortfall -= targetSepp;
                                 
                                 available = 0; 
                                 return; 
                             } else {
                                 // No SEPP enabled - cannot touch 401k
                                 available = 0;
                             }
                         }

                         if (available <= 0) return;

                         // Calculate Draw Limit based on Pass Rules
                         let drawLimit = available;
                         
                         if (pass.limitByMagi) {
                             const currentMagi = ordinaryIncomeIter + ltcgIncomeIter;
                             const headroom = Math.max(0, medicaidCeiling - currentMagi);
                             
                             if (pk === 'taxable' && isMedicaidStrategy) {
                                 // BASIS SKIMMING LOGIC
                                 // In Medicaid Strat, we assume Specific ID: sell basis (0 gain) first.
                                 // We can draw up to 'taxableBasis' without ANY impact on MAGI.
                                 const remainingBasis = bal['taxableBasis'];
                                 
                                 // If we have basis, we can draw it freely (limited only by shortfall)
                                 // If we run out of basis, THEN we hit the headroom limit logic (100% gain)
                                 
                                 // Logic handled in Draw Block below
                             } else if (burndown.assetMeta[pk].isMagi) {
                                 drawLimit = Math.min(drawLimit, headroom);
                             }
                         }

                         const amountToTake = Math.min(drawLimit, shortfall);
                         
                         if (amountToTake > 0) {
                             if (pk === 'heloc') bal['heloc'] += amountToTake;
                             else bal[pk] -= amountToTake;

                             yearResult.draws[pk] = (yearResult.draws[pk] || 0) + amountToTake;
                             assetsDrawnThisYear += amountToTake;
                             shortfall -= amountToTake;

                             if (pk === 'taxable') {
                                // Basis Skimming for Medicaid
                                if (isMedicaidStrategy) {
                                    const basisToUse = Math.min(amountToTake, bal['taxableBasis']);
                                    const gainToUse = amountToTake - basisToUse;
                                    
                                    bal['taxableBasis'] -= basisToUse;
                                    ltcgIncomeIter += gainToUse; 
                                } else {
                                    // Standard Average Cost Basis
                                    const currentBasis = bal['taxableBasis'];
                                    const currentVal = bal['taxable'] + amountToTake;
                                    const gainRatio = currentVal > 0 ? Math.max(0, (currentVal - currentBasis) / currentVal) : 0;
                                    const gainPart = amountToTake * gainRatio;
                                    ltcgIncomeIter += gainPart;
                                    bal['taxableBasis'] -= (amountToTake - gainPart);
                                }
                             } else if (burndown.assetMeta[pk].isTaxable || burndown.assetMeta[pk].isMagi) {
                                ordinaryIncomeIter += amountToTake;
                             }
                             if (pk === 'roth-earnings' && age < 59.5) {
                                 ordinaryIncomeIter += amountToTake; 
                             }
                         }
                    });
                });
            }

            // 5. Final Reconcile & Surplus
            let finalTax = engine.calculateTax(ordinaryIncomeIter, ltcgIncomeIter, filingStatus, assumptions.state, inflationFactor);
            
            // ACA Fallback Cost
            const totalMagi = ordinaryIncomeIter + ltcgIncomeIter;
            let acaCost = 0;
            if (isMedicaidStrategy && totalMagi > medicaidCeiling) {
                // Failed Medicaid Cliff -> Must buy Silver Plan
                // Cap approx 8.5% of income
                acaCost = totalMagi * 0.085;
                yearResult.acaPremium = acaCost;
            }

            let finalCash = netIncomeAvailable + assetsDrawnThisYear - finalTax - acaCost;
            let surplus = finalCash - targetBudget;

            if (surplus > 0) {
                if (bal['heloc'] > 0) {
                    const paydown = Math.min(bal['heloc'], surplus);
                    bal['heloc'] -= paydown;
                } else {
                    bal['taxable'] += surplus;
                    bal['taxableBasis'] += surplus;
                }
            } else if (surplus < 0) {
                // Deficit due to Taxes or ACA Cost late in calculation
                // For simplicity in this simulation, we just reduce NW or Heloc
                if (bal['cash'] > Math.abs(surplus)) bal['cash'] += surplus; // surplus is neg
                else bal['heloc'] -= surplus; // increase heloc
            }
            
            yearResult.balances = { ...bal };
            yearResult.budget = targetBudget;
            yearResult.magi = totalMagi;
            yearResult.netWorth = currentNW;
            
            yearResult.isMedicaid = (age < 65) && (totalMagi <= medicaidCeiling);
            yearResult.isSilver = (age < 65) && (totalMagi <= fpl * 2.5 && !yearResult.isMedicaid);
            results.push(yearResult);

            // 6. Growth
            bal['taxable'] *= (1 + stockGrowth);
            bal['401k'] *= (1 + stockGrowth);
            bal['hsa'] *= (1 + stockGrowth);
            bal['crypto'] *= (1 + cryptoGrowth);
            bal['metals'] *= (1 + metalsGrowth);
            let totalHeloc = bal['heloc'];
            let weightedRateSum = helocs.reduce((s, h) => s + (math.fromCurrency(h.balance) * (parseFloat(h.rate) || 7.0)), 0);
            let avgHelocRate = (totalHeloc > 0 ? (weightedRateSum / totalHeloc) : 7.0) / 100;
            if (bal['heloc'] > 0) bal['heloc'] *= (1 + avgHelocRate);
            
            const rothGrowth = (bal['roth-basis'] + bal['roth-earnings']) * stockGrowth;
            bal['roth-earnings'] += rothGrowth;
        }
        return results;
    },

    renderTable: (results) => {
        const keys = burndown.priorityOrder;
        const infRate = (window.currentData.assumptions.inflation || 3) / 100;
        const headerCells = keys.map(k => `<th class="p-2 text-right text-[9px] min-w-[75px]" style="color: ${burndown.assetMeta[k]?.color}">${burndown.assetMeta[k]?.short}</th>`).join('');
        
        const rows = results.map((r, i) => {
            const inf = isRealDollars ? Math.pow(1 + infRate, i) : 1;
            const draws = keys.map(k => {
                const amt = (r.draws[k] || 0) / inf;
                const bal = r.balances[k] / inf;
                const meta = burndown.assetMeta[k];
                const is72t = k === '401k' && (r.seppAmount || 0) > 0;
                const isRmd = k === '401k' && (r.rmdAmount || 0) > 0;
                return `<td class="p-1.5 text-right border-l border-slate-800/50">
                    <div class="${amt > 0 ? 'font-bold' : 'text-slate-700'}" ${amt > 0 ? `style="color: ${meta.color}"` : ''}>
                        ${formatter.formatCurrency(amt, 0)}
                        ${is72t ? '<span class="text-[7px] block opacity-60">72t</span>' : ''}
                        ${isRmd ? '<span class="text-[7px] block opacity-60 text-amber-500">RMD</span>' : ''}
                    </div>
                    <div class="text-[8px] opacity-40">${formatter.formatCurrency(bal, 0)}</div>
                </td>`;
            }).join('');
            
            let badge;
            if (r.age >= 65) {
                 badge = `<span class="px-2 py-1 rounded bg-slate-600 text-white text-[9px] font-black uppercase">Medicare</span>`;
            } else if (r.isMedicaid) {
                 badge = `<span class="px-2 py-1 rounded bg-emerald-500 text-white text-[9px] font-black uppercase">Medicaid</span>`;
            } else if (r.isSilver) {
                 badge = `<div class="flex flex-col items-center"><span class="px-2 py-1 rounded bg-blue-500 text-white text-[9px] font-black uppercase">Silver</span><span class="text-[8px] text-slate-500 mt-0.5">ACA Prem: ${formatter.formatCurrency(r.acaPremium/inf, 0)}</span></div>`;
            } else {
                 badge = `<span class="px-2 py-1 rounded bg-slate-700 text-slate-400 text-[9px] font-black">Standard</span>`;
            }
            
            return `<tr class="border-b border-slate-800/50 hover:bg-slate-800/10 text-[10px]">
                <td class="p-2 text-center font-bold border-r border-slate-700 bg-slate-800/20">${r.age}</td>
                <td class="p-2 text-right text-slate-400">${formatter.formatCurrency(r.budget / inf, 0)}</td>
                <td class="p-2 text-right font-black text-white">${formatter.formatCurrency(r.magi / inf, 0)}</td>
                <td class="p-2 text-center border-x border-slate-800/50">${badge}</td>
                ${draws}
                <td class="p-2 text-right font-black border-l border-slate-700 text-teal-400 bg-slate-800/20">${formatter.formatCurrency(r.netWorth / inf, 0)}</td>
            </tr>`;
        }).join('');
        
        return `<table class="w-full text-left border-collapse table-auto" style="font-family: 'Inter', sans-serif;">
            <thead class="sticky top-0 bg-slate-800 text-slate-500 label-std z-20">
                <tr>
                    <th class="p-2 border-r border-slate-700 w-10">Age</th>
                    <th class="p-2 text-right">Budget</th>
                    <th class="p-2 text-right">MAGI</th>
                    <th class="p-2 text-center border-x border-slate-800/50">Status</th>
                    ${headerCells}
                    <th class="p-2 text-right border-l border-slate-700">Net Worth</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>`;
    }
};

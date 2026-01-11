import { math, engine, stateTaxRates } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-4">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <!-- Household Section -->
                    <div class="card-container p-5 flex flex-col justify-between">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h3 class="text-xs font-black text-white uppercase tracking-widest">Household Structure</h3>
                                <p class="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Define dependents and their independence year</p>
                            </div>
                            <button id="btn-add-dependent" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100">
                                <i class="fas fa-plus text-[10px]"></i>
                                <span class="text-[10px] font-black uppercase tracking-widest label-text">Add Child</span>
                            </button>
                        </div>

                        <div id="hh-visual-strip" class="flex flex-wrap items-center gap-4 min-h-[80px] mb-4">
                            <!-- Adults -->
                            <div id="adult-icons" class="flex items-center gap-4"></div>
                            <!-- Kids -->
                            <div id="dependents-list" class="flex items-center gap-4 border-l border-white/5 pl-4"></div>
                        </div>

                        <!-- Household Specific Costs -->
                        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                            <div>
                                <label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Child Support Paid</label>
                                <input type="text" data-benefit-id="childSupportPaid" data-type="currency" class="input-base text-xs font-bold text-pink-400 mono-numbers h-8" value="$0">
                            </div>
                            <div>
                                <label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Dependent Care</label>
                                <input type="text" data-benefit-id="depCare" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers h-8" value="$0">
                            </div>
                        </div>
                    </div>

                    <!-- Sandbox & Env Costs -->
                    <div class="card-container p-5 flex flex-col justify-between">
                        <div class="flex justify-between items-start mb-6">
                            <div class="flex flex-col">
                                <h3 class="text-xs font-black text-white uppercase tracking-widest">Sandbox MAGI</h3>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <span class="text-[8px] font-black text-slate-500 uppercase">W2/1099 Income?</span>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isEarnedIncome" class="sr-only peer" checked>
                                        <div class="w-6 h-3 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                            </div>
                            <div class="flex gap-6">
                                <div class="text-right">
                                    <span class="text-[7px] font-black text-slate-600 uppercase block">Monthly</span>
                                    <span id="label-magi-mo" class="text-sm font-black text-teal-400 mono-numbers">$0</span>
                                </div>
                                <div class="text-right">
                                    <span class="text-[7px] font-black text-slate-600 uppercase block">Annual</span>
                                    <span id="label-magi-yr" class="text-sm font-black text-teal-400 mono-numbers">$0K</span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="mb-6 relative h-6 flex items-center">
                            <style id="dynamic-slider-style"></style>
                            <input type="range" id="benefit-magi-slider" data-benefit-id="unifiedIncomeAnnual" min="0" max="200000" step="1000" value="25000" class="benefit-slider w-full !bg-transparent z-10">
                            <div id="slider-track-visual" class="absolute left-0 right-0 h-1 rounded-full overflow-hidden pointer-events-none"></div>
                        </div>
                        <p class="text-[7px] text-slate-500 font-bold uppercase tracking-widest text-center">Adjust annual household income for simulation</p>
                        
                        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                            <div>
                                <label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Shelter Costs</label>
                                <input type="text" data-benefit-id="shelterCosts" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers h-8" value="$700">
                            </div>
                            <div id="medical-input-wrap">
                                <label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Medical Expenses</label>
                                <input type="text" data-benefit-id="medicalExps" data-type="currency" class="input-base text-xs font-bold text-blue-400 mono-numbers h-8" value="$0">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Strip -->
                <div class="card-container px-6 py-3 flex items-center justify-between bg-black/20">
                    <div class="flex items-center gap-3">
                        <span class="text-[8px] font-black text-slate-600 uppercase tracking-widest">Total Size:</span>
                        <div class="flex items-center gap-2">
                            <span id="hh-total-size-badge" class="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-white mono-numbers">1</span>
                            <span id="hh-composition-text" class="text-[9px] font-black text-slate-500 uppercase">Self Only</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-8">
                        <div class="flex items-center gap-3">
                            <label class="text-[8px] font-black text-slate-500 uppercase">Disabled</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" data-benefit-id="isDisabled" class="sr-only peer">
                                <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="text-[8px] font-black text-slate-500 uppercase">Pregnant</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" data-benefit-id="isPregnant" class="sr-only peer">
                                <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-teal-600"></div>
                            </label>
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="text-[8px] font-black text-slate-500 uppercase">Utility Allowance (SUA)</label>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" data-benefit-id="hasSUA" class="sr-only peer" checked>
                                <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                    </div>
                </div>

                <!-- Glossary -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5 opacity-50">
                    <div class="space-y-1">
                        <p class="text-[8px] font-black text-white uppercase tracking-widest leading-none">Independence Year</p>
                        <p class="text-[8px] text-slate-500 font-medium">The year the child turns 19. They are removed from household size calculations after this date.</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-[8px] font-black text-white uppercase tracking-widest leading-none">Utility Allowance (SUA)</p>
                        <p class="text-[8px] text-slate-500 font-medium">Fixed deduction for heating/cooling. Almost always beneficial to check if you pay for utilities.</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-[8px] font-black text-white uppercase tracking-widest leading-none">W2/1099 vs Unearned</p>
                        <p class="text-[8px] text-slate-500 font-medium">Earned income (work) gets a 20% deduction in SNAP math. Unearned (Dividends/SS) does not.</p>
                    </div>
                </div>
            </div>
        `;

        benefits.attachListeners();
        benefits.refresh();
    },

    attachListeners: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.querySelectorAll('input:not([data-id="depYear"])').forEach(input => {
            if (input.dataset.type === 'currency') import('./formatter.js').then(f => f.formatter.bindCurrencyEventListeners(input));
            input.oninput = () => { 
                benefits.refresh(); 
                if (window.debouncedAutoSave) window.debouncedAutoSave(); 
            };
        });

        const addBtn = document.getElementById('btn-add-dependent');
        if (addBtn) {
            addBtn.onclick = () => { 
                benefits.addDependent(); 
                benefits.refresh(); 
                if (window.debouncedAutoSave) window.debouncedAutoSave(); 
            };
        }

        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="remove-dependent"]');
            if (btn) { 
                btn.closest('.dependent-visual-item').remove(); 
                benefits.refresh(); 
                if (window.debouncedAutoSave) window.debouncedAutoSave(); 
            }
        });

        // Allow direct editing of the year inputs
        container.addEventListener('input', (e) => {
            if (e.target.dataset.id === 'depYear') {
                benefits.refresh();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        });
    },

    addDependent: (data = {}) => {
        const list = document.getElementById('dependents-list'); if (!list) return;
        
        // Enforce SNAP total size limit (Adults + Kids <= 8)
        const filingStatus = window.currentData?.assumptions?.filingStatus || 'Single';
        const adults = filingStatus === 'Married Filing Jointly' ? 2 : 1;
        const currentKids = list.querySelectorAll('.dependent-visual-item').length;
        if (adults + currentKids >= 8) return;

        const item = document.createElement('div');
        item.className = 'dependent-visual-item flex flex-col items-center group relative';
        const currentYear = new Date().getFullYear();
        const yearVal = data.independenceYear || (currentYear + 10);
        const nameVal = data.name || 'Child';
        
        item.innerHTML = `
            <div class="relative w-12 h-12 flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:border-blue-400 transition-all shadow-lg shadow-blue-900/10">
                    <i class="fas fa-baby text-base"></i>
                </div>
                <button data-action="remove-dependent" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <input data-id="depName" type="text" value="${nameVal}" class="bg-transparent border-none outline-none font-bold text-slate-500 text-[8px] uppercase tracking-widest text-center w-14 mt-1 focus:text-white" placeholder="Name">
            <div class="mt-0.5">
                <input data-id="depYear" type="number" value="${yearVal}" class="bg-slate-900/50 border border-white/10 rounded px-1 py-0.5 font-black text-blue-400 text-[9px] w-12 text-center mono-numbers outline-none focus:border-blue-500" title="Year child turns 19">
            </div>
        `;
        list.appendChild(item);
    },

    refresh: () => {
        const data = benefits.scrape();
        const c = document.getElementById('benefits-module'); if (!c) return;
        
        const annualMAGI = data.unifiedIncomeAnnual;
        const monthlyMAGI = Math.round(annualMAGI / 12);
        const annualK = Math.round(annualMAGI / 1000);
        
        document.getElementById('label-magi-mo').textContent = math.toCurrency(monthlyMAGI);
        document.getElementById('label-magi-yr').textContent = `$${annualK}K`;
        
        const medWrap = document.getElementById('medical-input-wrap');
        if (medWrap) medWrap.classList.toggle('opacity-40', !data.isDisabled);
        
        const filingStatus = window.currentData?.assumptions?.filingStatus || 'Single';
        const isMFJ = filingStatus === 'Married Filing Jointly';
        
        const adultIcons = document.getElementById('adult-icons');
        if (adultIcons) {
            adultIcons.innerHTML = isMFJ ? `
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <i class="fas fa-user-friends text-sm"></i>
                    </div>
                    <span class="text-[8px] font-black text-slate-500 uppercase mt-2">Couple</span>
                </div>
            ` : `
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <i class="fas fa-user text-sm"></i>
                    </div>
                    <span class="text-[8px] font-black text-slate-500 uppercase mt-2">Individual</span>
                </div>
            `;
        }

        let adults = isMFJ ? 2 : 1;
        let kids = data.dependents.length;
        const totalSize = adults + kids;
        if (document.getElementById('hh-composition-text')) document.getElementById('hh-composition-text').textContent = `${adults} Adult${adults > 1 ? 's' : ''} ${kids > 0 ? '+ ' + kids + ' Dependent' + (kids > 1 ? 's' : '') : ''}`;
        if (document.getElementById('hh-total-size-badge')) document.getElementById('hh-total-size-badge').textContent = totalSize;
        
        // Handle "Add Child" button state based on SNAP 8-person limit
        const addBtn = document.getElementById('btn-add-dependent');
        if (addBtn) {
            const isLimitReached = totalSize >= 8;
            addBtn.disabled = isLimitReached;
            const btnText = addBtn.querySelector('.label-text');
            if (btnText) btnText.textContent = isLimitReached ? "Max Reached" : "Add Child";
        }

        const stateId = window.currentData?.assumptions?.state || 'Michigan';
        const stateMeta = stateTaxRates[stateId];
        const fplBase = stateMeta?.fplBase || 16060;
        const fpl2026Annual = fplBase + (totalSize - 1) * 5650;
        const ratio = annualMAGI / fpl2026Annual;
        const medRatio = data.isPregnant ? 1.95 : 1.38;
        const silverRatio = 2.50;

        // Dynamic Slider Track Styling
        const sliderMax = 200000;
        const platBoundary = (fpl2026Annual * medRatio / sliderMax) * 100;
        const silverBoundary = (fpl2026Annual * silverRatio / sliderMax) * 100;
        const trackVisual = document.getElementById('slider-track-visual');
        if (trackVisual) {
            trackVisual.style.background = `linear-gradient(to right, #10b981 0%, #10b981 ${platBoundary}%, #3b82f6 ${platBoundary}%, #3b82f6 ${silverBoundary}%, #475569 ${silverBoundary}%, #475569 100%)`;
        }
        
        let expectedContributionPct = ratio <= 1.5 ? 0 : (ratio <= 2.0 ? 0.00 + ((ratio - 1.5) / 0.5) * 0.02 : (ratio <= 2.5 ? 0.02 + ((ratio - 2.0) / 0.5) * 0.02 : 0.085));
        let dynamicPremium = ratio > medRatio ? (annualMAGI * expectedContributionPct) / 12 : 0;

        const earned = data.isEarnedIncome ? monthlyMAGI : 0;
        const unearned = data.isEarnedIncome ? 0 : monthlyMAGI;
        const assetsForTest = window.currentData?.investments?.filter(i => i.type === 'Cash' || i.type === 'Taxable' || i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0) || 0;
        const estimatedBenefit = engine.calculateSnapBenefit(earned, unearned, assetsForTest, totalSize, data.shelterCosts, data.hasSUA, data.isDisabled, data.childSupportPaid, data.depCare, data.medicalExps, stateId);

        // Update Top Cards with correct logic - Use clean base classes to avoid misaligned borders
        const healthCard = document.getElementById('benefit-summary-health');
        const snapCard = document.getElementById('benefit-summary-snap');
        
        const updateTopCard = (name, sub, prem, ded, theme) => {
            const planEl = document.getElementById('sum-health-plan');
            if (planEl) {
                planEl.innerHTML = `
                    <div class="flex flex-col items-center text-center">
                        <span class="text-xl font-black uppercase tracking-tight ${theme.text}">${name}</span>
                        <span class="text-[10px] font-black uppercase tracking-widest opacity-60 mt-1">${sub}</span>
                    </div>
                `;
            }
            if (healthCard) {
                healthCard.className = `p-6 flex flex-col items-center justify-center h-28 border-l-4 transition-all duration-300 rounded-2xl bg-slate-900/40 border-2 ${theme.border}`;
            }
            
            const premEl = document.getElementById('sum-health-prem');
            const dedEl = document.getElementById('sum-health-ded');
            if (premEl) premEl.textContent = prem;
            if (dedEl) dedEl.textContent = ded;
        };

        const themes = {
            platinum: { text: 'text-emerald-400', border: 'border-emerald-500/50' },
            silver: { text: 'text-blue-400', border: 'border-blue-500/50' },
            standard: { text: 'text-slate-500', border: 'border-white/5' }
        };

        if (ratio <= medRatio && stateMeta?.expanded !== false) {
            updateTopCard("Platinum (Medicaid)", "100% Full Coverage", "$0", "$0", themes.platinum);
        } else if (ratio <= silverRatio) {
            updateTopCard("Silver CSR (High Subsidy)", "Low Copays", math.toCurrency(dynamicPremium), "$800", themes.silver);
        } else {
            updateTopCard("Standard ACA", "Full Cost Market", math.toCurrency(dynamicPremium), "$4,000+", themes.standard);
        }

        const globalSnapRes = document.getElementById('sum-snap-amt');
        if (globalSnapRes) {
            globalSnapRes.textContent = math.toCurrency(estimatedBenefit);
            const isSnapActive = estimatedBenefit > 1;
            globalSnapRes.className = `text-4xl font-black ${isSnapActive ? 'text-emerald-400' : 'text-slate-500'} mono-numbers tracking-tight`;
            
            if (snapCard) {
                snapCard.className = `p-6 flex flex-col items-center justify-center h-28 border-l-4 transition-all duration-300 rounded-2xl bg-slate-900/40 border-2 ${isSnapActive ? 'border-emerald-500/50' : 'border-white/5'}`;
            }
        }
    },

    scrape: () => {
        const c = document.getElementById('benefits-module'); if (!c) return { unifiedIncomeAnnual: 25000, dependents: [] };
        const get = (id, bool = false) => { const el = c.querySelector(`[data-benefit-id="${id}"]`); if (!el) return bool ? false : 0; if (el.type === 'checkbox') return el.checked; if (el.dataset.type === 'currency') return math.fromCurrency(el.value); return parseFloat(el.value) || 0; };
        return { 
            unifiedIncomeAnnual: get('unifiedIncomeAnnual'), 
            shelterCosts: get('shelterCosts'), 
            childSupportPaid: get('childSupportPaid'), 
            depCare: get('depCare'), 
            medicalExps: get('medicalExps'), 
            hasSUA: get('hasSUA'), 
            isEarnedIncome: get('isEarnedIncome'), 
            isDisabled: get('isDisabled'), 
            isPregnant: get('isPregnant'), 
            dependents: Array.from(c.querySelectorAll('.dependent-visual-item')).map(item => ({ 
                name: item.querySelector('[data-id="depName"]').value, 
                independenceYear: parseInt(item.querySelector('[data-id="depYear"]').value) 
            })) 
        };
    },

    load: (data) => {
        if (!data) return;
        const c = document.getElementById('benefits-module'); if (!c) return;
        const list = document.getElementById('dependents-list'); if (list) list.innerHTML = '';
        (data.dependents || []).forEach(d => benefits.addDependent(d));
        Object.entries(data).forEach(([key, val]) => { if (key === 'dependents') return; const el = c.querySelector(`[data-benefit-id="${key}"]`); if (el) { if (el.type === 'checkbox') el.checked = !!val; else if (el.dataset.type === 'currency') el.value = math.toCurrency(val); else el.value = val; } });
        benefits.refresh();
    }
};
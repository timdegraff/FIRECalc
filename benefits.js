

import { math, engine, stateTaxRates, STATE_NAME_TO_CODE } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-4">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <!-- Household Section -->
                    <div class="card-container p-5 flex flex-col justify-between relative overflow-hidden">
                        <div id="gap-alert-bg" class="absolute inset-0 bg-red-500/5 opacity-0 transition-opacity pointer-events-none"></div>
                        <div class="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h3 class="text-xs font-black text-white uppercase tracking-widest">Household Structure</h3>
                                <p class="text-[8px] text-slate-500 font-bold uppercase mt-0.5">Enter birth years to project future changes in household size and benefit thresholds</p>
                            </div>
                            <button id="btn-add-dependent" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100">
                                <i class="fas fa-plus text-[10px]"></i>
                                <span class="text-[10px] font-black uppercase tracking-widest label-text">Add Child</span>
                            </button>
                        </div>

                        <div id="hh-visual-strip" class="flex flex-wrap items-center gap-4 min-h-[80px] mb-4 relative z-10">
                            <!-- Adults -->
                            <div id="adult-icons" class="flex items-center gap-4"></div>
                            <!-- Kids -->
                            <div id="dependents-list" class="flex items-center gap-4 border-l border-white/5 pl-4"></div>
                        </div>

                        <!-- Household Specific Costs -->
                        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-white/5 relative z-10">
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
                        
                        <div class="mb-4 relative h-6 flex items-center">
                            <style id="dynamic-slider-style"></style>
                            <input type="range" id="benefit-magi-slider" data-benefit-id="unifiedIncomeAnnual" min="0" max="200000" step="1000" value="25000" class="benefit-slider w-full !bg-transparent z-10">
                            <div id="slider-track-visual" class="absolute left-0 right-0 h-1 rounded-full overflow-hidden pointer-events-none"></div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-3 pt-2 mb-2">
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

                <!-- Warnings / State Alerts -->
                <div id="state-policy-alert" class="hidden p-4 bg-red-900/20 border border-red-500/30 rounded-2xl flex items-center gap-4 animate-pulse">
                    <div class="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-black text-red-400 uppercase tracking-widest">Medicaid Coverage Gap Alert</h4>
                        <p id="state-alert-text" class="text-[11px] text-slate-300 leading-tight mt-0.5">Your state did not expand Medicaid. Making less than 100% FPL means NO subsidy and NO Medicaid. Recommend increasing MAGI to cross the 100% FPL threshold to qualify for ACA subsidies.</p>
                    </div>
                </div>

                <!-- Footer Strip -->
                <div class="card-container px-6 py-3 flex items-center justify-between bg-black/20">
                    <div class="flex items-center gap-3">
                        <span class="text-[8px] font-black text-slate-600 uppercase tracking-widest">Effective HH Size:</span>
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

                <!-- Advanced Explanation Notes -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5">
                    <div class="p-2">
                         <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i class="fas fa-info-circle"></i> Benefit Modeling Logic</h4>
                         <div class="space-y-3">
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                <strong class="text-white">Asset Test:</strong> This calculator ignores asset tests. Be aware that the following states typically enforce asset limits ($2,750 - $5,000) which may disqualify you if you have savings: <strong>Texas, Idaho, Indiana, Iowa, Kansas, Mississippi, Missouri, South Dakota, Tennessee, Wyoming.</strong>
                            </p>
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                <strong class="text-white">Birth Years:</strong> Dependents are modeled as independent at age 19. Birth years making a child 19 or older in the current year are excluded from the effective household size.
                            </p>
                         </div>
                    </div>
                    <div class="p-2">
                         <h4 class="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-3 flex items-center gap-2"><i class="fas fa-shield-virus"></i> Medicaid Expansion Logic</h4>
                         <div class="space-y-3">
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                <strong class="text-white">Expansion States:</strong> Cover adults up to 138% FPL ($0 cost). 
                            </p>
                            <p class="text-[11px] text-slate-400 leading-relaxed">
                                <strong class="text-white">Non-Expansion:</strong> Adults under 100% FPL receive no ACA subsidy and no Medicaid. Recommend increasing MAGI to qualify for premium tax credits.
                            </p>
                         </div>
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
        
        container.querySelectorAll('input:not([data-id="birthYear"])').forEach(input => {
            if (input.dataset.type === 'currency') import('./formatter.js').then(f => f.formatter.bindCurrencyEventListeners(input));
            input.oninput = () => { 
                benefits.refresh(); 
                if (window.debouncedAutoSave) window.debouncedAutoSave(); 
            };
            if (input.type === 'checkbox') {
                input.onchange = () => {
                    benefits.refresh();
                    if (window.debouncedAutoSave) window.debouncedAutoSave();
                };
            }
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

        container.addEventListener('input', (e) => {
            if (e.target.dataset.id === 'birthYear') {
                benefits.refresh();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        });
    },

    addDependent: (data = {}) => {
        const list = document.getElementById('dependents-list'); if (!list) return;
        
        const filingStatus = window.currentData?.assumptions?.filingStatus || 'Single';
        const adults = filingStatus === 'Married Filing Jointly' ? 2 : 1;
        const currentKids = list.querySelectorAll('.dependent-visual-item').length;
        if (adults + currentKids >= 8) return;

        const item = document.createElement('div');
        item.className = 'dependent-visual-item flex flex-col items-center group relative';
        const currentYear = new Date().getFullYear();
        const yearVal = data.birthYear || (currentYear - 5);
        const nameVal = data.name || 'Child';
        
        item.innerHTML = `
            <div class="relative w-12 h-12 flex flex-col items-center">
                <div class="dependent-icon-wrap w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:border-blue-400 transition-all shadow-lg shadow-blue-900/10">
                    <i class="fas fa-baby text-base"></i>
                </div>
                <button data-action="remove-dependent" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <input data-id="depName" type="text" value="${nameVal}" class="bg-transparent border-none outline-none font-bold text-slate-500 text-[8px] uppercase tracking-widest text-center w-14 mt-1 focus:text-white" placeholder="Name">
            <div class="mt-0.5">
                <input data-id="birthYear" type="number" value="${yearVal}" class="birth-year-input bg-slate-900/50 border border-white/10 rounded px-1 py-0.5 font-black text-blue-400 text-[9px] w-12 text-center mono-numbers outline-none focus:border-blue-500" title="Dependent Birth Year">
            </div>
            <span class="aged-out-label hidden text-[7px] font-black text-red-500 uppercase tracking-tighter mt-0.5">Aged Out</span>
        `;
        list.appendChild(item);
    },

    refresh: () => {
        const data = benefits.scrape();
        const c = document.getElementById('benefits-module'); if (!c) return;
        const currentYear = new Date().getFullYear();
        
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

        // Apply visual "Aged Out" indicators and filter effective count
        let effectiveKidsCount = 0;
        const depItems = c.querySelectorAll('.dependent-visual-item');
        depItems.forEach(item => {
            const birthInp = item.querySelector('.birth-year-input');
            const birthYear = parseInt(birthInp.value);
            const isAgedOut = !isNaN(birthYear) && (birthYear + 19) < currentYear;
            
            item.querySelector('.aged-out-label').classList.toggle('hidden', !isAgedOut);
            item.querySelector('.dependent-icon-wrap').classList.toggle('grayscale', isAgedOut);
            item.querySelector('.dependent-icon-wrap').classList.toggle('opacity-30', isAgedOut);
            birthInp.classList.toggle('text-red-500', isAgedOut);
            birthInp.classList.toggle('text-blue-400', !isAgedOut);
            
            if (!isAgedOut) effectiveKidsCount++;
        });

        let adults = isMFJ ? 2 : 1;
        const totalSize = adults + effectiveKidsCount;
        
        if (document.getElementById('hh-composition-text')) {
            document.getElementById('hh-composition-text').textContent = `${adults} Adult${adults > 1 ? 's' : ''} ${effectiveKidsCount > 0 ? '+ ' + effectiveKidsCount + ' Dependent' + (effectiveKidsCount > 1 ? 's' : '') : ''}`;
        }
        if (document.getElementById('hh-total-size-badge')) {
            document.getElementById('hh-total-size-badge').textContent = totalSize;
        }
        
        const addBtn = document.getElementById('btn-add-dependent');
        if (addBtn) {
            const totalVisualCount = adults + depItems.length;
            const isLimitReached = totalVisualCount >= 8;
            addBtn.disabled = isLimitReached;
            const btnText = addBtn.querySelector('.label-text');
            if (btnText) btnText.textContent = isLimitReached ? "Max Reached" : "Add Child";
        }

        const stateId = window.currentData?.assumptions?.state || 'Michigan';
        const stateMeta = stateTaxRates[stateId];
        const isExpandedState = stateMeta?.expanded !== false;
        const fpl100Annual = math.getFPL(totalSize, stateId);
        const ratio = annualMAGI / fpl100Annual;
        
        // Medicaid Logic: In non-expansion states, healthy adults get GAP, 
        // but Pregnant/Disabled individuals get Medicaid.
        const silverCSRLimitRatio = 2.50;
        const cliffRatio = 4.0;
        
        // Define Medicaid eligibility thresholds
        const medLimitRatio = data.isPregnant ? 2.0 : 1.38;
        // In non-expansion states, you must be pregnant/disabled to get 'Platinum'
        const hasMedicaidPathway = isExpandedState || data.isPregnant || data.isDisabled;

        // Visual Plan Themes
        const themes = {
            platinum: { text: 'text-emerald-400', border: 'border-emerald-500/50' },
            silver: { text: 'text-blue-400', border: 'border-blue-500/50' },
            standard: { text: 'text-slate-500', border: 'border-white/5' },
            danger: { text: 'text-red-400', border: 'border-red-500/50' }
        };

        // Dynamic Slider Track Logic
        const sliderMax = 200000;
        const trackVisual = document.getElementById('slider-track-visual');
        if (trackVisual) {
            let gradient;
            if (hasMedicaidPathway) {
                const greenEnd = (fpl100Annual * medLimitRatio / sliderMax) * 100;
                const blueEnd = (fpl100Annual * 2.50 / sliderMax) * 100;
                gradient = `linear-gradient(to right, #10b981 0%, #10b981 ${greenEnd}%, #3b82f6 ${greenEnd}%, #3b82f6 ${blueEnd}%, #475569 ${blueEnd}%, #475569 100%)`;
            } else {
                const redEnd = (fpl100Annual * 1.0 / sliderMax) * 100;
                const blueEnd = (fpl100Annual * 2.50 / sliderMax) * 100;
                gradient = `linear-gradient(to right, #ef4444 0%, #ef4444 ${redEnd}%, #3b82f6 ${redEnd}%, #3b82f6 ${blueEnd}%, #475569 ${blueEnd}%, #475569 100%)`;
            }
            trackVisual.style.background = gradient;
        }
        
        // Premium Contribution Scale Logic
        let expectedContributionPct = 0;
        const contributionThreshold = hasMedicaidPathway ? medLimitRatio : 1.0;
        
        if (ratio > contributionThreshold) {
            if (ratio < cliffRatio) {
                const minScale = 0.021, maxScale = 0.095;
                expectedContributionPct = minScale + (ratio - 1) * (maxScale - minScale) / (cliffRatio - 1);
            } else {
                expectedContributionPct = 1.0;
            }
        }
        
        let dynamicPremium = ratio > contributionThreshold ? (annualMAGI * expectedContributionPct) / 12 : 0;
        if (ratio >= cliffRatio) dynamicPremium = 1100; 

        // Update Card Contents
        const updateTopCard = (name, sub, prem, ded, theme) => {
            const planEl = document.getElementById('sum-health-plan');
            const healthCard = document.getElementById('benefit-summary-health');
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

        const isInMedicaidGap = !hasMedicaidPathway && ratio < 1.0;
        const stateAlert = document.getElementById('state-policy-alert');
        const gapAlertBg = document.getElementById('gap-alert-bg');
        if (stateAlert) stateAlert.classList.toggle('hidden', !isInMedicaidGap);
        if (gapAlertBg) gapAlertBg.classList.toggle('opacity-100', isInMedicaidGap);

        if (isInMedicaidGap) {
            updateTopCard("MEDICAID GAP", "NO COVERAGE", math.toCurrency(1100), "$10,000+", themes.danger);
        } else if (ratio <= medLimitRatio && hasMedicaidPathway) {
            let label = "Platinum (Medicaid)";
            if (data.isPregnant) label = "Platinum (Pregnancy)";
            if (data.isDisabled) label = "Platinum (Disability)";
            updateTopCard(label, "100% Full Coverage", "$0", "$0", themes.platinum);
        } else if (ratio <= silverCSRLimitRatio) {
            updateTopCard("Silver CSR (High Subsidy)", "Low Copays", math.toCurrency(dynamicPremium), "$800", themes.silver);
        } else if (ratio < cliffRatio) {
            updateTopCard("Standard ACA", "Market Subsidy", math.toCurrency(dynamicPremium), "$4,000+", themes.standard);
        } else {
            updateTopCard("Market (Off-Exchange)", "No Subsidy / Cliff", math.toCurrency(dynamicPremium), "$6,000+", themes.standard);
        }

        // SNAP Calculation
        const earned = data.isEarnedIncome ? monthlyMAGI : 0;
        const unearned = data.isEarnedIncome ? 0 : monthlyMAGI;
        const assetsForTest = window.currentData?.investments?.filter(i => i.type === 'Cash' || i.type === 'Taxable' || i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0) || 0;
        // Gate 2 removed internally in utils.js, so overrideAssetTest param is ignored but we pass true for semantic clarity
        const estimatedBenefit = engine.calculateSnapBenefit(earned, unearned, assetsForTest, totalSize, data.shelterCosts, data.hasSUA, data.isDisabled, data.childSupportPaid, data.depCare, data.medicalExps, stateId, 1, true);

        // Update Asset Test Status Label - No longer needed in UI, but if referenced elsewhere, keep it minimal
        const assetStatusLbl = document.getElementById('asset-test-status-label');
        if (assetStatusLbl) {
             assetStatusLbl.parentElement.parentElement.remove(); // Remove the row if it still exists in DOM
        }

        const globalSnapRes = document.getElementById('sum-snap-amt');
        if (globalSnapRes) {
            globalSnapRes.textContent = math.toCurrency(estimatedBenefit);
            const isSnapActive = estimatedBenefit > 1;
            globalSnapRes.className = `text-4xl font-black ${isSnapActive ? 'text-emerald-400' : 'text-slate-500'} mono-numbers tracking-tight`;
            const snapCard = document.getElementById('benefit-summary-snap');
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
                birthYear: parseInt(item.querySelector('[data-id="birthYear"]').value) 
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

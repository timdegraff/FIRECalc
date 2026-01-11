import { math, engine, stateTaxRates } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-8">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <!-- Household Section: Compact Apple Style -->
                    <div class="card-container p-6 flex flex-col justify-between">
                        <div class="flex items-center justify-between mb-8">
                            <div>
                                <h3 class="text-sm font-black text-white uppercase tracking-widest">Household Visualizer</h3>
                                <p class="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Family Composition & Dependents</p>
                            </div>
                            <button id="btn-add-dependent" class="w-8 h-8 bg-blue-600 hover:bg-blue-500 text-white rounded-lg flex items-center justify-center transition-all shadow-lg shadow-blue-900/20">
                                <i class="fas fa-plus text-xs"></i>
                            </button>
                        </div>

                        <div id="hh-visual-strip" class="flex flex-wrap items-end gap-6 min-h-[80px] pb-4">
                            <!-- Adults generated based on Filing Status -->
                            <div id="adult-icons" class="flex items-center gap-3"></div>
                            <!-- Kids generated dynamically -->
                            <div id="dependents-list" class="flex items-center gap-4 border-l border-white/5 pl-6"></div>
                        </div>

                        <div class="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-[8px] font-black text-slate-600 uppercase tracking-widest">Household Size:</span>
                                <span id="hh-total-size-badge" class="text-xs font-black text-white mono-numbers">1</span>
                            </div>
                            <p id="hh-composition-text" class="text-[10px] font-black text-slate-500 uppercase tracking-tight">Self Only</p>
                        </div>
                    </div>

                    <!-- Sandbox & Core Params -->
                    <div class="space-y-4">
                        <div class="card-container p-6 bg-slate-900/40 border-amber-500/20">
                            <div class="flex justify-between items-start mb-6">
                                <div class="flex flex-col">
                                    <label class="text-[9px] font-black text-amber-500 uppercase tracking-widest">Sandbox MAGI (Combined)</label>
                                    <p class="text-[8px] text-slate-500 font-medium italic mt-0.5">Slide to simulate benefit cliffs and subsidies</p>
                                </div>
                                <div class="flex gap-4">
                                    <div class="text-right">
                                        <span class="text-[7px] font-black text-slate-600 uppercase block">Monthly</span>
                                        <span id="label-magi-mo" class="text-sm font-black text-teal-400 mono-numbers leading-none">$0</span>
                                    </div>
                                    <div class="text-right">
                                        <span class="text-[7px] font-black text-slate-600 uppercase block">Annual</span>
                                        <span id="label-magi-yr" class="text-sm font-black text-teal-400 mono-numbers leading-none">$0K</span>
                                    </div>
                                </div>
                            </div>
                            <input type="range" data-benefit-id="unifiedIncomeAnnual" min="0" max="250000" step="1000" value="25000" class="input-range w-full h-1.5 accent-teal-500">
                            
                            <div class="grid grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/5">
                                <div class="flex flex-col items-center gap-1.5">
                                    <label class="text-[7px] font-black text-slate-500 uppercase">Earned?</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isEarnedIncome" class="sr-only peer" checked>
                                        <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center gap-1.5">
                                    <label class="text-[7px] font-black text-slate-500 uppercase">Disabled</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isDisabled" class="sr-only peer">
                                        <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center gap-1.5">
                                    <label class="text-[7px] font-black text-slate-500 uppercase">Pregnant</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isPregnant" class="sr-only peer">
                                        <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center gap-1.5">
                                    <label class="text-[7px] font-black text-slate-500 uppercase">Util SUA</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="hasSUA" class="sr-only peer" checked>
                                        <div class="w-7 h-3.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="card-container p-4 space-y-4 bg-black/10">
                                <h4 class="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Inflow Gaps</h4>
                                <div class="space-y-3">
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Shelter Cost</label><input type="text" data-benefit-id="shelterCosts" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers" value="$700"></div>
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Child Support Paid</label><input type="text" data-benefit-id="childSupportPaid" data-type="currency" class="input-base text-xs font-bold text-pink-400 mono-numbers" value="$0"></div>
                                </div>
                            </div>
                            <div class="card-container p-4 space-y-4 bg-black/10">
                                <h4 class="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Adjustments</h4>
                                <div class="space-y-3">
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Dependent Care</label><input type="text" data-benefit-id="depCare" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers" value="$0"></div>
                                    <div id="medical-input-wrap" class="opacity-40 transition-opacity"><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Medical Exp</label><input type="text" data-benefit-id="medicalExps" data-type="currency" class="input-base text-xs font-bold text-blue-400 mono-numbers" value="$0"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-8 text-center">
                    <p class="text-[9px] text-slate-600 leading-relaxed max-w-2xl mx-auto italic font-medium uppercase tracking-wider">
                        Calculations use <strong>FFY 2026 Standards</strong> (Oct 1, 2025 – Sept 30, 2026).
                        Gating includes state-specific BBCE income tests and asset limit enforcement where applicable.
                    </p>
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
            input.oninput = () => { benefits.refresh(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
        });
        document.getElementById('btn-add-dependent').onclick = () => { benefits.addDependent(); benefits.refresh(); if (window.debouncedAutoSave) window.debouncedAutoSave(); };
        container.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="remove-dependent"]');
            if (btn) { btn.closest('.dependent-visual-item').remove(); benefits.refresh(); if (window.debouncedAutoSave) window.debouncedAutoSave(); }
        });
    },

    addDependent: (data = {}) => {
        const list = document.getElementById('dependents-list'); if (!list) return;
        const item = document.createElement('div');
        item.className = 'dependent-visual-item flex flex-col items-center group relative';
        const currentYear = new Date().getFullYear();
        const yearVal = data.independenceYear || (currentYear + 10);
        const nameVal = data.name || 'Child';
        const shortYear = ("" + yearVal).slice(-2);
        
        item.innerHTML = `
            <div class="relative">
                <div class="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xs font-black text-blue-400 group-hover:border-blue-400 transition-all shadow-lg shadow-blue-900/10">
                    '${shortYear}
                </div>
                <button data-action="remove-dependent" class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <input data-id="depName" type="text" value="${nameVal}" class="bg-transparent border-none outline-none font-bold text-slate-500 text-[8px] uppercase tracking-widest text-center w-12 mt-1.5 focus:text-white">
            <input data-id="depYear" type="number" value="${yearVal}" class="hidden">
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
                    <div class="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <i class="fas fa-user-friends text-lg"></i>
                    </div>
                    <span class="text-[8px] font-black text-teal-500 uppercase tracking-widest mt-1.5">Couple</span>
                </div>
            ` : `
                <div class="flex flex-col items-center">
                    <div class="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <i class="fas fa-user text-lg"></i>
                    </div>
                    <span class="text-[8px] font-black text-teal-500 uppercase tracking-widest mt-1.5">Single</span>
                </div>
            `;
        }

        let adults = isMFJ ? 2 : 1;
        let kids = data.dependents.length;
        const totalSize = adults + kids;
        if (document.getElementById('hh-composition-text')) document.getElementById('hh-composition-text').textContent = `${adults} Adult${adults > 1 ? 's' : ''} ${kids > 0 ? '+ ' + kids + ' Dependent' + (kids > 1 ? 's' : '') : ''}`;
        if (document.getElementById('hh-total-size-badge')) document.getElementById('hh-total-size-badge').textContent = totalSize;
        
        const stateMeta = stateTaxRates[window.currentData?.assumptions?.state || 'Michigan'];
        const fplBase = stateMeta?.fplBase || 16060;
        const fpl2026Annual = fplBase + (totalSize - 1) * 5650;
        const ratio = annualMAGI / fpl2026Annual;
        const medRatio = data.isPregnant ? 1.95 : 1.38;
        const silverRatio = 2.50;
        
        let expectedContributionPct = ratio <= 1.5 ? 0 : (ratio <= 2.0 ? 0.00 + ((ratio - 1.5) / 0.5) * 0.02 : (ratio <= 2.5 ? 0.02 + ((ratio - 2.0) / 0.5) * 0.02 : 0.085));
        let dynamicPremium = ratio > medRatio ? (annualMAGI * expectedContributionPct) / 12 : 0;

        const updateTopCard = (name, sub, prem, ded, colorClass, borderColor) => {
            const planEl = document.getElementById('sum-health-plan');
            const summaryHealthCard = document.getElementById('benefit-summary-health');
            if (planEl) {
                planEl.textContent = name;
                planEl.className = `text-2xl font-black uppercase tracking-tight leading-none ${colorClass}`;
            }
            if (summaryHealthCard) summaryHealthCard.style.borderLeftColor = borderColor;
            
            const premEl = document.getElementById('sum-health-prem');
            const dedEl = document.getElementById('sum-health-ded');
            if (premEl) premEl.textContent = prem;
            if (dedEl) dedEl.textContent = ded;
        };

        if (ratio <= medRatio) {
            if (stateMeta?.expanded !== false) updateTopCard("Platinum (Medicaid)", "100% Full Coverage", "$0", "$0", "text-teal-400", "#14b8a6");
            else updateTopCard("Private (State Limited)", "No Subsidy", math.toCurrency(dynamicPremium || 400), "$4,000+", "text-slate-500", "#64748b");
        } else if (ratio <= silverRatio) updateTopCard("Silver CSR (High Subsidy)", "Low Copays", math.toCurrency(dynamicPremium), "$800", "text-blue-400", "#3b82f6");
        else updateTopCard("Standard ACA", "Full Cost Market", math.toCurrency(dynamicPremium), "$4,000+", "text-slate-500", "#64748b");

        const earned = data.isEarnedIncome ? monthlyMAGI : 0;
        const unearned = data.isEarnedIncome ? 0 : monthlyMAGI;
        const assetsForTest = window.currentData?.investments?.filter(i => i.type === 'Cash' || i.type === 'Taxable' || i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0) || 0;
        const estimatedBenefit = engine.calculateSnapBenefit(earned, unearned, assetsForTest, totalSize, data.shelterCosts, data.hasSUA, data.isDisabled, data.childSupportPaid, data.depCare, data.medicalExps, window.currentData?.assumptions?.state || 'Michigan');
        
        const globalSnapRes = document.getElementById('sum-snap-amt');
        if (globalSnapRes) globalSnapRes.textContent = math.toCurrency(estimatedBenefit);
    },

    scrape: () => {
        const c = document.getElementById('benefits-module'); if (!c) return { unifiedIncomeAnnual: 25000, dependents: [] };
        const get = (id, bool = false) => { const el = c.querySelector(`[data-benefit-id="${id}"]`); if (!el) return bool ? false : 0; if (el.type === 'checkbox') return el.checked; if (el.dataset.type === 'currency') return math.fromCurrency(el.value); return parseFloat(el.value) || 0; };
        return { unifiedIncomeAnnual: get('unifiedIncomeAnnual'), shelterCosts: get('shelterCosts'), childSupportPaid: get('childSupportPaid'), depCare: get('depCare'), medicalExps: get('medicalExps'), hasSUA: get('hasSUA'), isEarnedIncome: get('isEarnedIncome'), isDisabled: get('isDisabled'), isPregnant: get('isPregnant'), dependents: Array.from(c.querySelectorAll('.dependent-visual-item')).map(item => ({ name: item.querySelector('[data-id="depName"]').value, independenceYear: item.querySelector('[data-id="depYear"]').value })) };
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
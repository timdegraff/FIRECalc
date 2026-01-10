import { math, engine, stateTaxRates } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Household Section -->
                    <div class="card-container p-6 space-y-6">
                        <div class="flex items-center justify-between border-b border-white/5 pb-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <i class="fas fa-users text-sm"></i>
                                </div>
                                <div>
                                    <h3 class="text-sm font-black text-white uppercase tracking-widest">Dependents</h3>
                                    <p class="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Kids & Qualifying Relatives</p>
                                </div>
                            </div>
                            <button id="btn-add-dependent" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                <i class="fas fa-child mr-2"></i> Add Dependent
                            </button>
                        </div>
                        <div id="dependents-list" class="space-y-3 min-h-[40px]"></div>
                        <div class="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                            <div class="flex items-center gap-4">
                                <div class="flex -space-x-2">
                                    <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs" title="You"><i class="fas fa-user"></i></div>
                                    <div id="avatar-spouse" class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 text-xs hidden" title="Spouse"><i class="fas fa-user-friends"></i></div>
                                </div>
                                <div>
                                    <p id="hh-composition-text" class="text-[10px] font-black text-white uppercase tracking-tight">Self Only</p>
                                    <p class="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Adults derived from Filing Status</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Family Size</span>
                                <div id="hh-total-size-badge" class="text-xl font-black text-blue-400 mono-numbers leading-none">1</div>
                            </div>
                        </div>
                    </div>

                    <!-- Sandbox & Results -->
                    <div class="space-y-4">
                        <div class="card-container p-6 bg-slate-800/40">
                            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 pb-6 border-b border-white/5">
                                <div class="flex flex-col items-center justify-center bg-black/20 p-2 rounded-xl border border-white/5">
                                    <label class="text-[8px] font-black text-slate-500 uppercase mb-1">Earned?</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isEarnedIncome" class="sr-only peer" checked>
                                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center justify-center bg-black/20 p-2 rounded-xl border border-white/5">
                                    <label class="text-[8px] font-black text-slate-500 uppercase mb-1">Disabled/60+</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isDisabled" class="sr-only peer">
                                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center justify-center bg-black/20 p-2 rounded-xl border border-white/5">
                                    <label class="text-[8px] font-black text-slate-500 uppercase mb-1">Pregnancy</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="isPregnant" class="sr-only peer">
                                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-teal-600"></div>
                                    </label>
                                </div>
                                <div class="flex flex-col items-center justify-center bg-black/20 p-2 rounded-xl border border-white/5">
                                    <label class="text-[8px] font-black text-slate-500 uppercase mb-1">Utility SUA</label>
                                    <label class="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" data-benefit-id="hasSUA" class="sr-only peer" checked>
                                        <div class="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            </div>
                            <div class="flex justify-between items-end mb-4">
                                <div class="flex flex-col">
                                    <label class="label-std text-blue-400">Sandbox MAGI (Combined)</label>
                                    <p class="text-[9px] text-slate-500 font-medium italic">Simulate benefit cliffs</p>
                                </div>
                                <div class="text-2xl font-black text-teal-400 mono-numbers leading-none" data-label="unifiedIncome">$0/mo | $0K/yr</div>
                            </div>
                            <input type="range" data-benefit-id="unifiedIncomeAnnual" min="0" max="250000" step="1000" value="25000" class="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500">
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="card-container p-4 space-y-3 bg-black/10">
                                <h4 class="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Housing & Support</h4>
                                <div class="space-y-2">
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Shelter Cost</label><input type="text" data-benefit-id="shelterCosts" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers" value="$700"></div>
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Child Support Paid</label><input type="text" data-benefit-id="childSupportPaid" data-type="currency" class="input-base text-xs font-bold text-pink-400 mono-numbers" value="$0"></div>
                                </div>
                            </div>
                            <div class="card-container p-4 space-y-3 bg-black/10">
                                <h4 class="text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2">Care & Medical</h4>
                                <div class="space-y-2">
                                    <div><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Dependent Care</label><input type="text" data-benefit-id="depCare" data-type="currency" class="input-base text-xs font-bold text-white mono-numbers" value="$0"></div>
                                    <div id="medical-input-wrap" class="opacity-40"><label class="text-[8px] font-bold text-slate-600 uppercase block mb-1">Medical Exp (Disabled Only)</label><input type="text" data-benefit-id="medicalExps" data-type="currency" class="input-base text-xs font-bold text-blue-400 mono-numbers" value="$0"></div>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div id="card-healthcare" class="card-container p-4 flex flex-col border-l-4">
                                <span class="label-std mb-1">Health Status</span>
                                <div id="health-main-display" class="text-xl font-black text-white tracking-tight">Platinum</div>
                                <p id="health-sub-display" class="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">100% Coverage</p>
                                <div class="mt-4 pt-4 border-t border-white/5 space-y-1">
                                    <div class="flex justify-between text-[10px]"><span class="text-slate-500">Premium</span><span id="detail-premium" class="font-bold text-white mono-numbers">$0</span></div>
                                    <div class="flex justify-between text-[10px]"><span class="text-slate-500">Deductible</span><span id="detail-deductible" class="font-bold text-white mono-numbers">$0</span></div>
                                </div>
                            </div>
                            <div id="card-snap" class="card-container p-4 flex flex-col border-l-4">
                                <span class="label-std mb-1">SNAP Monthly</span>
                                <div id="snap-result-value" class="text-3xl font-black text-teal-400 mono-numbers tracking-tight">$0</div>
                                <p class="text-[8px] text-slate-500 uppercase font-black mt-2">FY 2026 Standards</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="pt-8 text-center">
                    <p class="text-[10px] text-slate-500 leading-relaxed max-w-2xl mx-auto italic">
                        Calculations use <strong>FFY 2026 State Standards</strong> (Oct 1, 2025 – Sept 30, 2026).
                        Gating includes state-specific BBCE income tests and asset limit enforcement where applicable.
                        <br><br>
                        <em>Disclaimer: These are estimates only and subject to nuance, updates, exceptions, and asset/income verification requirements. Forecast assumes standards grow at the specified inflation rate.</em>
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
            if (btn) { btn.closest('.dependent-item').remove(); benefits.refresh(); if (window.debouncedAutoSave) window.debouncedAutoSave(); }
        });
    },

    addDependent: (data = {}) => {
        const list = document.getElementById('dependents-list'); if (!list) return;
        const item = document.createElement('div');
        item.className = 'dependent-item flex items-center gap-3 p-3 bg-black/20 rounded-xl border border-white/5 group';
        const currentYear = new Date().getFullYear();
        const yearVal = data.independenceYear || (currentYear + 10);
        const nameVal = data.name || 'Child';
        item.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors"><i class="fas fa-baby"></i></div>
            <div class="flex-grow">
                <input data-id="depName" type="text" value="${nameVal}" placeholder="Name" class="bg-transparent border-none outline-none font-bold text-white text-xs uppercase tracking-tight w-full placeholder:text-slate-600">
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">YEAR CHILD BECOMES INDEPENDENT (19+):</span>
                    <input data-id="depYear" type="number" value="${yearVal}" class="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-400 mono-numbers outline-none w-16">
                </div>
            </div>
            <button data-action="remove-dependent" class="text-slate-600 hover:text-red-400 transition-colors p-1"><i class="fas fa-times text-xs"></i></button>
        `;
        list.appendChild(item);
    },

    refresh: () => {
        const data = benefits.scrape();
        const c = document.getElementById('benefits-module'); if (!c) return;
        
        const annualMAGI = data.unifiedIncomeAnnual;
        const monthlyMAGI = Math.round(annualMAGI / 12);
        const annualK = Math.round(annualMAGI / 1000);
        
        c.querySelector('[data-label="unifiedIncome"]').textContent = `${math.toCurrency(monthlyMAGI)}/mo | $${annualK}K/yr`;
        
        const medWrap = document.getElementById('medical-input-wrap');
        if (medWrap) medWrap.classList.toggle('opacity-40', !data.isDisabled);
        const filingStatus = window.currentData?.assumptions?.filingStatus || 'Single';
        const isMFJ = filingStatus === 'Married Filing Jointly';
        const avatarSpouse = document.getElementById('avatar-spouse');
        if (avatarSpouse) avatarSpouse.classList.toggle('hidden', !isMFJ);
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
        const setHealth = (main, sub, prem, ded, colorClass, borderColor) => {
            const mainDisp = document.getElementById('health-main-display');
            const globalMainDisp = document.getElementById('sum-health-plan');
            mainDisp.textContent = main; mainDisp.className = `text-xl font-black tracking-tight ${colorClass}`;
            if (globalMainDisp) { globalMainDisp.textContent = main; globalMainDisp.className = `text-4xl font-black uppercase tracking-tight transition-colors ${colorClass}`; }
            document.getElementById('health-sub-display').textContent = sub;
            document.getElementById('detail-premium').textContent = prem;
            document.getElementById('detail-deductible').textContent = ded;
            document.getElementById('card-healthcare').style.borderColor = borderColor;
        };
        if (ratio <= medRatio) {
            if (stateMeta?.expanded !== false) setHealth("Platinum", "100% Full Coverage", "$0", "$0", "text-teal-400", "rgba(20, 184, 166, 0.4)");
            else setHealth("Private (No Subsidy)", "State Not Expanded", math.toCurrency(dynamicPremium || 400), "$4000+", "text-slate-500", "rgba(255, 255, 255, 0.1)");
        } else if (ratio <= silverRatio) setHealth("Silver CSR", "High Subsidy", math.toCurrency(dynamicPremium), "$800", "text-blue-400", "rgba(96, 165, 250, 0.4)");
        else setHealth("Standard ACA", "Full Cost", math.toCurrency(dynamicPremium), "$4000+", "text-slate-500", "rgba(255, 255, 255, 0.1)");

        const earned = data.isEarnedIncome ? monthlyMAGI : 0;
        const unearned = data.isEarnedIncome ? 0 : monthlyMAGI;
        const assetsForTest = window.currentData?.investments?.filter(i => i.type === 'Cash' || i.type === 'Taxable' || i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0) || 0;
        const estimatedBenefit = engine.calculateSnapBenefit(earned, unearned, assetsForTest, totalSize, data.shelterCosts, data.hasSUA, data.isDisabled, data.childSupportPaid, data.depCare, data.medicalExps, window.currentData?.assumptions?.state || 'Michigan');
        const snapRes = document.getElementById('snap-result-value');
        const globalSnapRes = document.getElementById('sum-snap-amt');
        const snapCard = document.getElementById('card-snap');
        const snapVal = math.toCurrency(estimatedBenefit);
        snapRes.textContent = snapVal;
        if (globalSnapRes) globalSnapRes.textContent = snapVal;
        if (estimatedBenefit <= 0) { snapRes.className = "text-3xl font-black text-slate-700 mono-numbers tracking-tight"; snapCard.style.borderColor = "rgba(255, 255, 255, 0.1)"; }
        else { snapRes.className = "text-3xl font-black text-teal-400 mono-numbers tracking-tight"; snapCard.style.borderColor = "rgba(20, 184, 166, 0.4)"; }
    },

    scrape: () => {
        const c = document.getElementById('benefits-module'); if (!c) return { unifiedIncomeAnnual: 25000, dependents: [] };
        const get = (id, bool = false) => { const el = c.querySelector(`[data-benefit-id="${id}"]`); if (!el) return bool ? false : 0; if (el.type === 'checkbox') return el.checked; if (el.dataset.type === 'currency') return math.fromCurrency(el.value); return parseFloat(el.value) || 0; };
        return { unifiedIncomeAnnual: get('unifiedIncomeAnnual'), shelterCosts: get('shelterCosts'), childSupportPaid: get('childSupportPaid'), depCare: get('depCare'), medicalExps: get('medicalExps'), hasSUA: get('hasSUA'), isEarnedIncome: get('isEarnedIncome'), isDisabled: get('isDisabled'), isPregnant: get('isPregnant'), dependents: Array.from(c.querySelectorAll('.dependent-item')).map(item => ({ name: item.querySelector('[data-id="depName"]').value, independenceYear: item.querySelector('[data-id="depYear"]').value })) };
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
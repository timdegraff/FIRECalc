
import { math, engine } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between mb-4 px-1">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <i class="fas fa-hand-holding-heart text-amber-400"></i> Benefit Optimization
                    </h2>
                    <div class="hidden md:flex items-center gap-4 bg-slate-800 p-1.5 rounded-xl border border-slate-700">
                         <span class="label-std text-slate-500 pl-2">Household Size</span>
                         <div class="flex items-center gap-2">
                             <input type="range" data-benefit-id="hhSize" min="1" max="10" step="1" value="1" class="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                             <span data-label="hhSize" class="text-blue-400 font-black text-lg mono-numbers w-6 text-center">1</span>
                         </div>
                    </div>
                </div>

                <div class="card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg p-4">
                    <div class="flex justify-between items-center">
                        <div class="space-y-0.5">
                             <label class="label-std text-slate-500">Test Annual MAGI</label>
                             <div class="text-2xl font-black text-white mono-numbers" data-label="unifiedIncome">$0</div>
                        </div>
                        <input type="range" data-benefit-id="unifiedIncome" min="0" max="150000" step="1000" value="40000" class="w-2/3 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500">
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <!-- Healthcare Card -->
                    <div id="card-healthcare" class="card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300 flex flex-col">
                        <div class="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2 tracking-wide uppercase">
                                <i class="fas fa-plus-square text-red-500 text-sm"></i> Healthcare Stratum
                            </h3>
                            <div class="flex items-center gap-2">
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                    <input type="checkbox" data-benefit-id="isPregnant" class="w-2.5 h-2.5 accent-pink-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Pregnant?</span>
                                </label>
                                <span id="health-cost-badge" class="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-[9px] font-bold uppercase tracking-widest min-w-[60px] text-center">FREE</span>
                            </div>
                        </div>
                        <div class="p-4 flex flex-col gap-3 flex-grow">
                            <div class="text-center hidden md:block">
                                <span class="label-std text-slate-500 block mb-0.5">Plan Status</span>
                                <div id="health-main-display" class="text-3xl font-black text-white tracking-tighter">Platinum</div>
                                <div id="health-sub-display" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">100% Full Coverage</div>
                            </div>
                            <!-- DYNAMIC HEALTH BAR -->
                            <div class="relative h-2 bg-slate-950 rounded-full border border-slate-700 overflow-hidden flex w-full my-1">
                                <div id="seg-medicaid" class="bg-emerald-500/80 h-full border-r border-slate-900/50"></div>
                                <div id="seg-hmp" class="bg-emerald-400/60 h-full border-r border-slate-900/50"></div>
                                <div id="seg-silver" class="bg-blue-500/60 h-full border-r border-slate-900/50"></div>
                                <div id="seg-gold" class="bg-amber-500/60 h-full border-r border-slate-900/50"></div>
                                <div id="health-marker" class="absolute top-0 w-1.5 h-full bg-white shadow-[0_0_10px_white] transition-all z-10 rounded-full"></div>
                            </div>
                            <div class="mt-auto pt-1 hidden md:block">
                                <table class="w-full text-[10px]">
                                    <tbody>
                                        <tr><td class="py-0.5 text-slate-500 font-medium">Est. Monthly Premium</td><td class="py-0.5 text-right font-bold text-white mono-numbers" id="detail-premium">$0</td></tr>
                                        <tr><td class="py-0.5 text-slate-500 font-medium">Deductible</td><td class="py-0.5 text-right text-slate-400 mono-numbers" id="detail-deductible">$0</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- SNAP Card -->
                    <div id="card-snap" class="card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300 flex flex-col">
                        <div class="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2 tracking-wide uppercase">
                                <i class="fas fa-utensils text-emerald-400 text-sm"></i> Food Assistance
                            </h3>
                            <div class="flex gap-2">
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                    <input type="checkbox" data-benefit-id="hasSUA" checked class="w-2.5 h-2.5 accent-emerald-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Max Ded</span>
                                </label>
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                                    <input type="checkbox" data-benefit-id="isDisabled" class="w-2.5 h-2.5 accent-emerald-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Senior/Dis</span>
                                </label>
                            </div>
                        </div>
                        <div class="p-2 md:p-4 flex flex-col gap-1 md:gap-3 flex-grow">
                            <div class="flex-grow flex flex-col items-center justify-center py-0 md:py-2 text-center">
                                <span class="label-std text-slate-500 mb-0.5">Monthly Benefit</span>
                                <div id="snap-result-value" class="text-5xl font-black text-emerald-400 mono-numbers tracking-tighter drop-shadow-lg">$0</div>
                                <div id="snap-annual-value" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Annual: $0</div>
                            </div>
                            <div class="pt-1 mt-auto">
                                <div class="flex justify-between items-center mb-1">
                                    <label class="label-std text-slate-500">Shelter & Utility Cost</label>
                                    <div class="text-xs font-bold text-white mono-numbers" data-label="shelterCosts">$700</div>
                                </div>
                                <input type="range" data-benefit-id="shelterCosts" min="0" max="5000" step="50" value="700" class="benefit-slider cursor-pointer accent-emerald-400">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-center pt-2">
                    <p class="text-[9px] text-slate-600 italic font-medium">
                        * Estimates based on projected 2026 Federal Poverty Levels and ACA subsidy cliffs. Actual marketplace premiums may vary by region and plan selection.
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
        container.querySelectorAll('input').forEach(input => {
            input.oninput = () => {
                if (input.dataset.benefitId === 'hhSize') {
                    // Update all hhSize inputs (including desktop sidebar if visible)
                    document.querySelectorAll('[data-benefit-id="hhSize"]').forEach(el => el.value = input.value);
                    // Also update mobile view manually if needed
                    const mobileDisplay = document.querySelector('#m-assumptions-container span[class*="text-white"]');
                    if (mobileDisplay && input.closest('#m-assumptions-container')) {
                         mobileDisplay.textContent = input.value;
                    }
                }
                benefits.refresh();
                if (window.debouncedAutoSave) window.debouncedAutoSave();
            };
        });
    },

    refresh: () => {
        const data = benefits.scrape();
        const c = document.getElementById('benefits-module');
        if (!c) return;

        c.querySelectorAll('[data-label="hhSize"]').forEach(el => el.textContent = data.hhSize);
        c.querySelector('[data-label="unifiedIncome"]').textContent = math.toCurrency(data.unifiedIncome);
        c.querySelector('[data-label="shelterCosts"]').textContent = math.toCurrency(data.shelterCosts);

        const fpl2026 = 16060 + (data.hhSize - 1) * 5650;
        const ratio = data.unifiedIncome / fpl2026;
        const sliderMax = 150000;

        const medRatio = data.isPregnant ? 1.95 : 1.38;
        const hmpRatio = 1.60;
        const silverRatio = 2.50;
        const goldRatio = 4.00;

        const medLimit = medRatio * fpl2026;
        const hmpLimit = hmpRatio * fpl2026;
        const silverLimit = silverRatio * fpl2026;
        const goldLimit = goldRatio * fpl2026;

        let expectedContributionPct = 0;
        if (ratio <= 1.5) expectedContributionPct = 0;
        else if (ratio <= 2.0) expectedContributionPct = 0.00 + ((ratio - 1.5) / 0.5) * 0.02;
        else if (ratio <= 2.5) expectedContributionPct = 0.02 + ((ratio - 2.0) / 0.5) * 0.02;
        else if (ratio <= 3.0) expectedContributionPct = 0.04 + ((ratio - 2.5) / 0.5) * 0.02;
        else if (ratio <= 4.0) expectedContributionPct = 0.06 + ((ratio - 3.0) / 1.0) * 0.025;
        else expectedContributionPct = 0.085;

        let dynamicPremium = 0;
        if (ratio > medRatio) {
            dynamicPremium = (data.unifiedIncome * expectedContributionPct) / 12;
        }

        const setWidth = (id, start, end) => {
            const el = document.getElementById(id);
            if (!el) return;
            const width = Math.max(0, (Math.min(sliderMax, end) - start) / sliderMax * 100);
            el.style.width = `${width}%`;
        };

        setWidth('seg-medicaid', 0, medLimit);
        setWidth('seg-hmp', medLimit, hmpLimit);
        setWidth('seg-silver', hmpLimit, silverLimit);
        setWidth('seg-gold', silverLimit, goldLimit);

        const marker = document.getElementById('health-marker');
        if (marker) marker.style.left = `${Math.min(99, (data.unifiedIncome / sliderMax) * 100)}%`;

        const setHealth = (main, sub, prem, ded, colorClass, borderColor) => {
            document.getElementById('health-main-display').textContent = main;
            document.getElementById('health-main-display').className = `text-3xl font-black tracking-tighter ${colorClass}`;
            document.getElementById('health-sub-display').textContent = sub;
            document.getElementById('detail-premium').textContent = prem;
            document.getElementById('detail-deductible').textContent = ded;
            document.getElementById('card-healthcare').className = `card-container bg-slate-800 rounded-2xl border overflow-hidden shadow-lg transition-all duration-300 ${borderColor} flex flex-col`;
            document.getElementById('health-cost-badge').textContent = prem === "$0" ? "FREE" : `${prem} / mo`;
            document.getElementById('health-cost-badge').className = `px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest min-w-[60px] text-center ${prem === "$0" ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'}`;
        };

        if (ratio <= medRatio) {
            setHealth("Platinum", data.isPregnant ? "Pregnancy Coverage" : "100% Full Coverage", "$0", "$0", "text-emerald-400", "border-emerald-500/50");
        } else if (ratio <= hmpRatio) {
            setHealth("HMP+", "Small Copayments", "$20", "Low", "text-emerald-300", "border-emerald-500/30");
        } else if (ratio <= silverRatio) {
             const formattedPrem = math.toCurrency(dynamicPremium);
             setHealth("Silver CSR", "Subsidized Deductible", formattedPrem, "$800", "text-blue-400", "border-blue-500/30");
        } else if (ratio <= goldRatio) {
             const formattedPrem = math.toCurrency(dynamicPremium);
             setHealth("Gold Plan", "ACA Subsidy Cap", formattedPrem, "$1500", "text-amber-400", "border-amber-500/30");
        } else {
             const formattedPrem = math.toCurrency(dynamicPremium);
             setHealth("Standard", "Subsidy Phase-out", formattedPrem, "$4000+", "text-slate-500", "border-slate-700");
        }

        const estimatedBenefit = engine.calculateSnapBenefit(data.unifiedIncome, data.hhSize, data.shelterCosts, data.hasSUA, data.isDisabled);
        const snapRes = document.getElementById('snap-result-value');
        const snapAnnual = document.getElementById('snap-annual-value');
        const snapCard = document.getElementById('card-snap');
        
        snapRes.textContent = math.toCurrency(estimatedBenefit);
        snapAnnual.textContent = `Total Annual: ${math.toCurrency(estimatedBenefit * 12)}`;
        
        if (estimatedBenefit <= 0) {
            snapRes.className = "text-5xl font-black text-slate-700 mono-numbers tracking-tighter transition-all";
            snapAnnual.className = "text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-0.5";
            snapCard.className = "card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg opacity-80 transition-all flex flex-col";
        } else {
            snapRes.className = "text-5xl font-black text-emerald-400 mono-numbers tracking-tighter drop-shadow-lg transition-all";
            snapAnnual.className = "text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5";
            snapCard.className = "card-container bg-slate-800 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-lg transition-all flex flex-col";
        }
    },

    scrape: () => {
        const c = document.getElementById('benefits-module');
        if (!c) return {};
        const get = (id, bool = false) => {
            const el = c.querySelector(`[data-benefit-id="${id}"]`);
            return el ? (bool ? el.checked : parseFloat(el.value) || 0) : (bool ? false : 0);
        };
        return { hhSize: get('hhSize'), unifiedIncome: get('unifiedIncome'), shelterCosts: get('shelterCosts'), hasSUA: get('hasSUA', true), isDisabled: get('isDisabled', true), isPregnant: get('isPregnant', true) };
    },

    load: (data) => {
        if (!data) return;
        const c = document.getElementById('benefits-module');
        if (!c) return;
        Object.entries(data).forEach(([key, val]) => {
            const el = c.querySelector(`[data-benefit-id="${key}"]`);
            if (el) el[el.type === 'checkbox' ? 'checked' : 'value'] = val;
        });
        benefits.refresh();
    }
};

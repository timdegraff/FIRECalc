
import { math, engine } from './utils.js';

export const benefits = {
    init: () => {
        const container = document.getElementById('benefits-module');
        if (!container) return;
        
        container.innerHTML = `
            <div class="max-w-7xl mx-auto space-y-4">
                <!-- Header -->
                <div class="flex items-center justify-between p-3 bg-slate-800/50 rounded-2xl border border-slate-700">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                            <i class="fas fa-hand-holding-heart text-amber-400 text-lg"></i>
                        </div>
                        <div>
                            <h2 class="text-lg font-bold text-white uppercase tracking-tighter">Benefit Optimization</h2>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 bg-slate-900 p-1.5 rounded-xl border border-slate-700">
                         <span class="label-std text-slate-500 pl-2">Household Size</span>
                         <div class="flex items-center gap-2">
                             <input type="range" data-benefit-id="hhSize" min="1" max="10" step="1" value="1" class="w-24 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer">
                             <span data-label="hhSize" class="text-blue-400 font-black text-lg mono-numbers w-6 text-center">1</span>
                         </div>
                    </div>
                </div>

                <!-- Unified Income Slider (Compact) -->
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
                    <div id="card-healthcare" class="card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300">
                        <div class="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2 tracking-wide">
                                <i class="fas fa-plus-square text-red-500 text-sm"></i> <span class="uppercase">Healthcare Stratum</span>
                            </h3>
                            <div class="flex items-center gap-2">
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700 hover:border-pink-500/50">
                                    <input type="checkbox" data-benefit-id="isPregnant" class="w-2.5 h-2.5 accent-pink-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Pregnant?</span>
                                </label>
                                <span id="health-cost-badge" class="px-2 py-0.5 bg-slate-700 text-slate-400 rounded text-[9px] font-bold uppercase tracking-widest">$0 / mo</span>
                            </div>
                        </div>
                        <div class="p-5 flex flex-col h-full justify-between">
                            <div class="text-center py-2">
                                <span class="label-std text-slate-500 block mb-1">Plan Status</span>
                                <div id="health-main-display" class="text-3xl font-black text-white tracking-tighter transition-all">Standard</div>
                                <div id="health-sub-display" class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Full Price Market Rate</div>
                            </div>

                            <!-- Visual Meter -->
                            <div class="relative h-2 bg-slate-950 rounded-full border border-slate-700 overflow-hidden flex mt-6 mb-4">
                                <div class="w-[30%] bg-emerald-500/80 h-full" title="Medicaid"></div>
                                <div class="w-[5%] bg-emerald-400/60 h-full" title="HMP+"></div>
                                <div class="w-[20%] bg-blue-500/60 h-full" title="Silver"></div>
                                <div class="w-[30%] bg-amber-500/60 h-full" title="Gold"></div>
                                <div id="health-marker" class="absolute top-0 w-1 h-full bg-white shadow-[0_0_8px_white] transition-all duration-300"></div>
                            </div>

                            <table class="w-full text-[10px] border-t border-slate-700/50 pt-3 mt-auto">
                                <tbody class="mono-numbers text-slate-300">
                                    <tr><td class="py-1 text-slate-500 font-medium">Est. Premium</td><td class="py-1 text-right font-bold" id="detail-premium">$0</td></tr>
                                    <tr><td class="py-1 text-slate-500 font-medium">Deductible</td><td class="py-1 text-right text-slate-400" id="detail-deductible">$0</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- SNAP Card -->
                    <div id="card-snap" class="card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300">
                        <div class="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/30">
                            <h3 class="text-xs font-bold text-white flex items-center gap-2 tracking-wide">
                                <i class="fas fa-utensils text-emerald-400 text-sm"></i> <span class="uppercase">Food Assistance</span>
                            </h3>
                            <div class="flex gap-2">
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700 hover:border-emerald-500/50">
                                    <input type="checkbox" data-benefit-id="hasSUA" checked class="w-2.5 h-2.5 accent-emerald-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Max Ded</span>
                                </label>
                                <label class="flex items-center gap-1.5 cursor-pointer bg-slate-900 px-2 py-0.5 rounded border border-slate-700 hover:border-emerald-500/50">
                                    <input type="checkbox" data-benefit-id="isDisabled" class="w-2.5 h-2.5 accent-emerald-500">
                                    <span class="text-[8px] font-bold uppercase text-slate-400">Senior/Dis</span>
                                </label>
                            </div>
                        </div>
                        <div class="p-5 flex flex-col h-full">
                            <div class="flex-grow flex flex-col items-center justify-center py-2">
                                <span class="label-std text-slate-500 mb-1">Monthly Benefit</span>
                                <div id="snap-result-value" class="text-5xl font-black text-emerald-400 mono-numbers tracking-tighter drop-shadow-lg transition-all">$0</div>
                            </div>
                            
                            <div class="mt-4 pt-4 border-t border-slate-700/50">
                                <div class="flex justify-between items-center mb-1">
                                    <label class="label-std text-slate-500">Shelter & Utility Cost</label>
                                    <div class="text-xs font-bold text-white mono-numbers" data-label="shelterCosts">$0</div>
                                </div>
                                <input type="range" data-benefit-id="shelterCosts" min="0" max="5000" step="50" value="700" class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-500 hover:accent-emerald-400 transition-all">
                            </div>
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
        container.querySelectorAll('input').forEach(input => {
            input.oninput = () => {
                if (input.dataset.benefitId === 'hhSize') {
                    container.querySelectorAll('[data-benefit-id="hhSize"]').forEach(el => el.value = input.value);
                }
                benefits.refresh();
                window.debouncedAutoSave();
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
        const income = data.unifiedIncome;
        const ratio = income / fpl2026;
        const maxSliderVal = 150000;
        const pct = (val) => Math.min(100, (val / maxSliderVal) * 100);

        // Update Health Marker
        const marker = document.getElementById('health-marker');
        if (marker) marker.style.left = `${pct(income)}%`;

        // Healthcare Elements
        const healthMain = document.getElementById('health-main-display');
        const healthSub = document.getElementById('health-sub-display');
        const healthCard = document.getElementById('card-healthcare');
        const costBadge = document.getElementById('health-cost-badge');
        
        const setHealth = (main, sub, prem, ded, colorClass, borderColor) => {
            healthMain.textContent = main;
            healthMain.className = `text-3xl font-black tracking-tighter transition-all ${colorClass}`;
            healthSub.textContent = sub;
            document.getElementById('detail-premium').textContent = prem;
            document.getElementById('detail-premium').className = `py-1 text-right font-bold ${colorClass}`;
            document.getElementById('detail-deductible').textContent = ded;
            
            // Card Styles
            healthCard.className = `card-container bg-slate-800 rounded-2xl border overflow-hidden shadow-lg transition-all duration-300 ${borderColor}`;
            
            if (prem === "$0") {
                 costBadge.textContent = "FREE";
                 costBadge.className = "px-2 py-0.5 bg-emerald-500 text-white rounded text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20";
            } else {
                 costBadge.textContent = `${prem} / mo`;
                 costBadge.className = "px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-[9px] font-bold uppercase tracking-widest";
            }
        };

        // Medicaid Limit Logic (Pregnant vs Standard)
        const medicaidLimit = data.isPregnant ? 1.95 : 1.38;

        if (ratio <= medicaidLimit) {
            setHealth("Medicaid", data.isPregnant ? "Pregnancy Coverage" : "100% Full Coverage", "$0", "$0", "text-emerald-400", "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]");
        } else if (ratio <= 1.60) {
            setHealth("HMP+", "Small Copayments", "$20", "Low", "text-emerald-300", "border-emerald-500/30");
        } else if (ratio <= 2.50) {
            setHealth("Silver CSR", "Subsidized Deductible", "$60", "$800", "text-blue-400", "border-blue-500/30");
        } else if (ratio <= 4.00) {
            setHealth("Gold Plan", "Market Rate", "$250", "$1500", "text-amber-400", "border-amber-500/30");
        } else {
            setHealth("Standard", "No Subsidies", "$450+", "High", "text-slate-500", "border-slate-700");
        }

        // SNAP Calc
        const estimatedBenefit = engine.calculateSnapBenefit(data.unifiedIncome, data.hhSize, data.shelterCosts, data.hasSUA, data.isDisabled);
        const snapResultEl = document.getElementById('snap-result-value');
        const snapCard = document.getElementById('card-snap');
        
        if (estimatedBenefit <= 0) {
            snapResultEl.textContent = "$0";
            snapResultEl.className = "text-5xl font-black text-slate-700 mono-numbers tracking-tighter transition-all";
            snapCard.className = "card-container bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transition-all duration-300 opacity-80";
        } else {
            snapResultEl.textContent = math.toCurrency(estimatedBenefit);
            snapResultEl.className = "text-5xl font-black text-emerald-400 mono-numbers tracking-tighter drop-shadow-[0_0_10px_rgba(52,211,153,0.3)] transition-all";
            snapCard.className = "card-container bg-slate-800 rounded-2xl border border-emerald-500/30 overflow-hidden shadow-lg transition-all duration-300";
        }
    },

    scrape: () => {
        const c = document.getElementById('benefits-module');
        if (!c) return {};
        const get = (id, type) => {
            const el = c.querySelector(`[data-benefit-id="${id}"]`);
            if (!el) return 0;
            if (type === 'bool') return el.checked;
            return parseFloat(el.value) || 0;
        };
        return {
            hhSize: get('hhSize'),
            unifiedIncome: get('unifiedIncome'),
            shelterCosts: get('shelterCosts'),
            hasSUA: get('hasSUA', 'bool'),
            isDisabled: get('isDisabled', 'bool'),
            isPregnant: get('isPregnant', 'bool')
        };
    },

    load: (data) => {
        if (!data) return;
        const c = document.getElementById('benefits-module');
        if (!c) return;
        Object.entries(data).forEach(([key, val]) => {
            const el = c.querySelector(`[data-benefit-id="${key}"]`);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = val;
            else el.value = val;
        });
        benefits.refresh();
    }
};

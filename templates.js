
import { math, stateTaxRates } from './utils.js';

export const templates = {
    helpers: {
        getEfficiencyBadge: (type, value = 0, costBasis = 0, state = 'Michigan') => {
            const v = math.fromCurrency(value);
            const b = math.fromCurrency(costBasis);
            const stateRate = (stateTaxRates[state] || {}).rate || 0;
            
            if (type === '529 Plan' || type === 'Post-Tax (Roth)') {
                return `<div class="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 mono-numbers" title="100% Efficient">100%</div>`;
            }

            if (v > 0 && b >= v) {
                 return `<div class="inline-flex items-center px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20 mono-numbers" title="100% Efficient (No Gains)">100%</div>`;
            }

            const styles = {
                'Taxable': { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                'Stock Options': { color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                'Pre-Tax (401k/IRA)': { color: 'text-amber-500', bg: 'bg-amber-500/10' },
                'Post-Tax (Roth)': { color: 'text-purple-400', bg: 'bg-purple-400/10' },
                'Cash': { color: 'text-pink-400', bg: 'bg-pink-400/10' },
                'HSA': { color: 'text-teal-400', bg: 'bg-teal-400/10' },
                'Crypto': { color: 'text-orange-400', bg: 'bg-orange-400/10' },
                'Metals': { color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                '529 Plan': { color: 'text-rose-400', bg: 'bg-rose-400/10' }
            };

            const s = styles[type] || styles['Taxable'];
            let label;

            if (type === 'Pre-Tax (401k/IRA)') {
                const combinedRate = 0.22 + stateRate;
                label = Math.round((1 - combinedRate) * 100) + '%';
            } else if (['Taxable', 'Crypto', 'Metals', 'Stock Options'].includes(type)) {
                const fedRate = (type === 'Metals') ? 0.28 : 0.15;
                const combinedCapGainsRate = fedRate + stateRate;
                const gainRatio = v > 0 ? Math.max(0, (v - b) / v) : 0;
                const efficiency = 1 - (gainRatio * combinedCapGainsRate);
                label = Math.round(efficiency * 100) + '%';
            } else {
                label = '100%';
            }

            return `<div class="inline-flex items-center px-2 py-1 rounded-md ${s.bg} ${s.color} text-[9px] font-black uppercase tracking-wider border border-white/5 opacity-90 mono-numbers">${label}</div>`;
        },
        getTypeClass: (type) => {
            const map = {
                'Cash': 'text-type-cash',
                'Taxable': 'text-type-taxable',
                'Pre-Tax (401k/IRA)': 'text-type-pretax',
                'Post-Tax (Roth)': 'text-type-posttax',
                'Crypto': 'text-type-crypto',
                'Metals': 'text-type-metals',
                'HSA': 'text-type-hsa',
                '529 Plan': 'text-type-529',
                'Stock Options': 'text-type-taxable'
            };
            return map[type] || 'text-type-taxable';
        }
    },

    investment: (data) => {
        const state = window.currentData?.assumptions?.state || 'Michigan';
        const type = data.type || 'Taxable';
        return `
            <td class="w-10 pl-6"><i class="fas fa-grip-vertical drag-handle text-slate-700 cursor-grab hover:text-slate-500"></i></td>
            <td><input data-id="name" type="text" placeholder="Account" class="input-base text-white uppercase tracking-wider text-xs"></td>
            <td>
                <div class="relative">
                    <select data-id="type" class="input-base uppercase tracking-wider text-[10px] ${templates.helpers.getTypeClass(type)}">
                        <option value="Taxable" ${type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Post-Tax (Roth)" ${type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                        <option value="Cash" ${type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${type === 'HSA' ? 'selected' : ''}>HSA</option>
                        <option value="529 Plan" ${type === '529 Plan' ? 'selected' : ''}>529 Plan</option>
                    </select>
                </div>
            </td>
            <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-bold mono-numbers"></td>
            <td><input data-id="costBasis" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400/70 mono-numbers"></td>
            <td class="text-center w-24">
                <div data-id="efficiency-container">
                    ${templates.helpers.getEfficiencyBadge(type, data.value, data.costBasis, state)}
                </div>
            </td>
            <td class="text-right pr-6"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
        `;
    },
    
    stockOption: (data) => `
        <td class="pl-6"><input data-id="name" type="text" placeholder="Grant" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="shares" type="number" step="1" placeholder="0" class="input-base text-right text-white font-bold mono-numbers"></td>
        <td><input data-id="strikePrice" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-emerald-500 font-bold mono-numbers"></td>
        <td><input data-id="currentPrice" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers"></td>
        <td><input data-id="growth" type="number" step="0.5" placeholder="10" value="${data.growth !== undefined ? data.growth : 10}" class="input-base text-center text-blue-400 font-bold mono-numbers"></td>
        <td class="text-center">
            <label class="cursor-pointer inline-flex items-center justify-center relative">
                <input type="checkbox" data-id="isLtcg" class="peer sr-only" ${data.isLtcg !== false ? 'checked' : ''}>
                <div class="w-12 py-1 rounded-md text-[9px] font-black border transition-all duration-200 select-none flex items-center justify-center
                    bg-blue-500/10 border-blue-500/20 text-blue-400 
                    peer-checked:bg-emerald-500/10 peer-checked:border-emerald-500/20 peer-checked:text-emerald-400
                    hover:border-white/20
                    peer-checked:[&>.ord-label]:hidden peer-checked:[&>.ltcg-label]:block">
                    <span class="ord-label block">ORD</span>
                    <span class="ltcg-label hidden">LTCG</span>
                </div>
            </label>
        </td>
        <td class="text-right py-2"><div data-id="netEquityDisplay" class="text-teal-400 font-black mono-numbers text-sm pr-2">$0</div></td>
        <td class="text-right pr-6"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,

    income: (data) => `
        <div class="removable-item card-container flex flex-col relative group shadow-lg overflow-hidden h-full">
            <div class="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div class="flex items-center gap-3 w-full">
                    <div class="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center text-teal-400 flex-shrink-0">
                        <i class="fas fa-money-check-alt text-[10px]"></i>
                    </div>
                    <input data-id="name" type="text" placeholder="SOURCE NAME" class="bg-transparent border-none outline-none text-white font-black uppercase tracking-widest text-xs placeholder:text-slate-600 w-full">
                </div>
                <button data-action="remove" class="text-slate-600 hover:text-red-400 transition-all">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
            
            <div class="p-5 space-y-4">
                <div class="grid grid-cols-2 gap-4 items-start">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center h-4">
                            <label class="label-std">Gross Amount</label>
                            <button data-action="toggle-freq" data-id="isMonthly" class="text-blue-500 hover:text-blue-400 label-std text-[9px]">Annual</button>
                        </div>
                        <input data-id="amount" data-type="currency" type="text" placeholder="$0" class="input-base text-teal-400 font-bold mono-numbers text-lg">
                    </div>
                    <div class="space-y-1">
                        <div class="h-4 flex items-center">
                            <label class="label-std">Growth %</label>
                        </div>
                        <input data-id="increase" type="number" step="0.1" placeholder="0" class="input-base text-white font-bold mono-numbers text-lg">
                    </div>
                </div>

                <div class="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                    <div class="grid grid-cols-3 gap-3">
                        <div class="space-y-1 relative">
                            <label class="label-std">401k %</label>
                            <input data-id="contribution" type="number" placeholder="0" class="input-base text-white font-bold mono-numbers text-center">
                            <div data-id="capWarning" class="hidden absolute -top-1 -right-1 text-yellow-500 text-xs" title="Exceeds Limit">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <label class="label-std">Match %</label>
                            <input data-id="match" type="number" placeholder="0" class="input-base text-white font-bold mono-numbers text-center">
                        </div>
                        <div class="space-y-1">
                            <label class="label-std">Bonus %</label>
                            <input data-id="bonusPct" type="number" placeholder="0" class="input-base text-white font-bold mono-numbers text-center">
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4 pt-2 border-t border-white/5">
                         <label class="flex items-center gap-2 cursor-pointer group">
                            <input data-id="contribOnBonus" type="checkbox" class="w-3 h-3 accent-blue-500 rounded bg-slate-900 border-slate-600">
                            <span class="text-[9px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">Contrib Bonus</span>
                         </label>
                         <label class="flex items-center gap-2 cursor-pointer group">
                            <input data-id="matchOnBonus" type="checkbox" class="w-3 h-3 accent-blue-500 rounded bg-slate-900 border-slate-600">
                            <span class="text-[9px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">Match Bonus</span>
                         </label>
                    </div>
                </div>

                <div class="space-y-1">
                    <div class="flex justify-between items-center h-4">
                        <label class="label-std text-slate-500">Deductions</label>
                        <button data-action="toggle-freq" data-id="incomeExpensesMonthly" class="text-blue-500 hover:text-blue-400 label-std text-[9px]">Annual</button>
                    </div>
                    <input data-id="incomeExpenses" data-type="currency" type="text" placeholder="$0" class="input-base text-pink-400 font-bold mono-numbers">
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div class="flex items-center gap-2">
                        <label class="label-std text-slate-500">NT Until:</label>
                        <input data-id="nonTaxableUntil" type="number" placeholder="2026" class="input-base w-16 text-center text-teal-400 font-bold mono-numbers px-1 py-0.5 h-6 text-[10px]">
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input data-id="remainsInRetirement" type="checkbox" class="w-3.5 h-3.5 accent-blue-500 rounded bg-slate-900 border-white/20">
                        <span class="text-[9px] font-black text-slate-500 uppercase group-hover:text-blue-400 transition-colors">Retirement Income</span>
                    </label>
                </div>
            </div>
        </div>
    `,
    "budget-savings": (data) => {
        const type = data.type || 'Taxable';
        const typeClass = templates.helpers.getTypeClass(type);
        const selectorHtml = data.isLocked 
            ? `<div class="flex items-center gap-2 w-full"><div class="w-2 h-2 rounded-full bg-blue-500"></div><span class="font-black uppercase tracking-wider text-[10px] text-blue-400">401k from Income</span></div><input type="hidden" data-id="type" value="Pre-Tax (401k/IRA)">` 
            : `<select data-id="type" class="input-base uppercase tracking-wider text-[10px] ${typeClass} cursor-pointer">
                        <option value="Taxable" ${type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Post-Tax (Roth)" ${type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                        <option value="Cash" ${type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${type === 'HSA' ? 'selected' : ''}>HSA</option>
                        <option value="529 Plan" ${type === '529 Plan' ? 'selected' : ''}>529 Plan</option>
                    </select>`;

        return `
            <td class="pl-8 py-3 border-l-4 ${typeClass.replace('text-', 'border-')}">
                <div class="flex items-center gap-3">
                    ${selectorHtml}
                </div>
            </td>
            <td class="text-center">
                 ${data.isLocked ? '' : `
                 <label class="inline-flex items-center px-3 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-pink-500/50 transition-all group" title="Contribution stops when you retire">
                    <span class="text-[9px] uppercase font-black text-slate-500 mr-2 group-hover:text-pink-400">Stop</span>
                    <input data-id="removedInRetirement" type="checkbox" class="w-3 h-3 accent-pink-500 rounded bg-slate-900 border-slate-700">
                </label>
                 `}
            </td>
            <td class="text-right"><input data-id="monthly" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400/80 font-bold mono-numbers" ${data.isLocked ? 'readonly disabled' : ''}></td>
            <td class="text-right"><input data-id="annual" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers" ${data.isLocked ? 'readonly disabled' : ''}></td>
            <td class="pr-8 text-right">${data.isLocked ? '' : '<button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button>'}</td>
        `;
    },
    "budget-expense": (data) => `
        <td class="pl-8 py-3 border-l-4 border-slate-700 hover:border-pink-500 transition-colors">
            <input data-id="name" type="text" placeholder="Item Name" class="input-base font-black uppercase tracking-wider text-xs">
        </td>
        <td class="text-center">
            <div class="flex items-center justify-center gap-2">
                <label class="flex items-center px-2 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-pink-500/50 transition-all group" title="Stop in Retirement">
                    <span class="text-[8px] uppercase font-black text-slate-500 mr-1.5 group-hover:text-pink-400">Stop</span>
                    <input data-id="removedInRetirement" type="checkbox" class="w-3 h-3 accent-pink-500" ${data.removedInRetirement ? 'checked' : ''}>
                </label>
                <label class="flex items-center px-2 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all group" title="Fixed (No Inflation)">
                    <span class="text-[8px] uppercase font-black text-slate-500 mr-1.5 group-hover:text-blue-400">Fixed</span>
                    <input data-id="isFixed" type="checkbox" class="w-3 h-3 accent-blue-500" ${data.isFixed ? 'checked' : ''}>
                </label>
            </div>
        </td>
        <td class="text-right"><input data-id="monthly" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-pink-400/80 font-bold mono-numbers"></td>
        <td class="text-right"><input data-id="annual" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-pink-500 font-black mono-numbers"></td>
        <td class="pr-8 text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    realEstate: () => `
        <td class="pl-6"><input data-id="name" type="text" placeholder="Property" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers"></td>
        <td><input data-id="mortgage" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-bold mono-numbers"></td>
        <td><input data-id="principalPayment" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400 font-bold mono-numbers opacity-60" title="Monthly Principal"></td>
        <td class="pr-6 text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    otherAsset: () => `
        <td class="pl-6"><input data-id="name" type="text" placeholder="Asset" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers"></td>
        <td><input data-id="loan" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-bold mono-numbers"></td>
        <td class="pr-6 text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    heloc: (data) => `
        <td class="pl-6"><input data-id="name" type="text" placeholder="HELOC" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="balance" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-black mono-numbers"></td>
        <td><input data-id="rate" type="number" step="0.1" placeholder="7.0" value="${data.rate || 7.0}" class="input-base text-center text-red-400 font-bold mono-numbers"></td>
        <td><input data-id="limit" data-type="currency" type="text" placeholder="$0" class="input-base text-right font-bold mono-numbers"></td>
        <td class="pr-6 text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    debt: () => `
        <td class="pl-6"><input data-id="name" type="text" placeholder="Debt" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="balance" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-black mono-numbers"></td>
        <td><input data-id="principalPayment" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400 font-bold mono-numbers opacity-60" title="Monthly Payment"></td>
        <td class="pr-6 text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `
};

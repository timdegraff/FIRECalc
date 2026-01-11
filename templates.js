import { math, stateTaxRates } from './utils.js';

export const templates = {
    helpers: {
        getTypeClass: (type) => {
            const map = {
                'Cash': 'text-type-cash',
                'Taxable': 'text-type-taxable',
                'Brokerage': 'text-type-taxable',
                'Pre-Tax (401k/IRA)': 'text-type-pretax',
                'Pre-Tax': 'text-type-pretax',
                'Roth IRA': 'text-type-posttax',
                'Post-Tax': 'text-type-posttax',
                'Roth Basis': 'text-type-posttax',
                'Roth Gains': 'text-type-posttax',
                'Crypto': 'text-type-crypto',
                'Metals': 'text-type-metals',
                'HSA': 'text-type-hsa',
                '529': 'text-type-529',
                'Stock Options': 'text-orange-400'
            };
            return map[type] || 'text-white';
        },
        renderStepper: (id, value, colorClass = "text-white", decimals = "1", isCurrency = false, step = 0.5, isPercent = false) => `
            <div class="relative group/stepper">
                <input data-id="${id}" 
                       data-decimals="${decimals}" 
                       ${isCurrency ? 'data-type="currency"' : ''} 
                       ${isPercent ? 'data-type="percent"' : ''} 
                       type="${(isCurrency || isPercent) ? 'text' : 'number'}" 
                       step="${step}" 
                       placeholder="0" 
                       value="${isCurrency ? math.toCurrency(value) : (isPercent ? (value + '%') : (value !== undefined ? (decimals === "0" && value % 1 !== 0 ? Math.round(value) : value) : 0))}" 
                       class="input-base text-center font-bold mono-numbers ${colorClass} pr-6">
                <div class="absolute right-1 top-0 bottom-0 flex flex-col justify-center gap-0.5 opacity-0 group-hover/stepper:opacity-100 transition-opacity">
                    <button data-step="up" data-target="${id}" class="text-[8px] text-slate-500 hover:text-white leading-none"><i class="fas fa-chevron-up"></i></button>
                    <button data-step="down" data-target="${id}" class="text-[8px] text-slate-500 hover:text-white leading-none"><i class="fas fa-chevron-down"></i></button>
                </div>
            </div>
        `
    },

    investment: (data) => {
        const type = data.type || 'Taxable';
        return `
            <td class="w-8 text-center"><i class="fas fa-grip-vertical drag-handle text-slate-700 cursor-grab hover:text-slate-500 text-[10px]"></i></td>
            <td><input data-id="name" type="text" placeholder="Account" class="input-base text-white uppercase tracking-wider text-xs"></td>
            <td>
                <div class="relative">
                    <select data-id="type" class="input-base uppercase tracking-wider text-[10px] ${templates.helpers.getTypeClass(type)}">
                        <option value="Taxable" ${type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Roth IRA" ${type === 'Roth IRA' ? 'selected' : ''}>Roth IRA</option>
                        <option value="Cash" ${type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${type === 'HSA' ? 'selected' : ''}>HSA</option>
                        <option value="529" ${type === '529' ? 'selected' : ''}>529</option>
                    </select>
                </div>
            </td>
            <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-bold mono-numbers"></td>
            <td><input data-id="costBasis" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400/70 mono-numbers"></td>
            <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
        `;
    },
    
    stockOption: (data) => `
        <td><input data-id="name" type="text" placeholder="Grant" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="shares" type="number" step="1" placeholder="0" class="input-base text-right text-white font-bold mono-numbers"></td>
        <td><input data-id="strikePrice" data-type="currency" data-decimals="2" type="text" placeholder="$0.00" class="input-base text-right text-orange-400/70 font-bold mono-numbers"></td>
        <td><input data-id="currentPrice" data-type="currency" data-decimals="2" type="text" placeholder="$0.00" class="input-base text-right text-orange-400 font-black mono-numbers"></td>
        <td><input data-id="growth" data-decimals="1" type="number" step="0.5" placeholder="10" value="${data.growth !== undefined ? data.growth : 10}" class="input-base text-center text-blue-400 font-bold mono-numbers"></td>
        <td class="text-center">
            <div class="w-12 py-1 mx-auto rounded-md text-[9px] font-black border transition-all duration-200 select-none flex items-center justify-center bg-blue-500/10 border-blue-500/20 text-blue-400" title="Fixed as Ordinary Income">
                <span class="block">ORD</span>
            </div>
            <input type="hidden" data-id="isLtcg" value="false">
        </td>
        <td class="text-right py-2"><div data-id="netEquityDisplay" class="text-orange-400 font-black mono-numbers text-sm pr-2">$0</div></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,

    income: (data) => `
        <div class="card-container flex flex-col relative group shadow-lg overflow-hidden h-full pb-5">
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
                            <input type="hidden" data-id="isMonthly" value="${data.isMonthly ? 'true' : 'false'}">
                            <button data-action="toggle-freq" data-target="isMonthly" class="text-blue-500 hover:text-blue-400 label-std text-[9px]">Annual</button>
                        </div>
                        <input data-id="amount" data-type="currency" type="text" placeholder="$0" class="input-base text-teal-400 font-bold mono-numbers text-lg">
                    </div>
                    <div class="space-y-1">
                        <div class="h-4 flex items-center">
                            <label class="label-std">Growth %</label>
                        </div>
                        ${templates.helpers.renderStepper('increase', data.increase, 'text-white text-lg', '1')}
                    </div>
                </div>

                <div class="p-3 bg-black/20 rounded-xl border border-white/5 space-y-3">
                    <div class="grid grid-cols-3 gap-3">
                        <div class="space-y-1 relative">
                            <div class="flex items-center gap-1.5 h-4 mb-1">
                                <label class="label-std mb-0">401k %</label>
                                <div data-id="capWarning" class="hidden text-yellow-500 text-[10px] cursor-help animate-pulse" title="Exceeds IRS Limit">
                                    <i class="fas fa-exclamation-triangle"></i>
                                </div>
                            </div>
                            ${templates.helpers.renderStepper('contribution', data.contribution, 'text-blue-400', '1')}
                        </div>
                        <div class="space-y-1">
                            <div class="flex items-center h-4 mb-1">
                                <label class="label-std mb-0">Match %</label>
                            </div>
                            ${templates.helpers.renderStepper('match', data.match, 'text-white', '1')}
                        </div>
                        <div class="space-y-1">
                            <div class="flex items-center h-4 mb-1">
                                <label class="label-std mb-0">Bonus %</label>
                            </div>
                            ${templates.helpers.renderStepper('bonusPct', data.bonusPct, 'text-white', '1')}
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-4 pt-2 border-t border-white/5">
                         <label class="flex items-center gap-2 cursor-pointer group">
                            <input data-id="contribOnBonus" type="checkbox" class="w-3 h-3 accent-blue-500 rounded bg-slate-900 border-slate-600" ${data.contribOnBonus ? 'checked' : ''}>
                            <span class="text-[9px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">401k on Bonus</span>
                         </label>
                         <label class="flex items-center gap-2 cursor-pointer group">
                            <input data-id="matchOnBonus" type="checkbox" class="w-3 h-3 accent-blue-500 rounded bg-slate-900 border-slate-600" ${data.matchOnBonus ? 'checked' : ''}>
                            <span class="text-[9px] font-bold text-slate-500 uppercase group-hover:text-blue-400 transition-colors">Match on Bonus</span>
                         </label>
                    </div>
                </div>

                <div class="space-y-1">
                    <div class="flex justify-between items-center h-4">
                        <label class="label-std text-slate-500">Deductions</label>
                        <input type="hidden" data-id="incomeExpensesMonthly" value="${data.incomeExpensesMonthly ? 'true' : 'false'}">
                        <button data-action="toggle-freq" data-target="incomeExpensesMonthly" class="text-blue-500 hover:text-blue-400 label-std text-[9px]">Annual</button>
                    </div>
                    <input data-id="incomeExpenses" data-type="currency" type="text" placeholder="$0" class="input-base text-pink-400 font-bold mono-numbers">
                </div>

                <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
                    <div class="flex items-center gap-2">
                        <label class="label-std text-slate-500">NO TAX UNTIL:</label>
                        <input data-id="nonTaxableUntil" type="number" placeholder="2026" class="input-base w-16 text-center text-teal-400 font-bold mono-numbers px-1 py-0.5 h-6 text-[10px]">
                    </div>
                    <label class="flex items-center gap-2 cursor-pointer group">
                        <input data-id="remainsInRetirement" type="checkbox" class="w-3.5 h-3.5 accent-blue-500 rounded bg-slate-900 border-white/20" ${data.remainsInRetirement ? 'checked' : ''}>
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
            : `<div class="flex items-center gap-2 w-full">
                <select data-id="type" class="input-base uppercase tracking-wider text-[10px] ${typeClass} cursor-pointer">
                    <option value="Taxable" ${type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                    <option value="Pre-Tax (401k/IRA)" ${type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                    <option value="Roth IRA" ${type === 'Roth IRA' ? 'selected' : ''}>Roth IRA</option>
                    <option value="Cash" ${type === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Crypto" ${type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                    <option value="Metals" ${type === 'Metals' ? 'selected' : ''}>Metals</option>
                    <option value="HSA" ${type === 'HSA' ? 'selected' : ''}>HSA</option>
                    <option value="529" ${type === '529' ? 'selected' : ''}>529</option>
                </select>
                <div data-id="capWarning" class="hidden text-yellow-500 text-[10px] cursor-help animate-pulse" title="Exceeds Annual IRS Family Limit ($8,550)">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
            </div>`;

        return `
            <td class="w-8 text-center">
                ${data.isLocked ? '' : '<i class="fas fa-grip-vertical drag-handle text-slate-700 cursor-grab hover:text-slate-500 text-[10px]"></i>'}
            </td>
            <td>
                <div class="flex items-center gap-3">
                    ${selectorHtml}
                </div>
            </td>
            <td class="text-center">
                 ${data.isLocked ? '' : `
                 <label class="inline-flex items-center px-3 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-pink-500/50 transition-all group" title="Contribution stops when you retire">
                    <span class="text-[9px] uppercase font-black text-slate-500 mr-2 group-hover:text-pink-400">No</span>
                    <input type="checkbox" data-id="removedInRetirement" class="w-3 h-3 accent-pink-500 rounded bg-slate-900 border-slate-700" ${data.removedInRetirement ? 'checked' : ''}>
                </label>
                 `}
            </td>
            <td class="text-right"><input data-id="monthly" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400/80 font-bold mono-numbers" ${data.isLocked ? 'readonly disabled' : ''}></td>
            <td class="text-right"><input data-id="annual" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers" ${data.isLocked ? 'readonly disabled' : ''}></td>
            <td class="text-right">${data.isLocked ? '' : '<button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button>'}</td>
        `;
    },
    "budget-expense": (data) => `
        <td class="w-8 text-center"><i class="fas fa-grip-vertical drag-handle text-slate-700 cursor-grab hover:text-slate-500 text-[10px]"></i></td>
        <td>
            <input data-id="name" type="text" placeholder="Item Name" class="input-base font-black uppercase tracking-wider text-xs">
        </td>
        <td class="text-center">
            <div class="flex items-center justify-center gap-2">
                <label class="flex items-center px-2 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-emerald-500/50 transition-all group" title="Persists in Retirement">
                    <span class="text-[8px] uppercase font-black text-slate-500 mr-1.5 group-hover:text-emerald-400">Yes</span>
                    <input type="checkbox" data-id="remainsInRetirement" class="w-3 h-3 accent-emerald-500" ${data.remainsInRetirement !== false ? 'checked' : ''}>
                </label>
                <label class="flex items-center px-2 py-1 bg-black/20 rounded-lg border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all group" title="Fixed (No Inflation)">
                    <span class="text-[8px] uppercase font-black text-slate-500 mr-1.5 group-hover:text-blue-400">Fixed</span>
                    <input type="checkbox" data-id="isFixed" class="w-3 h-3 accent-blue-500" ${data.isFixed ? 'checked' : ''}>
                </label>
            </div>
        </td>
        <td class="text-right"><input data-id="monthly" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-pink-400/80 font-bold mono-numbers"></td>
        <td class="text-right"><input data-id="annual" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-pink-500 font-black mono-numbers"></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    realEstate: () => `
        <td><input data-id="name" type="text" placeholder="Property" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers"></td>
        <td><input data-id="mortgage" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-bold mono-numbers"></td>
        <td><input data-id="principalPayment" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400 font-bold mono-numbers opacity-60" title="Monthly Principal"></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    otherAsset: () => `
        <td><input data-id="name" type="text" placeholder="Asset" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="value" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-teal-400 font-black mono-numbers"></td>
        <td><input data-id="loan" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-bold mono-numbers"></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    heloc: (data) => `
        <td><input data-id="name" type="text" placeholder="HELOC" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="balance" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-black mono-numbers"></td>
        <td><input data-id="limit" data-type="currency" type="text" placeholder="$0" class="input-base text-right font-bold mono-numbers"></td>
        <td><input data-id="rate" data-decimals="2" type="number" step="0.01" placeholder="7.0" value="${data.rate || 7.0}" class="input-base text-center text-red-400 font-bold mono-numbers"></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `,
    debt: () => `
        <td><input data-id="name" type="text" placeholder="Debt" class="input-base uppercase tracking-wider text-xs text-white"></td>
        <td><input data-id="balance" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-red-400 font-black mono-numbers"></td>
        <td><input data-id="principalPayment" data-type="currency" type="text" placeholder="$0" class="input-base text-right text-blue-400 font-bold mono-numbers opacity-60" title="Monthly Payment"></td>
        <td class="text-right"><button data-action="remove" class="w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all ml-auto"><i class="fas fa-times text-xs"></i></button></td>
    `
};

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave, updateSummaries } from './data.js';
import { signInWithGoogle, logoutUser } from './auth.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { formatter } from './formatter.js';

// --- MOBILE POLYFILLS & OVERRIDES ---
window.addRow = () => {}; 
window.updateSidebarChart = () => {};
window.createAssumptionControls = () => {};

window.debouncedAutoSave = () => {
    if (window.mobileSaveTimeout) clearTimeout(window.mobileSaveTimeout);
    window.mobileSaveTimeout = setTimeout(() => {
        autoSave(false); 
    }, 1000);
};
// ------------------------------------

let currentTab = 'assets-debts';

const ASSET_TYPE_COLORS = {
    'Taxable': 'text-type-taxable',
    'Pre-Tax (401k/IRA)': 'text-type-pretax',
    'Post-Tax (Roth)': 'text-type-posttax',
    'Cash': 'text-type-cash',
    'Crypto': 'text-type-crypto',
    'Metals': 'text-type-metals',
    'HSA': 'text-type-hsa',
    '529 Plan': 'text-type-529'
};

const MOBILE_TEMPLATES = {
    'assets-debts': () => `
        <div class="space-y-4">
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-chart-line text-orange-400"></i> Investments
                </h2>
                <button data-add-context="investment" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-investment-cards" class="space-y-3"></div>
            
            <div class="h-8"></div>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-home text-teal-400"></i> Real Estate
                </h2>
                <button data-add-context="realEstate" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-re-cards" class="space-y-3"></div>

             <div class="h-8"></div>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-university text-blue-400"></i> HELOCs
                </h2>
                <button data-add-context="heloc" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-heloc-cards" class="space-y-3"></div>

            <div class="h-8"></div>
            <div class="flex items-center justify-between">
                <h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-credit-card text-pink-500"></i> Other Debts
                </h2>
                <button data-add-context="debt" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-debt-cards" class="space-y-3"></div>
        </div>
    `,
    'income': () => `
        <div class="space-y-6">
            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">2026 Total Income</p>
                <p id="mobile-sum-income" class="text-3xl font-black text-white mono-numbers tracking-tighter">$0</p>
            </div>

            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-money-bill-wave text-emerald-400"></i> Income Sources
                </h2>
                <button data-add-context="income" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-income-cards" class="space-y-4"></div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-8">
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Savings</p>
                    <p id="mobile-sum-savings" class="text-xl font-black text-emerald-400 mono-numbers tracking-tighter">$0</p>
                </div>
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg">
                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Budget</p>
                    <p id="mobile-sum-budget" class="text-xl font-black text-pink-500 mono-numbers tracking-tighter">$0</p>
                </div>
            </div>

            <div class="flex items-center justify-between">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-piggy-bank text-emerald-400"></i> Savings
                </h2>
                <button data-add-context="savings" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-budget-savings" class="space-y-3"></div>
            
             <div class="flex items-center justify-between">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fas fa-shopping-cart text-pink-500"></i> Monthly Spending
                </h2>
                <button data-add-context="spending" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-budget-expenses" class="space-y-3"></div>
        </div>
    `,
    'projection': () => `
        <div class="h-full flex flex-col">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-black text-white uppercase tracking-tighter">Visual Projection</h2>
                <button id="toggle-projection-real" class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400">Nominal</button>
            </div>
            <div class="card-container p-4 bg-slate-800 rounded-2xl border border-slate-700 mb-4 h-[300px] flex-shrink-0 relative">
                <canvas id="projection-chart"></canvas>
            </div>
            
            <h3 class="mobile-label mb-2">Yearly Data</h3>
            <div id="projection-table-container" class="overflow-y-auto overflow-x-auto rounded-xl border border-slate-800 max-h-[300px] bg-slate-900/50"></div>
            
            <div class="h-8"></div>
            <div class="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div class="flex flex-col">
                    <span class="mobile-label">End Age</span>
                    <span id="mobile-proj-end-val" class="text-blue-400 font-black mono-numbers text-sm">75</span>
                </div>
                <input type="range" id="input-projection-end" min="50" max="100" value="75" class="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer">
            </div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
            <div id="burndown-view-container" class="space-y-6">
                <!-- Mobile Strategy Layout -->
                <div class="mobile-card space-y-4">
                    <div class="flex justify-between items-center">
                        <span class="mobile-label">Strategy Dial (MAGI)</span>
                        <span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span>
                    </div>
                    <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full bg-slate-600">
                    <div class="flex justify-between text-[7px] font-black text-slate-600 uppercase tracking-widest mt-0.5">
                        <span>0%</span>
                        <span class="text-emerald-500/50">Platinum</span>
                        <span class="text-blue-500/50">Silver</span>
                        <span>100%</span>
                    </div>
                </div>

                <div class="mobile-card flex flex-col items-center justify-center p-4">
                    <span class="mobile-label mb-1">Estimated SNAP Benefit</span>
                    <span id="est-snap-indicator" class="text-emerald-400 font-black mono-numbers text-3xl">$0/mo</span>
                </div>

                <!-- Hidden inputs required by burndown logic -->
                <input type="checkbox" id="toggle-rule-72t" checked class="hidden">
                <input type="checkbox" id="toggle-budget-sync" checked class="hidden">
                <input type="range" id="input-top-retire-age" class="hidden"> 
            </div>

            <div class="mt-8">
                <h3 class="mobile-label mb-2">Funding Priority</h3>
                <div id="m-priority-list" class="space-y-2"></div>
            </div>
        </div>
    `,
    'more': () => `
        <div class="space-y-8">
            <div class="mobile-card space-y-6">
                <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
                    <i class="fas fa-user-circle text-blue-400 text-lg"></i>
                    <h3 class="text-lg font-black text-white uppercase tracking-tighter">Personal Profile</h3>
                </div>
                <div id="m-profile-container" class="space-y-4"></div>
            </div>

            <div class="mobile-card space-y-6">
                 <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
                    <i class="fas fa-chart-line text-emerald-400 text-lg"></i>
                    <h3 class="text-lg font-black text-white uppercase tracking-tighter">Market Assumptions</h3>
                </div>
                <div id="m-market-container" class="space-y-4"></div>
            </div>

             <div class="mobile-card space-y-6">
                 <div class="flex items-center gap-3 border-b border-slate-700 pb-3">
                    <i class="fas fa-hand-holding-usd text-amber-400 text-lg"></i>
                    <h3 class="text-lg font-black text-white uppercase tracking-tighter">Social Security</h3>
                </div>
                <div id="m-ss-container" class="space-y-4"></div>
            </div>

            <div id="benefits-module"></div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data, idx, arrayName) => {
        const typeColorClass = ASSET_TYPE_COLORS[data.type] || 'text-white';
        return `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
                <div class="flex justify-between items-start">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Account Name">
                </div>
                <div class="flex justify-between items-end">
                    <div class="flex flex-col">
                        <span class="mobile-label">Asset Class</span>
                        <select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 mt-1 outline-none ${typeColorClass}">
                            <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                            <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                            <option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                            <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                            <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                            <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                            <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                            <option value="529 Plan" ${data.type === '529 Plan' ? 'selected' : ''}>529 Plan</option>
                        </select>
                    </div>
                    <div class="text-right">
                        <span class="mobile-label">Balance</span>
                        <input data-id="value" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.value || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-xl mono-numbers outline-none">
                    </div>
                </div>
            </div>
        </div>
    `},
    realEstate: (data, idx, arrayName) => `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
                <div class="flex justify-between items-start">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Property Name">
                </div>
                <div class="flex justify-between items-center gap-4">
                     <div class="flex-1">
                        <span class="mobile-label">Value</span>
                        <input data-id="value" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.value || 0)}" class="block w-full bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none">
                    </div>
                    <div class="flex-1 text-right">
                        <span class="mobile-label">Mortgage</span>
                        <input data-id="mortgage" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.mortgage || 0)}" class="block w-full text-right bg-transparent text-red-400 font-black text-lg mono-numbers outline-none">
                    </div>
                </div>
            </div>
        </div>
    `,
    heloc: (data, idx, arrayName) => `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
                <div class="flex justify-between items-start">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Bank/HELOC Name">
                </div>
                <div class="grid grid-cols-2 gap-4">
                     <div class="col-span-1">
                        <span class="mobile-label">Balance</span>
                        <input data-id="balance" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.balance || 0)}" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none">
                    </div>
                     <div class="col-span-1 text-right">
                        <span class="mobile-label">Limit</span>
                        <input data-id="limit" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.limit || 0)}" class="block w-full text-right bg-transparent text-slate-500 font-bold text-lg mono-numbers outline-none">
                    </div>
                </div>
                <!-- Rate hidden on mobile, defaults to 7% -->
            </div>
        </div>
    `,
    debt: (data, idx, arrayName) => `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
                <div class="flex justify-between items-start">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Liability Name">
                </div>
                <div class="text-right">
                    <span class="mobile-label">Current Balance</span>
                    <input data-id="balance" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.balance || 0)}" class="block w-full text-right bg-transparent text-red-400 font-black text-xl mono-numbers outline-none">
                </div>
            </div>
        </div>
    `,
    income: (data, idx, arrayName) => {
        // Enforce Annual Display
        const isMonthly = data.isMonthly || false;
        const annualAmt = isMonthly ? (data.amount || 0) * 12 : (data.amount || 0);

        return `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform space-y-4" data-idx="${idx}" data-array="${arrayName}">
                 <div class="flex justify-between items-center">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Source">
                </div>
                <div class="grid grid-cols-2 gap-4 border-b border-slate-700/50 pb-3">
                    <div>
                        <span class="mobile-label">Annual Amount</span>
                        <input data-id="amount" data-type="currency" inputmode="decimal" value="${math.toCurrency(annualAmt)}" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none">
                    </div>
                    <div class="text-right">
                        <span class="mobile-label">Growth %</span>
                        <input data-id="increase" type="number" inputmode="decimal" value="${data.increase || 0}" class="block w-full text-right bg-transparent text-white font-bold mono-numbers outline-none">
                    </div>
                </div>
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <span class="mobile-label">Bonus %</span>
                        <input data-id="bonusPct" type="number" inputmode="decimal" value="${data.bonusPct || 0}" class="block w-full bg-transparent text-slate-400 font-bold mono-numbers outline-none">
                    </div>
                    <div class="text-center">
                        <span class="mobile-label">401k %</span>
                        <input data-id="contribution" type="number" inputmode="decimal" value="${data.contribution || 0}" class="block w-full text-center bg-transparent text-blue-400 font-bold mono-numbers outline-none">
                    </div>
                    <div class="text-right">
                        <span class="mobile-label">Match %</span>
                        <input data-id="match" type="number" inputmode="decimal" value="${data.match || 0}" class="block w-full text-right bg-transparent text-emerald-400 font-bold mono-numbers outline-none">
                    </div>
                </div>
                <div class="pt-2 border-t border-slate-700/50">
                    <label class="flex items-center gap-2">
                        <input type="checkbox" data-id="remainsInRetirement" ${data.remainsInRetirement ? 'checked' : ''} class="w-4 h-4 accent-blue-500 rounded bg-slate-900 border-slate-600">
                        <span class="text-[9px] font-bold text-slate-500 uppercase">Retirement Income?</span>
                    </label>
                </div>
            </div>
        </div>
    `},
    savings: (data, idx, arrayName) => {
        const typeColorClass = ASSET_TYPE_COLORS[data.type] || 'text-white';
        // Note: Hidden inputs are handled by data binding logic, but we ensure defaults are set when adding.
        return `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex justify-between items-center" data-idx="${idx}" data-array="${arrayName}">
                 <div class="flex flex-col w-1/2">
                    <span class="mobile-label mb-1">Destination</span>
                    <select data-id="type" class="bg-slate-900 text-sm font-bold rounded px-2 py-1 outline-none ${typeColorClass} -ml-2">
                        <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                        <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                        <option value="529 Plan" ${data.type === '529 Plan' ? 'selected' : ''}>529 Plan</option>
                    </select>
                </div>
                <div class="text-right">
                    <span class="mobile-label">Monthly</span>
                    <input data-id="monthly" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none" ${data.isLocked ? 'readonly' : ''}>
                </div>
            </div>
        </div>
    `},
    expense: (data, idx, arrayName) => `
        <div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3">
            <div class="swipe-action-bg">
                <button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button>
            </div>
            <div class="mobile-card relative z-10 bg-slate-800 transition-transform flex justify-between items-center" data-idx="${idx}" data-array="${arrayName}">
                <div class="flex flex-col w-1/2">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-xs outline-none" placeholder="Item Name">
                </div>
                <div class="text-right">
                    <span class="mobile-label">Monthly</span>
                    <input data-id="monthly" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-pink-400 font-black text-lg mono-numbers outline-none">
                </div>
            </div>
        </div>
    `
};

function init() {
    attachGlobal();
    attachSwipeListeners();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await initializeData(user);
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
            renderTab();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    });
}

function attachGlobal() {
    document.getElementById('login-btn').onclick = signInWithGoogle;
    document.getElementById('logout-btn').onclick = logoutUser;

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.onclick = () => {
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTab();
        };
    });

    // Specific Add Buttons
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn || !btn.dataset.addContext) return;
        
        const context = btn.dataset.addContext;
        
        if (context === 'investment') {
            if (!window.currentData.investments) window.currentData.investments = [];
            window.currentData.investments.push({ type: 'Taxable', value: 0 });
        }
        else if (context === 'realEstate') {
            if (!window.currentData.realEstate) window.currentData.realEstate = [];
            window.currentData.realEstate.push({ name: '', value: 0, mortgage: 0, principalPayment: 0 });
        }
        else if (context === 'heloc') {
            if (!window.currentData.helocs) window.currentData.helocs = [];
            window.currentData.helocs.push({ name: '', balance: 0, limit: 0, rate: 7.0 });
        }
        else if (context === 'debt') {
             if (!window.currentData.debts) window.currentData.debts = [];
             window.currentData.debts.push({ name: '', balance: 0 });
        }
        else if (context === 'income') {
             if (!window.currentData.income) window.currentData.income = [];
             window.currentData.income.push({ amount: 0, increase: 0 });
        }
        else if (context === 'savings') {
             if (!window.currentData.budget.savings) window.currentData.budget.savings = [];
             // Default: Stop in Retirement = true, Fixed = false
             window.currentData.budget.savings.push({ type: 'Taxable', monthly: 0, annual: 0, removedInRetirement: true, isFixed: false });
        }
        else if (context === 'spending') {
             if (!window.currentData.budget.expenses) window.currentData.budget.expenses = [];
             // Default: Stop in Retirement = false, Fixed = false
             window.currentData.budget.expenses.push({ name: '', monthly: 0, annual: 0, removedInRetirement: false, isFixed: false });
        }
        
        renderTab();
        if (window.debouncedAutoSave) window.debouncedAutoSave();
    });

    document.body.addEventListener('input', (e) => {
        const input = e.target;
        
        // Handle Select Color Change
        if (input.tagName === 'SELECT' && input.dataset.id === 'type') {
            const newColor = ASSET_TYPE_COLORS[input.value] || 'text-white';
            Object.values(ASSET_TYPE_COLORS).forEach(c => input.classList.remove(c));
            input.classList.add(newColor);
        }

        // 1. Update In-Memory Data immediately
        const card = input.closest('.mobile-card');
        if (card && card.dataset.array && card.dataset.idx !== undefined) {
            const arrayName = card.dataset.array;
            const idx = parseInt(card.dataset.idx);
            const key = input.dataset.id;
            
            let targetArray;
            if (arrayName === 'budget.expenses') targetArray = window.currentData.budget.expenses;
            else if (arrayName === 'budget.savings') targetArray = window.currentData.budget.savings;
            else targetArray = window.currentData[arrayName];

            if (targetArray && targetArray[idx]) {
                let val;
                if (input.type === 'checkbox') val = input.checked;
                else if (input.dataset.type === 'currency') val = math.fromCurrency(input.value);
                else if (input.type === 'number' || input.type === 'range') val = parseFloat(input.value) || 0;
                else val = input.value;

                // SPECIAL LOGIC: INCOME IS ALWAYS ANNUAL ON MOBILE
                // If editing Income Amount, update the value AND force isMonthly to false so it syncs correctly as Annual to desktop
                if (arrayName === 'income' && key === 'amount') {
                    targetArray[idx]['isMonthly'] = false;
                    // Note: incomeExpenses are less likely to be edited on mobile but if they were, similar logic would apply. 
                    // For now, focusing on the main amount.
                }

                targetArray[idx][key] = val;
                
                if (key === 'monthly' && (arrayName.includes('budget'))) targetArray[idx]['annual'] = val * 12;
                if (key === 'annual' && (arrayName.includes('budget'))) targetArray[idx]['monthly'] = val / 12;
            }
        } 
        else if (input.closest('#m-profile-container') || input.closest('#m-market-container') || input.closest('#m-ss-container')) {
             if (!window.currentData.assumptions) window.currentData.assumptions = {};
             let val = input.value;
             if (input.type === 'number' || input.type === 'range') val = parseFloat(val) || 0;
             window.currentData.assumptions[input.dataset.id] = val;
        }
        else if (input.id === 'input-projection-end') {
             if (window.currentData) {
                 window.currentData.projectionEndAge = parseInt(input.value);
                 // Update label
                 const lbl = document.getElementById('mobile-proj-end-val');
                 if (lbl) lbl.textContent = input.value;
                 
                 projection.run(window.currentData);
             }
        }
        
        if (input.dataset.benefitId === 'hhSize') {
             if (!window.currentData.benefits) window.currentData.benefits = {};
             window.currentData.benefits.hhSize = parseFloat(input.value) || 1;
             if (benefits.refresh) benefits.refresh();
        }

        if (window.debouncedAutoSave) window.debouncedAutoSave();
        updateMobileSummaries();
    });
    
    // Swipe Remove Handler
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.action === 'remove-swipe') {
             const arrayName = btn.dataset.array;
             const idx = parseInt(btn.dataset.idx);
             
             let targetArray;
             if (arrayName === 'budget.expenses') targetArray = window.currentData.budget.expenses;
             else if (arrayName === 'budget.savings') targetArray = window.currentData.budget.savings;
             else targetArray = window.currentData[arrayName];

             if (targetArray) {
                 targetArray.splice(idx, 1);
                 renderTab();
                 if (window.debouncedAutoSave) window.debouncedAutoSave();
             }
        }
    });

    document.getElementById('close-inspector').onclick = () => {
        document.getElementById('inspector-overlay').classList.add('hidden');
    };
}

// --- SWIPE LOGIC ---
function attachSwipeListeners() {
    let touchStartX = 0;
    let currentSwipeCard = null;

    document.body.addEventListener('touchstart', (e) => {
        // FIX: Only target cards inside a swipe-wrapper (prevents swipe on static cards in More/Strategy)
        const card = e.target.closest('.swipe-wrapper .mobile-card');
        if (!card) return;
        
        // If we touch a different card, close the open one
        if (currentSwipeCard && currentSwipeCard !== card) {
            currentSwipeCard.style.transform = `translateX(0)`;
        }
        
        currentSwipeCard = card;
        touchStartX = e.touches[0].clientX;
        card.style.transition = 'none';
    }, {passive: true});

    document.body.addEventListener('touchmove', (e) => {
        if (!currentSwipeCard) return;
        const diff = e.touches[0].clientX - touchStartX;
        
        // Only allow swipe left (negative) and cap at -80px
        if (diff < 0 && diff > -100) {
             currentSwipeCard.style.transform = `translateX(${diff}px)`;
        }
    }, {passive: true});

    document.body.addEventListener('touchend', (e) => {
         if (!currentSwipeCard) return;
         const diff = e.changedTouches[0].clientX - touchStartX;
         currentSwipeCard.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
         
         // Threshold to snap open
         if (diff < -60) {
             currentSwipeCard.style.transform = `translateX(-80px)`;
         } else {
             currentSwipeCard.style.transform = `translateX(0)`;
         }
    });
}

function updateMobileSummaries() {
    if (!window.currentData) return;
    const s = engine.calculateSummaries(window.currentData);
    
    // Header NW
    const lbl = document.getElementById('mobile-nw-label');
    if (lbl) lbl.textContent = `${math.toCurrency(s.netWorth)} Net Worth`;

    // Income Tab Summary
    const incSum = document.getElementById('mobile-sum-income');
    if (incSum) incSum.textContent = math.toCurrency(s.totalGrossIncome);

    // Budget Tab Summary
    const savSum = document.getElementById('mobile-sum-savings');
    if (savSum) savSum.textContent = math.toCurrency(s.totalAnnualSavings);
    
    const budSum = document.getElementById('mobile-sum-budget');
    if (budSum) budSum.textContent = math.toCurrency(s.totalAnnualBudget);
}

function renderTab() {
    const main = document.getElementById('mobile-content');
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();

    if (!window.currentData) return;

    if (currentTab === 'assets-debts') {
        window.currentData.investments?.forEach((item, i) => addMobileRow('m-investment-cards', 'investment', item, i, 'investments'));
        window.currentData.realEstate?.forEach((item, i) => addMobileRow('m-re-cards', 'realEstate', { ...item, type: 'Real Estate' }, i, 'realEstate'));
        window.currentData.helocs?.forEach((item, i) => addMobileRow('m-heloc-cards', 'heloc', { ...item, type: 'HELOC', value: -item.balance }, i, 'helocs'));
        window.currentData.debts?.forEach((item, i) => addMobileRow('m-debt-cards', 'debt', { ...item, type: 'Debt', value: -item.balance }, i, 'debts'));
    }

    if (currentTab === 'income') {
        window.currentData.income?.forEach((item, i) => addMobileRow('m-income-cards', 'income', item, i, 'income'));
    }

    if (currentTab === 'budget') {
        window.currentData.budget?.savings?.forEach((item, i) => addMobileRow('m-budget-savings', 'savings', { ...item, monthly: item.annual/12 }, i, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((item, i) => addMobileRow('m-budget-expenses', 'expense', item, i, 'budget.expenses'));
    }
    
    if (currentTab === 'projection') {
        if (!window.currentData.projectionSettings) window.currentData.projectionSettings = {};
        projection.load(window.currentData.projectionSettings);
        // Ensure end age slider is synced
        const slider = document.getElementById('input-projection-end');
        if (slider) {
            const val = window.currentData.projectionEndAge || 75;
            slider.value = val;
            const lbl = document.getElementById('mobile-proj-end-val');
            if(lbl) lbl.textContent = val;
        }
        projection.run(window.currentData);
    }

    if (currentTab === 'burndown') {
        // We do not run burndown.init() here as it injects desktop HTML.
        // Instead we attach listeners manually for mobile.
        const slider = document.getElementById('input-strategy-dial');
        const hiddenRetireAge = document.getElementById('input-top-retire-age');
        
        if (hiddenRetireAge && window.currentData.assumptions) {
            // Sync with global assumption for calculation
            hiddenRetireAge.value = window.currentData.assumptions.retirementAge || 65;
        }

        if (slider) {
            // Restore previous value
            if (window.currentData.burndown?.strategyDial) slider.value = window.currentData.burndown.strategyDial;
            
            slider.oninput = () => {
                 const lbl = document.getElementById('label-strategy-status');
                 const val = parseInt(slider.value);
                 if (val <= 33) lbl.textContent = "Platinum Zone";
                 else if (val <= 66) lbl.textContent = "Silver CSR Zone";
                 else lbl.textContent = "Standard";
                 
                 // Haptic
                 if (navigator.vibrate && (val === 33 || val === 66)) navigator.vibrate(10);
                 
                 burndown.run();
                 if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
            // Trigger initial label set
            slider.dispatchEvent(new Event('input'));
        }

        burndown.run();
        renderMobilePriority();
    }

    if (currentTab === 'more') {
        renderMobileProfile();
        benefits.init();
        benefits.load(window.currentData.benefits);
        
        setTimeout(() => {
            const benefitsHH = document.querySelector('#benefits-module [data-benefit-id="hhSize"]')?.closest('.flex.items-center.gap-4');
            if(benefitsHH) benefitsHH.style.display = 'none';
        }, 100);
    }
    
    updateMobileSummaries();
}

function renderMobileProfile() {
    const pContainer = document.getElementById('m-profile-container');
    const mContainer = document.getElementById('m-market-container');
    const sContainer = document.getElementById('m-ss-container');
    
    if (!pContainer || !window.currentData) return;
    const a = window.currentData.assumptions || assumptions.defaults;
    const hhSize = window.currentData.benefits?.hhSize || 1;

    pContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="mobile-label">Current Age</span>
                <input data-id="currentAge" type="number" inputmode="decimal" value="${a.currentAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div>
                <span class="mobile-label">Retire Age</span>
                <input data-id="retirementAge" type="number" inputmode="decimal" value="${a.retirementAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-blue-400 outline-none">
            </div>
        </div>
        <div>
             <span class="mobile-label">Household Size</span>
             <input data-benefit-id="hhSize" type="range" min="1" max="10" step="1" value="${hhSize}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2">
             <div class="text-right text-white font-black text-sm mt-1">${hhSize} Person(s)</div>
        </div>
        <div>
            <span class="mobile-label">Legal State</span>
            <select data-id="state" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-bold text-white outline-none mt-1">
                ${Object.keys(stateTaxRates).sort().map(s => `<option value="${s}" ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
        </div>
        <div>
            <span class="mobile-label">Filing Status</span>
            <select data-id="filingStatus" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-bold text-white outline-none mt-1">
                <option ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                <option ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                <option ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
            </select>
        </div>
    `;

    mContainer.innerHTML = `
        <div class="space-y-4">
            <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Stock Growth</span><span class="text-white font-bold text-xs">${a.stockGrowth}%</span></div>
                <input data-id="stockGrowth" type="range" min="0" max="15" step="0.5" value="${a.stockGrowth}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Crypto Growth</span><span class="text-white font-bold text-xs">${a.cryptoGrowth}%</span></div>
                <input data-id="cryptoGrowth" type="range" min="0" max="50" step="1" value="${a.cryptoGrowth}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Metals Growth</span><span class="text-white font-bold text-xs">${a.metalsGrowth}%</span></div>
                <input data-id="metalsGrowth" type="range" min="0" max="15" step="0.5" value="${a.metalsGrowth}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-yellow-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Real Estate</span><span class="text-white font-bold text-xs">${a.realEstateGrowth}%</span></div>
                <input data-id="realEstateGrowth" type="range" min="0" max="10" step="0.5" value="${a.realEstateGrowth}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-indigo-500">
            </div>
            <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Inflation</span><span class="text-white font-bold text-xs">${a.inflation}%</span></div>
                <input data-id="inflation" type="range" min="0" max="10" step="0.1" value="${a.inflation}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-red-500">
            </div>
        </div>
    `;

    sContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="mobile-label">Start Age</span>
                <input data-id="ssStartAge" type="number" inputmode="decimal" value="${a.ssStartAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div>
                <span class="mobile-label">Monthly Benefit</span>
                <input data-id="ssMonthly" type="number" inputmode="decimal" value="${a.ssMonthly}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-teal-400 outline-none">
            </div>
        </div>
    `;
}

function renderMobilePriority() {
    const container = document.getElementById('m-priority-list');
    if (!container) return;
    const items = burndown.priorityOrder;
    container.innerHTML = items.map((pk, i) => {
        const meta = burndown.assetMeta[pk];
        return `
            <div class="mobile-card flex justify-between items-center py-3">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full" style="background-color: ${meta.color}"></div>
                    <span class="text-xs font-black text-white uppercase">${meta.label}</span>
                </div>
                <div class="flex gap-2">
                    <button onclick="reorderPriority(${i}, -1)" class="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-slate-500"><i class="fas fa-chevron-up"></i></button>
                    <button onclick="reorderPriority(${i}, 1)" class="w-8 h-8 flex items-center justify-center bg-slate-800 rounded text-slate-500"><i class="fas fa-chevron-down"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

window.reorderPriority = (index, dir) => {
    const items = burndown.priorityOrder;
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const temp = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temp;
    burndown.run();
    renderMobilePriority();
    if (window.debouncedAutoSave) window.debouncedAutoSave();
};

function openInspector(age) {
    const log = window.simulationTrace?.[age] || ["No calculation trace found for age " + age];
    document.getElementById('inspector-log').textContent = log.join('\n');
    document.getElementById('inspector-overlay').classList.remove('hidden');
}

function addMobileRow(containerId, type, data = {}, idx = 0, arrayName = '') {
    const container = document.getElementById(containerId);
    if (!container) return;
    const el = document.createElement('div');
    // Pass index and arrayName to template
    el.innerHTML = ITEM_TEMPLATES[type] ? ITEM_TEMPLATES[type](data, idx, arrayName) : `<div class="mobile-card">...</div>`;
    
    // FIX: Get reference to the child before appending, or use the container's last child after appending
    const card = el.firstElementChild;
    container.appendChild(card);
    
    // Bind listeners to the card that is now in the DOM
    card.querySelectorAll('[data-type="currency"]').forEach(input => {
        formatter.bindCurrencyEventListeners(input);
        // Explicitly clear 0 on click for mobile
        input.addEventListener('click', (e) => {
            if (math.fromCurrency(e.target.value) === 0) e.target.value = '';
        });
    });
}

init();

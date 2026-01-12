import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave, forceSyncData } from './data.js';
import { logoutUser } from './auth.js';
import { math, engine, assumptions, stateTaxRates, assetColors } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { formatter } from './formatter.js';
import { PROFILE_25_SINGLE, PROFILE_45_COUPLE, PROFILE_55_RETIREE } from './profiles.js';

// --- DEVELOPER / RESET MODE ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('reset') === 'true') {
    const keysToClear = [
        'firecalc_guest_data',
        'firecalc_guest_acknowledged',
        'firecalc_guest_mode',
        'firecalc_guest_profile_selected',
        'firecalc_app_version'
    ];
    keysToClear.forEach(k => localStorage.removeItem(k));
    window.location.href = window.location.pathname;
}

// --- SAFE VERSION CHECK LOGIC ---
const APP_VERSION = "3.0"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');
if (currentSavedVersion !== APP_VERSION) {
    localStorage.setItem('firecalc_app_version', APP_VERSION);
    sessionStorage.clear();
}

function setIndicatorColor(el, colorClass) {
    if (!el) return;
    el.classList.remove('text-slate-600', 'text-green-500', 'text-red-500', 'text-orange-500', 'text-slate-400');
    el.classList.add(colorClass, 'transition-colors', 'duration-200');
}

window.addRow = (id, type, data) => {};
window.updateSidebarChart = () => {};
window.createAssumptionControls = () => {};
window.debouncedAutoSave = () => {
    if (window.mobileSaveTimeout) clearTimeout(window.mobileSaveTimeout);
    window.mobileSaveTimeout = setTimeout(() => {
        const indicators = document.querySelectorAll('#save-indicator');
        const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';
        indicators.forEach(el => {
            if (!isGuest) setIndicatorColor(el, 'text-orange-500'); 
        });
        autoSave(false);
    }, 1500);
};

function triggerHaptic() {
    if (navigator.vibrate) navigator.vibrate(10); 
}

let currentTab = 'assets-debts';
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

window.addMobileItem = (type) => {
    if (!window.currentData) return;
    if (type === 'investments') {
        window.currentData.investments = window.currentData.investments || [];
        window.currentData.investments.push({ type: 'Taxable', value: 0 });
    }
    else if (type === 'realEstate') {
        window.currentData.realEstate = window.currentData.realEstate || [];
        window.currentData.realEstate.push({ name: '', value: 0, mortgage: 0, principalPayment: 0 });
    }
    else if (type === 'otherAssets') {
        window.currentData.otherAssets = window.currentData.otherAssets || [];
        window.currentData.otherAssets.push({ name: '', value: 0, loan: 0, principalPayment: 0 });
    }
    else if (type === 'stockOptions') {
        window.currentData.stockOptions = window.currentData.stockOptions || [];
        window.currentData.stockOptions.push({ name: '', shares: 0, strikePrice: 0, currentPrice: 0, growth: 10, isLtcg: false });
    }
    else if (type === 'helocs') {
        window.currentData.helocs = window.currentData.helocs || [];
        window.currentData.helocs.push({ name: '', balance: 0, rate: 7, limit: 0 });
    }
    else if (type === 'debts') {
        window.currentData.debts = window.currentData.debts || [];
        window.currentData.debts.push({ name: '', balance: 0, principalPayment: 0 });
    }
    else if (type === 'income') {
        window.currentData.income = window.currentData.income || [];
        window.currentData.income.push({ amount: 0, increase: 0, contribution: 0, match: 0, bonusPct: 0 });
    }
    else if (type === 'budget.savings') {
        window.currentData.budget = window.currentData.budget || {};
        window.currentData.budget.savings = window.currentData.budget.savings || [];
        window.currentData.budget.savings.push({ monthly: 0, annual: 0, type: 'Taxable', removedInRetirement: true, isFixed: false });
    }
    else if (type === 'budget.expenses') {
        window.currentData.budget = window.currentData.budget || {};
        window.currentData.budget.expenses = window.currentData.budget.expenses || [];
        window.currentData.budget.expenses.push({ monthly: 0, annual: 0, remainsInRetirement: false, isFixed: false });
    }
    renderTab();
    if (window.debouncedAutoSave) window.debouncedAutoSave();
};

const MOBILE_TEMPLATES = {
    'assets-debts': () => `
        <div class="space-y-4">
            <div id="mobile-assets-summary" class="text-center py-0 border-b border-slate-800 mb-1 grid grid-cols-2 gap-4">
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Assets</span>
                    <div id="val-total-assets" class="text-base font-black text-emerald-400 mono-numbers leading-tight">$0</div>
                </div>
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Debts</span>
                    <div id="val-total-debts" class="text-base font-black text-red-400 mono-numbers leading-tight">$0</div>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-line text-orange-400 mr-2"></i>Investments</h2>
                    <button id="add-investment-btn" onclick="window.addMobileItem('investments')" class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-investment-cards" class="space-y-1.5"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-home text-indigo-400 mr-2"></i>Real Estate</h2>
                    <button onclick="window.addMobileItem('realEstate')" class="w-6 h-6 bg-indigo-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-re-cards" class="space-y-1.5"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-car text-teal-400 mr-2"></i>Other Assets</h2>
                    <button onclick="window.addMobileItem('otherAssets')" class="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-other-asset-cards" class="space-y-1.5"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-university text-orange-400 mr-2"></i>HELOCs</h2>
                    <button onclick="window.addMobileItem('helocs')" class="w-6 h-6 bg-orange-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-heloc-cards" class="space-y-1.5"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-credit-card text-red-500 mr-2"></i>Other Debts</h2>
                    <button onclick="window.addMobileItem('debts')" class="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-debt-cards" class="space-y-1.5"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-briefcase text-blue-400 mr-2"></i>Private Equity</h2>
                    <button onclick="window.addMobileItem('stockOptions')" class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-stock-option-cards" class="space-y-1.5"></div>
            </div>
            
            <div class="pt-2 border-t border-slate-800">
                <h3 class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 text-center">Asset Allocation</h3>
                <div id="mobile-asset-allocation-list" class="grid grid-cols-2 gap-2"></div>
            </div>
        </div>
    `,
    'income': () => `
        <div class="space-y-4">
            <div id="mobile-income-summary" class="text-center py-1 border-b border-slate-800 mb-2">
                <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">2026 Gross Income</span>
                <div id="val-income-total" class="text-lg font-black text-teal-400 mono-numbers tracking-tighter leading-tight">$0</div>
            </div>
            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-money-bill-wave text-teal-400 mr-2"></i>Income Sources</h2>
                    <button onclick="window.addMobileItem('income')" class="w-6 h-6 bg-teal-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-income-cards" class="space-y-2"></div>
            </div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-4">
            <div id="mobile-budget-summary" class="text-center py-0 border-b border-slate-800 mb-1 grid grid-cols-2 gap-4">
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Savings</span>
                    <div id="val-budget-savings" class="text-base font-black text-emerald-400 mono-numbers leading-tight">$0</div>
                </div>
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Spend</span>
                    <div id="val-budget-spend" class="text-base font-black text-pink-500 mono-numbers leading-tight">$0</div>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-piggy-bank text-emerald-400 mr-2"></i>Savings</h2>
                    <button onclick="window.addMobileItem('budget.savings')" class="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-budget-savings" class="space-y-1.5"></div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-2">
                    <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-pie text-pink-500 mr-2"></i>Spending</h2>
                    <button onclick="window.addMobileItem('budget.expenses')" class="w-6 h-6 bg-pink-600 rounded flex items-center justify-center text-white active:scale-95"><i class="fas fa-plus text-[10px]"></i></button>
                </div>
                <div id="m-budget-expenses" class="space-y-1.5"></div>
            </div>
        </div>
    `,
    'benefits': () => `
        <div class="space-y-4">
            <div id="mobile-benefits-summary" class="text-center py-0 border-b border-slate-800 mb-1 grid grid-cols-2 gap-4">
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">Health</span>
                    <div id="mobile-val-health-plan" class="text-base font-black text-emerald-400 uppercase tracking-tight truncate leading-tight">Platinum</div>
                </div>
                <div class="py-1">
                    <span class="text-[8px] font-black text-slate-500 uppercase tracking-widest">SNAP</span>
                    <div id="mobile-val-snap-amt" class="text-base font-black text-emerald-400 mono-numbers leading-tight">$0</div>
                </div>
            </div>
            <div id="benefits-module" class="space-y-3"></div>
        </div>
    `,
    'assumptions': () => `
        <div class="space-y-4">
            <div class="flex items-center gap-2 mb-1">
                <h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-sliders-h text-emerald-400 mr-2"></i>Config</h2>
            </div>
            <div id="m-assumptions-container" class="space-y-2"></div>
            
            <div id="mobile-assumptions-summary" class="pt-4 border-t border-slate-800 space-y-2">
                <button id="btn-reset-market-defaults-mobile" class="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-[9px] font-black text-slate-400 uppercase tracking-widest active:scale-95 active:bg-slate-700 transition-all">
                    Reset Market Defaults
                </button>
                <button id="btn-factory-reset-mobile" class="w-full px-4 py-3 bg-red-900/10 border border-red-500/20 rounded-xl text-[9px] font-black text-red-400 uppercase tracking-widest active:scale-95 active:bg-red-900/20 transition-all">
                    <i class="fas fa-trash-alt mr-2"></i> Factory Reset
                </button>
            </div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
            <div class="card-container bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg p-3 mb-2">
                <div class="flex flex-col gap-1.5">
                    <div class="flex justify-between items-end">
                         <div class="flex flex-col">
                            <label class="label-std text-emerald-400">Burn Down Engine</label>
                            <p class="text-[7px] text-slate-500 font-medium italic">Handout → Iron Fist</p>
                         </div>
                         <div id="mobile-strategy-status" class="text-[10px] font-black text-white uppercase tracking-widest leading-none">Handout Hunter</div>
                    </div>
                    <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="0" class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500">
                </div>
            </div>

            <div class="card-container bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-lg p-3 mb-4">
                <div class="flex flex-col gap-1.5">
                    <div class="flex justify-between items-end">
                         <div class="flex flex-col">
                            <label class="label-std text-blue-400">Retirement Age</label>
                            <p class="text-[7px] text-slate-500 font-medium italic">Simulate earlier exit</p>
                         </div>
                         <div id="label-top-retire-age" class="text-xl font-black text-white mono-numbers leading-none">65</div>
                    </div>
                    <input type="range" id="input-top-retire-age" min="18" max="72" step="1" value="65" class="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
                </div>
            </div>

            <div id="burndown-view-container" class="space-y-2"></div>
            <div id="burndown-table-container" class="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50"></div>
        </div>
    `,
    'projection': () => `
        <div class="space-y-3 pb-4">
            <div class="flex items-center justify-between"><h2 class="text-xs font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-line text-blue-400 mr-2"></i>Chart</h2><button id="toggle-projection-real" class="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[9px] font-bold text-slate-400">Nominal $</button></div>
            <div class="mobile-card p-2 h-[220px] relative"><canvas id="projection-chart"></canvas></div>
            <div class="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-inner">
                <div class="flex flex-col"><span class="mobile-label">End Age</span><span id="mobile-proj-end-val" class="text-blue-400 font-black mono-numbers text-xs">72</span></div>
                <input type="range" id="input-projection-end" min="50" max="100" value="72" class="flex-grow mobile-slider">
            </div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data) => {
        const tcMap = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Roth IRA': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', '529': 'text-type-529' };
        const tc = tcMap[data.type] || 'text-white';
        return `
        <div class="mobile-card flex flex-col gap-0.5">
            <div class="flex justify-between items-center">
                <div class="flex flex-col w-1/2">
                    <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-xs outline-none" placeholder="Account">
                    <select data-id="type" class="bg-transparent text-[8px] font-bold outline-none ${tc} mt-0.5">
                        <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Roth IRA" ${data.type === 'Roth IRA' ? 'selected' : ''}>Roth IRA</option>
                        <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                        <option value="529" ${data.type === '529' ? 'selected' : ''}>529</option>
                    </select>
                </div>
                <div class="text-right flex-grow">
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-teal-400 font-black text-2xl mono-numbers outline-none leading-none tracking-tighter">
                </div>
            </div>
        </div>`;
    },
    realEstate: (data) => `
        <div class="mobile-card space-y-1">
            <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-[10px] w-full outline-none" placeholder="Property">
            <div class="grid grid-cols-2 gap-2">
                <div><span class="mobile-label">Value</span><input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
                <div><span class="mobile-label">Mortgage</span><input data-id="mortgage" data-type="currency" value="${math.toCurrency(data.mortgage || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
            </div>
        </div>
    `,
    stockOption: (data) => {
       const shares = parseFloat(data.shares) || 0, strike = math.fromCurrency(data.strikePrice), fmv = math.fromCurrency(data.currentPrice), equity = Math.max(0, (fmv - strike) * shares);
       return `
       <div class="mobile-card space-y-1.5">
           <div class="flex justify-between items-center">
               <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-[10px] w-1/2 outline-none" placeholder="Grant">
               <div class="flex items-center gap-2">
                    <div class="px-2 py-0.5 rounded text-[8px] font-black border transition-all bg-blue-500/10 border-blue-500/20 text-blue-400" title="Fixed as Ordinary Income">
                        <span>ORD</span>
                    </div>
                    <input type="hidden" data-id="isLtcg" value="false">
                    <div class="text-[10px] font-black text-orange-400 mono-numbers">${math.toCurrency(equity)}</div>
               </div>
           </div>
           <div class="grid grid-cols-3 gap-2">
               <div><span class="mobile-label">Shares</span><input data-id="shares" type="number" value="${data.shares || 0}" class="block w-full bg-transparent text-white font-bold mono-numbers outline-none border-b border-slate-800 text-[10px]"></div>
               <div><span class="mobile-label">Strike</span><input data-id="strikePrice" data-type="currency" data-decimals="2" value="${math.toCurrency(data.strikePrice || 0, false, 2)}" inputmode="decimal" class="block w-full bg-transparent text-orange-400/80 font-bold mono-numbers outline-none border-b border-slate-800 text-[10px]"></div>
               <div><span class="mobile-label">FMV</span><input data-id="currentPrice" data-type="currency" data-decimals="2" value="${math.toCurrency(data.currentPrice || 0, false, 2)}" inputmode="decimal" class="block w-full bg-transparent text-orange-400 font-bold mono-numbers outline-none border-b border-slate-800 text-[10px]"></div>
           </div>
       </div>
       `;
    },
    otherAsset: (data) => `
        <div class="mobile-card space-y-1">
            <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-[10px] w-full outline-none" placeholder="Asset">
            <div class="grid grid-cols-2 gap-2">
                <div><span class="mobile-label">Value</span><input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
                <div><span class="mobile-label">Loan</span><input data-id="loan" data-type="currency" value="${math.toCurrency(data.loan || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
            </div>
        </div>
    `,
    heloc: (data) => `
        <div class="mobile-card space-y-1">
            <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-[10px] w-full outline-none" placeholder="HELOC">
            <div class="grid grid-cols-3 gap-2">
                <div><span class="mobile-label">Balance</span><input data-id="balance" data-type="currency" value="${math.toCurrency(data.balance || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
                <div><span class="mobile-label">Limit</span><input data-id="limit" data-type="currency" value="${math.toCurrency(data.limit || 0)}" inputmode="decimal" class="block w-full bg-transparent text-slate-400 font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
                <div><span class="mobile-label">Rate</span><input data-id="rate" type="number" value="${data.rate || 0}" class="block w-full bg-transparent text-white font-bold text-sm mono-numbers outline-none border-b border-slate-800"></div>
            </div>
        </div>
    `,
    debt: (data) => `
        <div class="mobile-card space-y-1">
            <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-[10px] w-full outline-none" placeholder="Debt">
            <div class="flex items-end gap-4">
                <div class="flex-grow"><span class="mobile-label">Balance</span><input data-id="balance" data-type="currency" value="${math.toCurrency(data.balance || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-sm mono-numbers outline-none border-b border-slate-800"></div>
            </div>
        </div>
    `,
    income: (data) => `
        <div class="mobile-card space-y-1.5">
             <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-[10px] w-full outline-none" placeholder="Source">
            <div class="grid grid-cols-2 gap-4 items-end">
                <div><span class="mobile-label">Gross</span><input data-id="amount" data-type="currency" value="${math.toCurrency(data.amount || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none border-b border-slate-800 text-xl"></div>
                <div><span class="mobile-label">Growth</span><input data-id="increase" type="number" value="${data.increase || 0}" class="block w-full bg-transparent text-white font-bold mono-numbers outline-none border-b border-slate-800 text-sm"></div>
            </div>
            <div class="p-1.5 bg-slate-900/50 rounded-xl border border-slate-800"><div class="grid grid-cols-3 gap-1">
                <div><span class="mobile-label">401k</span><input data-id="contribution" type="number" value="${data.contribution || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none text-[10px]"></div>
                <div><span class="mobile-label">Match</span><input data-id="match" type="number" value="${data.match || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none text-[10px]"></div>
                <div><span class="mobile-label">Bonus</span><input data-id="bonusPct" type="number" value="${data.bonusPct || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none text-[10px]"></div>
            </div></div>
        </div>
    `,
    savings: (data) => {
        if (data.isLocked) return `
             <div class="mobile-card border border-blue-500/30 bg-slate-800/60 flex justify-between items-center py-1 px-3">
                <div class="text-blue-400 font-black text-[8px] uppercase tracking-widest">401k from Income</div>
                <input data-id="annual" data-type="currency" value="${math.toCurrency(data.annual || 0)}" class="block text-right bg-transparent text-blue-400 font-black text-lg mono-numbers outline-none" readonly>
            </div>`;
        const tcMap = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Roth IRA': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', '529': 'text-type-529' };
        const tc = tcMap[data.type] || 'text-white';
        return `
        <div class="mobile-card flex justify-between items-center py-1 px-3">
            <div class="w-1/2">
                <select data-id="type" class="bg-slate-900 text-[8px] font-bold rounded px-1.5 py-0.5 outline-none ${tc} w-full">
                    <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                    <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                    <option value="Roth IRA" ${data.type === 'Roth IRA' ? 'selected' : ''}>Roth IRA</option>
                    <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                    <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                    <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                    <option value="529" ${data.type === '529' ? 'selected' : ''}>529</option>
                </select>
            </div>
            <div class="w-1/2 flex flex-col items-end">
                <input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-emerald-400/70 font-bold text-xs mono-numbers outline-none" placeholder="Monthly">
                <input data-id="annual" data-type="currency" value="${math.toCurrency(data.annual || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-emerald-400 font-black text-lg mono-numbers outline-none" placeholder="Annual">
            </div>
        </div>`;
    },
    expense: (data) => `
        <div class="mobile-card py-1 px-3 flex justify-between items-center">
            <input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-[9px] outline-none w-1/2" placeholder="Expense">
            <div class="w-1/2 flex flex-col items-end">
                <input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-pink-400 font-black text-lg mono-numbers outline-none" placeholder="Monthly">
                <input data-id="annual" data-type="currency" value="${math.toCurrency(data.annual || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-pink-400/70 font-bold text-xs mono-numbers outline-none" placeholder="Annual">
            </div>
        </div>`
};

function init() {
    attachGlobal();
    onAuthStateChanged(auth, async (user) => {
        const guestModeActive = localStorage.getItem('firecalc_guest_mode') === 'true';
        if (user) {
            localStorage.removeItem('firecalc_guest_mode');
            try { await initializeData(user); document.getElementById('login-screen').classList.add('hidden'); document.getElementById('app-container').classList.remove('hidden'); renderTab(); } catch (e) { console.error(e); }
        } else if (guestModeActive) {
            try {
                // Logic Sequence: Warning -> Profile Selection -> App
                const hasAcknowledged = localStorage.getItem('firecalc_guest_acknowledged') === 'true';
                const hasSelectedProfile = localStorage.getItem('firecalc_guest_profile_selected') === 'true';

                if (!hasAcknowledged) {
                    const modal = document.getElementById('guest-modal');
                    const btn = document.getElementById('ack-guest-btn');
                    if (modal && btn) {
                        modal.classList.remove('hidden');
                        btn.onclick = () => {
                            localStorage.setItem('firecalc_guest_acknowledged', 'true');
                            modal.classList.add('hidden');
                            showProfileSelection();
                        };
                    }
                } else if (!hasSelectedProfile) {
                    showProfileSelection();
                } else {
                    await loadApp();
                }
            } catch (e) { console.error(e); }
        } else { document.getElementById('login-screen').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }
    });
}

function showProfileSelection() {
    const profileModal = document.getElementById('profile-modal');
    if (!profileModal) return;
    
    profileModal.classList.remove('hidden');
    
    const handleProfileSelect = async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        
        const type = btn.dataset.profile;
        let dataToLoad = PROFILE_45_COUPLE; 
        
        if (type === '25') dataToLoad = PROFILE_25_SINGLE;
        else if (type === '55') dataToLoad = PROFILE_55_RETIREE;
        
        localStorage.setItem('firecalc_guest_data', JSON.stringify(dataToLoad));
        localStorage.setItem('firecalc_guest_profile_selected', 'true');
        
        profileModal.classList.add('hidden');
        await loadApp();
    };

    profileModal.querySelectorAll('button').forEach(b => {
        b.onclick = handleProfileSelect;
    });
}

async function loadApp() {
    await initializeData(null); 
    document.getElementById('login-screen').classList.add('hidden'); 
    document.getElementById('app-container').classList.remove('hidden');
    
    const headerActions = document.querySelector('header .flex.items-center.gap-3');
    if (headerActions && !document.getElementById('login-to-save-mobile')) {
        const btn = document.createElement('button');
        btn.id = 'login-to-save-mobile';
        btn.className = "px-2 py-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-lg text-[8px] font-black uppercase tracking-tight active:scale-95";
        btn.textContent = "LOGIN TO SAVE"; btn.onclick = () => {
            const loginBtn = document.getElementById('login-btn');
            if (loginBtn) loginBtn.click();
        };
        headerActions.insertBefore(btn, document.getElementById('save-indicator'));
    }
    // We don't hide the indicator anymore so it can show the cloud-slash status
    
    renderTab();
}

function attachGlobal() {
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.onclick = async () => { 
            try { 
                await setPersistence(auth, browserLocalPersistence); 
                await signInWithPopup(auth, provider); 
            } catch (error) { 
                if(error.code !== 'auth/popup-blocked' || error.code !== 'auth/popup-closed-by-user') alert(error.message); 
            } 
        };
    }

    const guestBtn = document.getElementById('guest-btn'); 
    if (guestBtn) {
        guestBtn.onclick = () => { 
            localStorage.setItem('firecalc_guest_mode', 'true'); 
            window.location.reload(); 
        };
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.onclick = async () => { 
            if (localStorage.getItem('firecalc_guest_mode') === 'true') { 
                ['firecalc_guest_data', 'firecalc_guest_acknowledged', 'firecalc_guest_mode', 'firecalc_guest_profile_selected'].forEach(k => localStorage.removeItem(k));
                window.location.reload(); 
            } else {
                await logoutUser(); 
            }
        };
    }

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => btn.onclick = () => { 
        triggerHaptic(); 
        currentTab = btn.dataset.tab; 
        document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active')); 
        btn.classList.add('active'); 
        if (currentTab === 'burndown' || currentTab === 'projection' || currentTab === 'benefits') {
            forceSyncData();
        }
        renderTab(); 
    });

    document.body.addEventListener('input', (e) => {
        triggerHaptic(); const input = e.target;
        if (input.dataset.id && document.getElementById('m-assumptions-container') && input.closest('#m-assumptions-container')) {
            const val = parseFloat(input.value) || 0, id = input.dataset.id;
            if (['stockGrowth', 'cryptoGrowth', 'metalsGrowth', 'realEstateGrowth'].includes(id) && window.currentData.assumptions) window.currentData.assumptions[id + 'Perpetual'] = val;
            const display = input.parentElement.querySelector('.mono-numbers');
            if (display) display.textContent = id.includes('Growth') || id === 'inflation' ? val + '%' : (id === 'ssMonthly' ? math.toCurrency(val) : val);
            if (window.currentData.assumptions) window.currentData.assumptions[id] = val;
            if (id === 'hhSize' && window.currentData.benefits) window.currentData.benefits.hhSize = val;
        }
        if (input.id === 'input-strategy-dial') {
            const val = parseInt(input.value);
            const mode = val < 50 ? 'PLATINUM' : 'RAW';
            if (!window.currentData.burndown) window.currentData.burndown = {}; 
            window.currentData.burndown.strategyMode = mode;
            const lbl = document.getElementById('mobile-strategy-status');
            if (lbl) lbl.textContent = mode === 'PLATINUM' ? "Handout Hunter" : "Iron Fist";
            burndown.run(); 
        }
        const wrapper = input.closest('[data-array]');
        if (wrapper && wrapper.dataset.index !== undefined) {
            const arrName = wrapper.dataset.array, idx = parseInt(wrapper.dataset.index), key = input.dataset.id; let val = input.value;
            if (input.type === 'checkbox') val = input.checked; else if (input.dataset.type === 'currency') val = math.fromCurrency(val); else if (input.type === 'number') val = parseFloat(val);
            
            if (arrName === 'budget.savings' && window.currentData.budget?.savings?.[idx]) {
                window.currentData.budget.savings[idx][key] = val;
                if (key === 'monthly') {
                    window.currentData.budget.savings[idx].annual = val * 12;
                    const annInp = wrapper.querySelector('input[data-id="annual"]');
                    if (annInp) { annInp.value = math.toCurrency(val * 12); formatter.updateZeroState(annInp); }
                } 
                if (key === 'annual') {
                    window.currentData.budget.savings[idx].monthly = val / 12;
                    const monInp = wrapper.querySelector('input[data-id="monthly"]');
                    if (monInp) { monInp.value = math.toCurrency(val / 12); formatter.updateZeroState(monInp); }
                }
            } else if (arrName === 'budget.expenses' && window.currentData.budget?.expenses?.[idx]) {
                window.currentData.budget.expenses[idx][key] = val;
                if (key === 'monthly') {
                    window.currentData.budget.expenses[idx].annual = val * 12;
                    const annInp = wrapper.querySelector('input[data-id="annual"]');
                    if (annInp) { annInp.value = math.toCurrency(val * 12); formatter.updateZeroState(annInp); }
                } 
                if (key === 'annual') {
                    window.currentData.budget.expenses[idx].monthly = val / 12;
                    const monInp = wrapper.querySelector('input[data-id="monthly"]');
                    if (monInp) { monInp.value = math.toCurrency(val / 12); formatter.updateZeroState(monInp); }
                }
            } else if (window.currentData[arrName] && window.currentData[arrName][idx]) window.currentData[arrName][idx][key] = val;
        }

        // Dynamic Color for Mobile Selects
        if (input.tagName === 'SELECT' && input.dataset.id === 'type') {
            const tcMap = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Roth IRA': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', '529': 'text-type-529' };
            const tc = tcMap[input.value] || 'text-white';
            input.classList.forEach(c => { if(c.startsWith('text-type-')) input.classList.remove(c); });
            input.classList.add(tc);
        }

        if (window.debouncedAutoSave) window.debouncedAutoSave();
        updateMobileSummaries(); updateMobileNW();
    });

    const closeInspector = document.getElementById('close-inspector');
    if (closeInspector) {
        closeInspector.onclick = () => {
            const overlay = document.getElementById('inspector-overlay');
            if (overlay) overlay.classList.add('hidden');
        };
    }
}

function updateMobileNW() { if(!window.currentData) return; const s = engine.calculateSummaries(window.currentData), lbl = document.getElementById('mobile-nw-label'); if (lbl) lbl.textContent = `${math.toSmartCompactCurrency(s.netWorth)} Net Worth`; }
function updateMobileSummaries() {
    if (!window.currentData) return; const s = engine.calculateSummaries(window.currentData);
    const incomeTotal = document.getElementById('val-income-total'); if (incomeTotal) incomeTotal.textContent = math.toCurrency(s.totalGrossIncome);
    const budgetSavings = document.getElementById('val-budget-savings'); const budgetSpend = document.getElementById('val-budget-spend');
    if (budgetSavings) budgetSavings.textContent = math.toSmartCompactCurrency(s.totalAnnualSavings); if (budgetSpend) budgetSpend.textContent = math.toSmartCompactCurrency(s.totalAnnualBudget);
    const totalAssets = document.getElementById('val-total-assets'); const totalDebts = document.getElementById('val-total-debts');
    if (totalAssets) totalAssets.textContent = math.toSmartCompactCurrency(s.totalAssets); if (totalDebts) totalDebts.textContent = math.toSmartCompactCurrency(s.totalLiabilities);
    if (currentTab === 'assets-debts') renderMobileAssetList();
}

function renderMobileAssetList() {
    const list = document.getElementById('mobile-asset-allocation-list'); if (!list || !window.currentData) return;
    const data = window.currentData, inv = data.investments || [], re = data.realEstate || [], oa = data.otherAssets || [], opts = data.stockOptions || [], debts = data.debts || [], helocs = data.helocs || [], helocTotal = helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0);
    const buckets = {
        'Taxable': inv.filter(i => i.type === 'Taxable').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Pre-Tax (401k/IRA)': inv.filter(i => i.type === 'Pre-Tax (401k/IRA)').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Roth IRA': inv.filter(i => i.type === 'Roth IRA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Real Estate': re.reduce((s, r) => s + (math.fromCurrency(r.value) - math.fromCurrency(r.mortgage)), 0) - helocTotal,
        'Crypto': inv.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Metals': inv.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Cash': inv.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'HSA': inv.filter(i => i.type === 'HSA').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Stock Options': opts.reduce((s, x) => s + Math.max(0, (math.fromCurrency(x.currentPrice) - math.fromCurrency(x.strikePrice)) * (parseFloat(x.shares) || 0)), 0),
        'Debt': -debts.reduce((s, d) => s + math.fromCurrency(d.balance), 0)
    };
    list.innerHTML = ''; const shortNames = { 'Pre-Tax (401k/IRA)': 'Pre-Tax', 'Roth IRA': 'Roth', 'Taxable': 'Brokerage', 'Real Estate': 'Real Est', 'Crypto': 'Crypto', 'Metals': 'Metals', 'Cash': 'Cash', 'HSA': 'HSA', 'Stock Options': 'Options', 'Debt': 'Debt' };
    Object.entries(buckets).sort(([, a], [, b]) => Math.abs(b) - Math.abs(a)).forEach(([type, value]) => {
        if (value === 0) return; let color = assetColors[type] || (type === 'Debt' ? '#ef4444' : assetColors['Taxable']);
        const item = document.createElement('div'); item.className = 'flex items-center gap-1.5 text-[8px] font-bold text-slate-400 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50';
        item.innerHTML = `<div class="w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${color}"></div><span class="truncate flex-grow">${shortNames[type] || type}</span><span class="text-white mono-numbers">${math.toSmartCompactCurrency(value)}</span>`;
        list.appendChild(item);
    });
}

function renderTab() {
    const main = document.getElementById('mobile-content');
    if (!main) return;
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    if(!window.currentData) return;
    if (currentTab === 'assets-debts') {
        window.currentData.investments?.forEach((i, idx) => addMobileRow('m-investment-cards', 'investment', i, idx, 'investments'));
        window.currentData.stockOptions?.forEach((i, idx) => addMobileRow('m-stock-option-cards', 'stockOption', i, idx, 'stockOptions'));
        window.currentData.realEstate?.forEach((i, idx) => addMobileRow('m-re-cards', 'realEstate', i, idx, 'realEstate'));
        window.currentData.otherAssets?.forEach((i, idx) => addMobileRow('m-other-asset-cards', 'otherAsset', i, idx, 'otherAssets'));
        window.currentData.helocs?.forEach((i, idx) => addMobileRow('m-heloc-cards', 'heloc', i, idx, 'helocs'));
        window.currentData.debts?.forEach((d, idx) => addMobileRow('m-debt-cards', 'debt', d, idx, 'debts'));
        renderMobileAssetList();
    }
    if (currentTab === 'income') { window.currentData.income?.forEach((i, idx) => addMobileRow('m-income-cards', 'income', i, idx, 'income')); }
    if (currentTab === 'budget') {
        const s = engine.calculateSummaries(window.currentData); addMobileRow('m-budget-savings', 'savings', { type: 'Pre-Tax (401k/IRA)', annual: s.total401kContribution, isLocked: true });
        window.currentData.budget?.savings?.filter(i => !i.isLocked).forEach((i, idx) => addMobileRow('m-budget-savings', 'savings', { ...i, monthly: i.annual/12 }, idx, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((i, idx) => addMobileRow('m-budget-expenses', 'expense', i, idx, 'budget.expenses'));
    }
    if (currentTab === 'benefits') { benefits.init(); benefits.load(window.currentData.benefits); }
    if (currentTab === 'burndown') {
        burndown.init();
        const dial = document.getElementById('input-strategy-dial'); 
        if (dial && window.currentData.burndown?.strategyMode !== undefined) { 
            const mode = window.currentData.burndown.strategyMode;
            dial.value = mode === 'PLATINUM' ? 0 : 100;
            const lbl = document.getElementById('mobile-strategy-status');
            if (lbl) lbl.textContent = mode === 'PLATINUM' ? "Handout Hunter" : "Iron Fist";
        }
        const retireInp = document.getElementById('input-top-retire-age'); if (retireInp && window.currentData.assumptions?.retirementAge) { retireInp.value = window.currentData.assumptions.retirementAge; document.getElementById('label-top-retire-age').textContent = window.currentData.assumptions.retirementAge; retireInp.oninput = (e) => { window.currentData.assumptions.retirementAge = Math.min(72, parseInt(e.target.value)); document.getElementById('label-top-retire-age').textContent = e.target.value; burndown.run(); if(window.debouncedAutoSave) window.debouncedAutoSave(); } }
        burndown.run(); 
    }
    if (currentTab === 'projection') { projection.load(window.currentData.projectionSettings); projection.run(window.currentData); }
    if (currentTab === 'assumptions') {
        renderMobileAssumptions();
        const resetMkt = document.getElementById('btn-reset-market-defaults-mobile');
        if (resetMkt) {
            resetMkt.onclick = () => { triggerHaptic(); if (confirm('Reset market defaults?')) { const marketDefaults = { stockGrowth: 8, cryptoGrowth: 8, metalsGrowth: 6, realEstateGrowth: 3, inflation: 3 }; Object.entries(marketDefaults).forEach(([id, val]) => { if (window.currentData.assumptions) { window.currentData.assumptions[id] = val; window.currentData.assumptions[id + 'Perpetual'] = val; } }); renderMobileAssumptions(); if (window.debouncedAutoSave) window.debouncedAutoSave(); } };
        }
        const resetFac = document.getElementById('btn-factory-reset-mobile');
        if (resetFac) {
            resetFac.onclick = () => { triggerHaptic(); if(confirm("Factory Reset App?")) window.location.href = window.location.pathname + '?reset=true'; };
        }
    }
    updateMobileSummaries(); updateMobileNW(); initSwipeHandlers();
}

function initSwipeHandlers() {
    let startX = 0, isSwiping = false, activeCard = null;
    document.querySelectorAll('.swipe-front').forEach(card => {
        card.addEventListener('touchstart', (e) => { 
            // CRITICAL: If touching an input, don't initiate swipe logic so keyboard can open
            if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) {
                isSwiping = false;
                return;
            }
            document.querySelectorAll('.swipe-front').forEach(c => { if (c !== card) c.style.transform = 'translateX(0)'; }); 
            startX = e.touches[0].clientX; 
            isSwiping = true; 
            activeCard = card; 
            card.classList.remove('snapping'); 
            const outer = card.closest('.swipe-outer');
            if (outer) outer.classList.add('swiping');
        }, { passive: true });
        
        card.addEventListener('touchmove', (e) => { 
            if (!isSwiping || activeCard !== card) return; 
            const diffX = e.touches[0].clientX - startX; 
            if (diffX < 0) card.style.transform = `translateX(${diffX}px)`; 
        }, { passive: true });
        
        card.addEventListener('touchend', () => { 
            if (!isSwiping || activeCard !== card) return; 
            isSwiping = false; 
            activeCard = null; 
            const currentTransformX = new WebKitCSSMatrix(window.getComputedStyle(card).transform).m41; 
            card.classList.add('snapping'); 
            const outer = card.closest('.swipe-outer');
            
            if (currentTransformX < -60) { 
                triggerHaptic(); 
                card.style.transform = 'translateX(-80px)'; 
            } else { 
                card.style.transform = 'translateX(0)'; 
                if (outer) outer.classList.remove('swiping');
            } 
        });
    });
}

function performDelete(cardElement) {
    if (cardElement && cardElement.dataset.array && cardElement.dataset.index !== undefined) {
        const arrName = cardElement.dataset.array, idx = parseInt(cardElement.dataset.index);
        if (arrName === 'budget.savings') window.currentData.budget.savings.splice(idx, 1); else if (arrName === 'budget.expenses') window.currentData.budget.expenses.splice(idx, 1); else if (window.currentData[arrName]) window.currentData[arrName].splice(idx, 1);
        renderTab(); if (window.debouncedAutoSave) window.debouncedAutoSave();
    }
}

function addMobileRow(containerId, type, data = {}, index = null, arrayName = null) {
    const container = document.getElementById(containerId); if (!container) return;
    if (data.isLocked) { const simpleContainer = document.createElement('div'); simpleContainer.className = 'mb-1'; simpleContainer.innerHTML = ITEM_TEMPLATES[type](data); simpleContainer.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners); container.appendChild(simpleContainer); return; }
    const outer = document.createElement('div'), bg = document.createElement('div'), front = document.createElement('div'); outer.className = 'swipe-outer'; bg.className = 'swipe-bg cursor-pointer'; bg.innerHTML = '<i class="fas fa-trash"></i>'; front.className = 'swipe-front'; front.innerHTML = ITEM_TEMPLATES[type](data); if (index !== null && arrayName) { front.dataset.index = index; front.dataset.array = arrayName; }
    bg.onclick = (e) => { e.stopPropagation(); front.classList.add('deleting'); setTimeout(() => performDelete(front), 300); };
    outer.appendChild(bg); outer.appendChild(front); container.appendChild(outer); outer.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
}

function renderMobileAssumptions() {
    const container = document.getElementById('m-assumptions-container'); if (!container) return;
    const a = window.currentData.assumptions || assumptions.defaults, hhSize = window.currentData.benefits?.hhSize || 1;
    const slider = (label, id, min, max, step, val, suffix = '', colorClass = 'text-blue-400') => `<label class="block space-y-0.5"><div class="flex justify-between items-center"><span class="mobile-label ${colorClass}">${label}</span></div><div class="flex items-center gap-2"><input data-id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" class="mobile-slider"><span class="${colorClass} font-bold mono-numbers w-10 text-right text-[9px]">${val}${suffix}</span></div></label>`;
    container.innerHTML = `<div class="mobile-card space-y-2">${slider("Current Age", "currentAge", 18, 72, 1, a.currentAge, "", "text-white")}${slider("Retirement Age", "retirementAge", 18, 72, 1, a.retirementAge, "", "text-blue-400")}<div class="space-y-0.5"><div class="flex justify-between items-center"><span class="mobile-label text-white">Family Size</span></div><div class="flex items-center gap-2"><input data-id="hhSize" type="range" min="1" max="10" step="1" value="${hhSize}" class="mobile-slider"><span class="text-white font-bold mono-numbers w-10 text-right text-[9px]">${hhSize}</span></div></div></div><div class="mobile-card space-y-2"><div class="flex items-center justify-between"><span class="mobile-label">State</span><select data-id="state" class="bg-slate-900 border border-slate-700 rounded py-0.5 px-2 font-bold text-[9px] text-white outline-none w-32">${Object.keys(stateTaxRates).sort().map(s => `<option ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div class="flex items-center justify-between"><span class="mobile-label">Filing Status</span><select data-id="filingStatus" class="bg-slate-900 border border-slate-700 rounded py-0.5 px-2 font-bold text-[9px] text-white outline-none w-32"><option ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option><option ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option><option ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option></select></div></div><div class="mobile-card space-y-2"><h3 class="text-[7px] font-black uppercase text-slate-500 tracking-widest mb-1">Market Assumptions</h3>${slider("Stocks", "stockGrowth", 0, 15, 0.5, a.stockGrowth, "%")}${slider("Crypto", "cryptoGrowth", 0, 20, 0.5, a.cryptoGrowth, "%")}${slider("Metals", "metalsGrowth", 0, 15, 0.5, a.metalsGrowth, "%")}${slider("Real Estate", "realEstateGrowth", 0, 10, 0.1, a.realEstateGrowth, "%")}<div class="pt-1 border-t border-slate-700">${slider("Inflation", "inflation", 0, 10, 0.1, a.inflation, "%", "text-red-400")}</div></div><div class="mobile-card space-y-2"><div class="grid grid-cols-2 gap-4"><div class="space-y-0.5"><span class="mobile-label">SS Start</span><input data-id="ssStartAge" type="number" value="${a.ssStartAge}" class="block w-full bg-slate-900 border border-slate-700 rounded p-1 font-black text-white outline-none text-center text-xs"></div><div class="space-y-0.5"><span class="mobile-label">SS Monthly</span><input data-id="ssMonthly" data-type="currency" value="${math.toCurrency(a.ssMonthly)}" class="block w-full bg-slate-900 border border-slate-700 rounded p-1 font-black text-teal-400 outline-none text-center text-xs"></div></div></div>`;
    const hhInput = container.querySelector('[data-id="hhSize"]'); if (hhInput) hhInput.oninput = (e) => { const val = parseInt(e.target.value); e.target.nextElementSibling.textContent = val; if (!window.currentData.benefits) window.currentData.benefits = {}; window.currentData.benefits.hhSize = val; if (window.debouncedAutoSave) window.debouncedAutoSave(); };
    const ssInput = container.querySelector('[data-id="ssMonthly"]'); if (ssInput) formatter.bindCurrencyEventListeners(ssInput);
}

init();
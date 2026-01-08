
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave } from './data.js';
import { logoutUser } from './auth.js';
import { math, engine, assumptions, stateTaxRates, assetColors } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { formatter } from './formatter.js';

// --- POLYFILLS FOR DATA.JS COMPATIBILITY ---
window.addRow = (id, type, data) => {};
window.updateSidebarChart = () => {};
window.createAssumptionControls = () => {};
window.debouncedAutoSave = () => {
    if (window.mobileSaveTimeout) clearTimeout(window.mobileSaveTimeout);
    window.mobileSaveTimeout = setTimeout(() => {
        // Trigger Save Indicator State locally for Mobile logic
        const indicators = document.querySelectorAll('#save-indicator');
        indicators.forEach(el => el.className = "text-orange-500 transition-colors duration-200");
        
        autoSave(false); // Save from memory (window.currentData)
    }, 1500);
};

// HAPTIC Helper - Remove this function content if you want to disable vibration
function triggerHaptic() {
    if (navigator.vibrate) {
        navigator.vibrate(10); // Light 10ms tap
    }
}

let currentTab = 'assets-debts';
let assetChartInstance = null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// --- CONTEXTUAL ADD HANDLER ---
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
        // Default stop in retire: TRUE, Fixed: FALSE
        window.currentData.budget.savings.push({ monthly: 0, annual: 0, type: 'Taxable', removedInRetirement: true, isFixed: false });
    }
    else if (type === 'budget.expenses') {
        window.currentData.budget = window.currentData.budget || {};
        window.currentData.budget.expenses = window.currentData.budget.expenses || [];
        // Default stop in retire: FALSE, Fixed: FALSE
        window.currentData.budget.expenses.push({ monthly: 0, annual: 0, removedInRetirement: false, isFixed: false });
    }
    
    renderTab();
    if (window.debouncedAutoSave) window.debouncedAutoSave();
};

// --- TEMPLATES ---
const MOBILE_TEMPLATES = {
    'assets-debts': () => `
        <div class="space-y-8">
            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-line text-orange-400 mr-2"></i>Investments</h2>
                    <button onclick="window.addMobileItem('investments')" class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-blue-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-investment-cards" class="space-y-2"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-home text-indigo-400 mr-2"></i>Real Estate</h2>
                    <button onclick="window.addMobileItem('realEstate')" class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-indigo-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-re-cards" class="space-y-2"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-car text-teal-400 mr-2"></i>Other Assets</h2>
                    <button onclick="window.addMobileItem('otherAssets')" class="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-teal-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-other-asset-cards" class="space-y-2"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-university text-orange-400 mr-2"></i>HELOCs</h2>
                    <button onclick="window.addMobileItem('helocs')" class="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-orange-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-heloc-cards" class="space-y-2"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-credit-card text-red-500 mr-2"></i>Other Debts</h2>
                    <button onclick="window.addMobileItem('debts')" class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-red-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-debt-cards" class="space-y-2"></div>
            </div>
            
            <div class="pt-8 border-t border-slate-800">
                <h3 class="text-sm font-black text-slate-500 uppercase tracking-widest mb-4 text-center">Asset Allocation</h3>
                <div class="card-container p-4 bg-slate-800 rounded-2xl border border-slate-700 h-[250px] relative">
                    <canvas id="mobile-asset-chart"></canvas>
                </div>
            </div>
        </div>
    `,
    'income': () => `
        <div class="space-y-6">
            <div id="mobile-income-summary" class="text-center py-2 border-b border-slate-800 mb-2">
                <span class="text-[9px] font-black text-slate-500 uppercase tracking-widest">2026 Gross Income</span>
                <div id="val-income-total" class="text-3xl font-black text-teal-400 mono-numbers tracking-tighter">$0</div>
            </div>
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-money-bill-wave text-teal-400 mr-2"></i>Income Sources</h2>
                <button onclick="window.addMobileItem('income')" class="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-teal-900/20"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-income-cards" class="space-y-3"></div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-8">
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                    <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Annual Savings</div>
                    <div id="val-budget-savings" class="text-xl font-black text-emerald-400 mono-numbers">$0</div>
                </div>
                <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                    <div class="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Annual Spend</div>
                    <div id="val-budget-spend" class="text-xl font-black text-pink-500 mono-numbers">$0</div>
                </div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-piggy-bank text-emerald-400 mr-2"></i>ANNUAL SAVINGS</h2>
                    <button onclick="window.addMobileItem('budget.savings')" class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-emerald-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-budget-savings" class="space-y-2"></div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-pie text-pink-500 mr-2"></i>MONTHLY SPENDING</h2>
                    <button onclick="window.addMobileItem('budget.expenses')" class="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-pink-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-budget-expenses" class="space-y-2"></div>
            </div>
        </div>
    `,
    'benefits': () => `
        <div id="benefits-module" class="space-y-6"></div>
    `,
    'assumptions': () => `
        <div class="space-y-8">
            <div class="flex items-center gap-2">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-sliders-h text-emerald-400 mr-2"></i>Assumptions</h2>
            </div>
            <div class="mobile-card space-y-6">
                <h3 class="text-lg font-black text-white uppercase tracking-tighter">Global Parameters</h3>
                <div id="m-assumptions-container" class="space-y-4"></div>
            </div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
             <div class="flex items-center gap-2 mb-4">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-stairs text-purple-400 mr-2" style="transform: scaleX(-1);"></i>Burndown</h2>
            </div>
            
            <div class="mobile-card mb-4 space-y-4">
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <label class="mobile-label text-slate-500">Income Strategy Dial</label>
                        <span id="mobile-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="mobile-slider">
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                         <label class="mobile-label text-slate-500">Retirement Age</label>
                         <span id="label-top-retire-age" class="text-blue-400 font-black mono-numbers text-sm">65</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <input type="range" id="input-top-retire-age" data-id="retirementAge" min="30" max="80" step="1" value="65" class="mobile-slider">
                    </div>
                </div>
            </div>

            <div id="burndown-view-container" class="space-y-4"></div>
            <div id="burndown-table-container" class="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50"></div>
        </div>
    `,
    'projection': () => `
        <div class="space-y-6 pb-4">
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-line text-blue-400 mr-2"></i>Projection</h2><button id="toggle-projection-real" class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400">Nominal $</button></div>
            <div class="card-container p-4 bg-slate-800 rounded-2xl border border-slate-700 h-[300px] relative"><canvas id="projection-chart"></canvas></div>
            
            <div class="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner">
                <div class="flex flex-col"><span class="mobile-label">End Age</span><span id="mobile-proj-end-val" class="text-blue-400 font-black mono-numbers text-sm">72</span></div>
                <input type="range" id="input-projection-end" min="50" max="100" value="72" class="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
            </div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data) => {
        const ASSET_TYPE_COLORS = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Post-Tax (Roth)': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', 'Real Estate': 'text-indigo-400', 'Debt': 'text-red-400' };
        const tc = ASSET_TYPE_COLORS[data.type] || 'text-white';
        return `
        <div class="mobile-card flex flex-col gap-2">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Account Name">
            </div>
            <div class="flex justify-between items-end mt-1">
                <div class="flex flex-col">
                    <select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 outline-none ${tc}">
                        <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                        <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                    </select>
                </div>
                <div class="text-right flex-grow">
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-teal-400 font-black text-4xl mono-numbers outline-none leading-none">
                </div>
            </div>
        </div>`;
    },
    realEstate: (data) => `
        <div class="mobile-card space-y-2">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Property Name">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="mobile-label">Value</span>
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Mortgage</span>
                    <input data-id="mortgage" data-type="currency" value="${math.toCurrency(data.mortgage || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
        </div>
    `,
    otherAsset: (data) => `
        <div class="mobile-card space-y-2">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Asset Name">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="mobile-label">Value</span>
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Loan</span>
                    <input data-id="loan" data-type="currency" value="${math.toCurrency(data.loan || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
        </div>
    `,
    heloc: (data) => `
        <div class="mobile-card space-y-2">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="HELOC Name">
            </div>
            <div class="grid grid-cols-3 gap-2">
                <div>
                    <span class="mobile-label">Balance</span>
                    <input data-id="balance" data-type="currency" value="${math.toCurrency(data.balance || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Rate %</span>
                    <input data-id="rate" type="number" step="0.1" value="${data.rate || 0}" inputmode="decimal" class="block w-full bg-transparent text-white font-bold text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Limit</span>
                    <input data-id="limit" data-type="currency" value="${math.toCurrency(data.limit || 0)}" inputmode="decimal" class="block w-full bg-transparent text-slate-400 font-bold text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
        </div>
    `,
    debt: (data) => `
        <div class="mobile-card space-y-2">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Debt Name">
            </div>
            <div>
                <span class="mobile-label">Balance</span>
                <input data-id="balance" data-type="currency" value="${math.toCurrency(data.balance || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
            </div>
        </div>
    `,
    income: (data) => `
        <div class="mobile-card space-y-3">
             <div class="flex justify-between items-center">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Source">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="mobile-label">Gross Amount</span>
                    <input data-id="amount" data-type="currency" value="${math.toCurrency(data.amount || 0)}" inputmode="decimal" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Growth %</span>
                    <input data-id="increase" type="number" value="${data.increase || 0}" inputmode="decimal" class="block w-full bg-transparent text-white font-bold mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
            
            <div class="p-3 bg-slate-900/50 rounded-xl space-y-3 border border-slate-800">
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <span class="mobile-label">401k %</span>
                        <input data-id="contribution" type="number" value="${data.contribution || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none border-b border-slate-700">
                    </div>
                    <div>
                        <span class="mobile-label">Match %</span>
                        <input data-id="match" type="number" value="${data.match || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none border-b border-slate-700">
                    </div>
                    <div>
                        <span class="mobile-label">Bonus %</span>
                        <input data-id="bonusPct" type="number" value="${data.bonusPct || 0}" class="block w-full bg-transparent text-blue-400 font-bold mono-numbers outline-none border-b border-slate-700">
                    </div>
                </div>
            </div>

             <label class="flex items-center gap-2 mt-2"><input type="checkbox" data-id="remainsInRetirement" ${data.remainsInRetirement ? 'checked' : ''} class="w-4 h-4 bg-slate-800 border-slate-600 rounded"><span class="text-[9px] font-bold text-slate-400 uppercase">Continue in Retirement</span></label>
        </div>
    `,
    savings: (data) => {
        if (data.isLocked) {
             return `
             <div class="mobile-card border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)] bg-slate-800/80 flex justify-between items-center gap-3">
                <div class="flex flex-col w-1/3">
                    <div class="text-blue-400 font-black text-xs uppercase tracking-widest leading-tight">401k from Income</div>
                </div>
                <div class="text-right flex-grow">
                    <input data-id="annual" data-type="currency" value="${math.toCurrency(data.annual || 0)}" class="block w-full text-right bg-transparent text-blue-400 font-black text-3xl mono-numbers outline-none" readonly>
                </div>
            </div>`;
        }
        
        const ASSET_TYPE_COLORS = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Post-Tax (Roth)': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', 'Real Estate': 'text-indigo-400', 'Debt': 'text-red-400' };
        const tc = ASSET_TYPE_COLORS[data.type] || 'text-white';
        return `
        <div class="mobile-card flex justify-between items-center gap-3">
            <div class="flex flex-col w-5/12">
                <select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 outline-none ${tc} w-full">
                    <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                    <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                    <option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                    <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                    <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                    <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                </select>
                <div class="flex gap-3 mt-2">
                    <label class="flex items-center gap-1"><input type="checkbox" data-id="removedInRetirement" ${data.removedInRetirement ? 'checked' : ''} class="w-3 h-3"><span class="text-[7px] uppercase font-black text-slate-500">Stop in Retire</span></label>
                </div>
            </div>
            <div class="text-right flex-grow">
                <input data-id="annual" data-type="currency" value="${math.toCurrency(data.annual || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-emerald-400 font-black text-3xl mono-numbers outline-none">
            </div>
        </div>
        `;
    },
    expense: (data) => `
        <div class="mobile-card py-2 flex justify-between items-center gap-2">
            <div class="flex flex-col w-1/2">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-xs outline-none" placeholder="Item Name">
            </div>
            <div class="text-right flex-grow">
                <input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" inputmode="decimal" class="block w-full text-center bg-transparent text-pink-400 font-black text-3xl mono-numbers outline-none">
            </div>
        </div>
    `
};

function init() {
    attachGlobal();
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                await initializeData(user);
                document.getElementById('login-screen').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                renderTab();
            } catch (e) { console.error(e); }
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app-container').classList.add('hidden');
        }
    });
}

function attachGlobal() {
    document.getElementById('login-btn').onclick = async () => {
        try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithPopup(auth, provider);
        } catch (error) {
            if(error.code !== 'auth/popup-closed-by-user') alert(error.message);
        }
    };
    
    document.getElementById('logout-btn').onclick = logoutUser;
    
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.onclick = () => {
            triggerHaptic(); // HAPTIC
            currentTab = btn.dataset.tab;
            document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderTab();
        };
    });
    
    // Hide global FAB logic since we moved to contextual buttons
    const fab = document.getElementById('mobile-fab');
    if(fab) fab.classList.add('hidden');
    
    document.body.addEventListener('input', (e) => {
        triggerHaptic(); // HAPTIC (on slider/input change)
        const input = e.target;
        
        // Handle Global Assumptions
        if (input.dataset.id && document.getElementById('m-assumptions-container') && input.closest('#m-assumptions-container')) {
            const val = parseFloat(input.value) || 0;
            const id = input.dataset.id;
            
            // Sync Perpetual if specific growth slider is touched (Reset bucket to flat rate)
            if (['stockGrowth', 'cryptoGrowth', 'metalsGrowth', 'realEstateGrowth'].includes(id)) {
                if (window.currentData.assumptions) {
                    // Ensure perpetual matches initial to flatten the curve, satisfying "reset bucket"
                    // We do NOT disable advancedGrowth flag, so desktop UI remains in advanced mode but with flat data.
                    window.currentData.assumptions[id + 'Perpetual'] = val;
                }
            }

            // Also update the value display next to slider if it exists
            const display = input.parentElement.querySelector('.mono-numbers');
            if (display) {
                if (id.includes('Growth') || id === 'inflation') display.textContent = val + '%';
                else if (id === 'ssMonthly') display.textContent = math.toCurrency(val);
                else display.textContent = val;
            }
            if (window.currentData.assumptions) {
               window.currentData.assumptions[id] = val;
            }
        }

        // Handle Burndown Dial
        if (input.id === 'input-strategy-dial') {
            if (!window.currentData.burndown) window.currentData.burndown = {};
            window.currentData.burndown.strategyDial = parseInt(input.value);
            const lbl = document.getElementById('mobile-strategy-status');
            if (lbl) {
                const val = parseInt(input.value);
                lbl.textContent = val <= 33 ? "Platinum Max" : (val <= 66 ? "Silver CSR" : "Standard");
            }
            burndown.run(); // Re-run calc if dial changes
        }
        
        // Handle Card Data Binding - Fix: Use closest('[data-array]') to find the wrapper
        const wrapper = input.closest('[data-array]');
        if (wrapper && wrapper.dataset.index !== undefined) {
            const arrName = wrapper.dataset.array;
            const idx = parseInt(wrapper.dataset.index);
            const key = input.dataset.id;
            let val = input.value;
            
            if (input.type === 'checkbox') val = input.checked;
            else if (input.dataset.type === 'currency') val = math.fromCurrency(val);
            else if (input.type === 'number') val = parseFloat(val);

            // Nested budget handling
            if (arrName === 'budget.savings') {
                if (window.currentData.budget?.savings?.[idx]) {
                    window.currentData.budget.savings[idx][key] = val;
                    if (key === 'monthly') window.currentData.budget.savings[idx].annual = val * 12;
                    if (key === 'annual') window.currentData.budget.savings[idx].monthly = val / 12;
                }
            } else if (arrName === 'budget.expenses') {
                if (window.currentData.budget?.expenses?.[idx]) {
                    window.currentData.budget.expenses[idx][key] = val;
                    if (key === 'monthly') window.currentData.budget.expenses[idx].annual = val * 12;
                    if (key === 'annual') window.currentData.budget.expenses[idx].monthly = val / 12;
                }
            } else if (window.currentData[arrName] && window.currentData[arrName][idx]) {
                window.currentData[arrName][idx][key] = val;
            }
        }

        if (window.debouncedAutoSave) window.debouncedAutoSave();
        updateMobileSummaries(); // Update summaries on input
        updateMobileNW();
    });

    document.getElementById('close-inspector').onclick = () => {
        document.getElementById('inspector-overlay').classList.add('hidden');
    };
}

function updateMobileNW() {
    if(!window.currentData) return;
    const s = engine.calculateSummaries(window.currentData);
    const lbl = document.getElementById('mobile-nw-label');
    if (lbl) lbl.textContent = `${math.toSmartCompactCurrency(s.netWorth)} Net Worth`;
}

function updateMobileSummaries() {
    if (!window.currentData) return;
    const s = engine.calculateSummaries(window.currentData);
    
    // Income Summary
    const incomeTotal = document.getElementById('val-income-total');
    if (incomeTotal) incomeTotal.textContent = math.toCurrency(s.totalGrossIncome);
    
    // Budget Summary
    const budgetSavings = document.getElementById('val-budget-savings');
    const budgetSpend = document.getElementById('val-budget-spend');
    if (budgetSavings) budgetSavings.textContent = math.toSmartCompactCurrency(s.totalAnnualSavings);
    if (budgetSpend) budgetSpend.textContent = math.toSmartCompactCurrency(s.totalAnnualBudget);
}

function renderMobileAssetChart() {
    const ctx = document.getElementById('mobile-asset-chart');
    if (!ctx || !window.currentData) return;
    if (assetChartInstance) assetChartInstance.destroy();

    const inv = window.currentData.investments || [];
    const re = window.currentData.realEstate || [];
    const oa = window.currentData.otherAssets || [];
    
    const buckets = {
        'Stocks': inv.filter(i => ['Taxable', 'Pre-Tax (401k/IRA)', 'Post-Tax (Roth)', 'HSA', '529 Plan'].includes(i.type)).reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Real Estate': re.reduce((s, r) => s + math.fromCurrency(r.value), 0),
        'Cash': inv.filter(i => i.type === 'Cash').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Crypto': inv.filter(i => i.type === 'Crypto').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Metals': inv.filter(i => i.type === 'Metals').reduce((s, i) => s + math.fromCurrency(i.value), 0),
        'Other': oa.reduce((s, o) => s + math.fromCurrency(o.value), 0)
    };

    const total = Object.values(buckets).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const data = [];
    const labels = [];
    const colors = [];
    const bgColors = {
        'Stocks': assetColors['Taxable'],
        'Real Estate': assetColors['Real Estate'],
        'Cash': assetColors['Cash'],
        'Crypto': assetColors['Crypto'],
        'Metals': assetColors['Metals'],
        'Other': assetColors['Other']
    };

    Object.entries(buckets).forEach(([key, val]) => {
        if (val > 0) {
            labels.push(key);
            data.push(val);
            colors.push(bgColors[key]);
        }
    });

    assetChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { 
                    callbacks: {
                        label: (context) => {
                            const val = context.raw;
                            const pct = Math.round((val / total) * 100);
                            return `${context.label}: ${math.toSmartCompactCurrency(val)} (${pct}%)`;
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'customLabels',
            afterDraw: (chart) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    chart.getDatasetMeta(i).data.forEach((datapoint, index) => {
                        const { x, y } = datapoint.tooltipPosition();
                        const val = dataset.data[index];
                        const pct = (val / total) * 100;
                        const label = chart.data.labels[index];
                        
                        // Mapping full names to short codes
                        const shortMap = { 'Stocks': 'STK', 'Real Estate': 'RE', 'Cash': 'CSH', 'Crypto': 'BTC', 'Metals': 'Au', 'Other': 'OTH' };
                        const shortLabel = shortMap[label] || label.substring(0,3).toUpperCase();

                        // Only draw if > 5% or active (clicked)
                        if (pct > 5 || datapoint.active) {
                            ctx.fillStyle = '#fff';
                            ctx.font = '900 10px Inter';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(`${shortLabel} ${Math.round(pct)}%`, x, y);
                        }
                    });
                });
            }
        }]
    });
}

function renderTab() {
    const main = document.getElementById('mobile-content');
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    
    // Ensure FAB is hidden if it exists
    const fab = document.getElementById('mobile-fab');
    if(fab) fab.classList.add('hidden');
    
    if(!window.currentData) return;

    if (currentTab === 'assets-debts') {
        const checkEmpty = (arr, type) => { if (!arr || arr.length === 0) window.addMobileItem(type); };
        
        // Auto-add empty rows if empty (Pre-population Logic)
        checkEmpty(window.currentData.investments, 'investments');
        checkEmpty(window.currentData.realEstate, 'realEstate');
        checkEmpty(window.currentData.otherAssets, 'otherAssets');
        checkEmpty(window.currentData.helocs, 'helocs');
        checkEmpty(window.currentData.debts, 'debts');

        window.currentData.investments?.forEach((i, idx) => addMobileRow('m-investment-cards', 'investment', i, idx, 'investments'));
        window.currentData.realEstate?.forEach((i, idx) => addMobileRow('m-re-cards', 'realEstate', i, idx, 'realEstate'));
        window.currentData.otherAssets?.forEach((i, idx) => addMobileRow('m-other-asset-cards', 'otherAsset', i, idx, 'otherAssets'));
        window.currentData.helocs?.forEach((i, idx) => addMobileRow('m-heloc-cards', 'heloc', i, idx, 'helocs'));
        window.currentData.debts?.forEach((d, idx) => addMobileRow('m-debt-cards', 'debt', d, idx, 'debts'));
        
        renderMobileAssetChart();
    }
    if (currentTab === 'income') {
        if (!window.currentData.income || window.currentData.income.length === 0) window.addMobileItem('income');
        window.currentData.income?.forEach((i, idx) => addMobileRow('m-income-cards', 'income', i, idx, 'income'));
    }
    if (currentTab === 'budget') {
        const s = engine.calculateSummaries(window.currentData);
        // Add the calculated locked 401k row first
        addMobileRow('m-budget-savings', 'savings', { 
            type: 'Pre-Tax (401k/IRA)', 
            annual: s.total401kContribution, 
            isLocked: true 
        });
        
        if (!window.currentData.budget?.savings || window.currentData.budget.savings.length === 0) window.addMobileItem('budget.savings');
        if (!window.currentData.budget?.expenses || window.currentData.budget.expenses.length === 0) window.addMobileItem('budget.expenses');

        window.currentData.budget?.savings?.forEach((i, idx) => addMobileRow('m-budget-savings', 'savings', { ...i, monthly: i.annual/12 }, idx, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((i, idx) => addMobileRow('m-budget-expenses', 'expense', i, idx, 'budget.expenses'));
    }
    if (currentTab === 'benefits') {
        benefits.init();
        benefits.load(window.currentData.benefits);
    }
    if (currentTab === 'burndown') {
        // Sync dial from data
        const dial = document.getElementById('input-strategy-dial');
        const dialStatus = document.getElementById('mobile-strategy-status');
        if (dial && window.currentData.burndown?.strategyDial !== undefined) {
             dial.value = window.currentData.burndown.strategyDial;
             const val = parseInt(dial.value);
             if (dialStatus) dialStatus.textContent = val <= 33 ? "Platinum Max" : (val <= 66 ? "Silver CSR" : "Standard");
        }
        
        // Sync retire age from data
        const retireInp = document.getElementById('input-top-retire-age');
        const retireLbl = document.getElementById('label-top-retire-age');
        if (retireInp && window.currentData.assumptions?.retirementAge) {
            retireInp.value = window.currentData.assumptions.retirementAge;
            if (retireLbl) retireLbl.textContent = window.currentData.assumptions.retirementAge;
        }

        // Do NOT call burndown.init() to avoid overwriting mobile controls
        // Just run logic
        burndown.run();
        
        setTimeout(() => {
            const container = document.getElementById('burndown-table-container');
            if (container) container.onclick = (e) => {
                const row = e.target.closest('tr');
                if (row) {
                    const age = row.querySelector('td')?.textContent;
                    if (age) openInspector(age);
                }
            };
        }, 300);
    }
    if (currentTab === 'projection') {
        projection.load(window.currentData.projectionSettings);
        projection.run(window.currentData);
    }
    if (currentTab === 'assumptions') {
        renderMobileAssumptions();
    }
    
    updateMobileSummaries();
    updateMobileNW();
    initSwipeHandlers();
}

// Swipe to Reveal Delete Logic
function initSwipeHandlers() {
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    let activeCard = null;

    const cards = document.querySelectorAll('.swipe-front');

    cards.forEach(card => {
        card.addEventListener('touchstart', (e) => {
            // Close other open cards
            document.querySelectorAll('.swipe-front').forEach(c => {
                if (c !== card) c.style.transform = 'translateX(0)';
            });

            startX = e.touches[0].clientX;
            currentX = startX;
            isSwiping = true;
            activeCard = card;
            card.classList.remove('snapping');
        }, { passive: true });

        card.addEventListener('touchmove', (e) => {
            if (!isSwiping || activeCard !== card) return;
            
            const touchX = e.touches[0].clientX;
            const diffX = touchX - startX;

            // Only allow swiping left
            if (diffX < 0) {
                card.style.transform = `translateX(${diffX}px)`;
            }
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            if (!isSwiping || activeCard !== card) return;
            isSwiping = false;
            activeCard = null;

            // Get current transform value to determine snap position
            const style = window.getComputedStyle(card);
            const matrix = new WebKitCSSMatrix(style.transform);
            const currentTransformX = matrix.m41;

            const threshold = -60; // Distance to snap open

            card.classList.add('snapping');

            if (currentTransformX < threshold) {
                triggerHaptic(); // HAPTIC on snap open
                // Snap Open (Reveal Trash)
                card.style.transform = 'translateX(-80px)';
            } else {
                // Snap Close
                card.style.transform = 'translateX(0)';
            }
        });
    });
}

function performDelete(cardElement) {
    triggerHaptic(); // HAPTIC on delete
    const card = cardElement.closest('.mobile-card');
    
    // Check dataset on the wrapper or the card itself (due to how we structure it in addMobileRow)
    // In addMobileRow, we put data-index/array on the .swipe-front (which is cardElement here)
    if (cardElement && cardElement.dataset.array && cardElement.dataset.index !== undefined) {
        const arrName = cardElement.dataset.array;
        const idx = parseInt(cardElement.dataset.index);

        if (arrName === 'budget.savings') window.currentData.budget.savings.splice(idx, 1);
        else if (arrName === 'budget.expenses') window.currentData.budget.expenses.splice(idx, 1);
        else if (window.currentData[arrName]) window.currentData[arrName].splice(idx, 1);

        renderTab(); // Re-render
        if (window.debouncedAutoSave) window.debouncedAutoSave();
    }
}

function openInspector(age) {
    const log = document.getElementById('inspector-log');
    if(log) {
        log.textContent = "Run simulation on desktop to see full trace for age " + age;
    }
    document.getElementById('inspector-overlay').classList.remove('hidden');
}

function addMobileRow(containerId, type, data = {}, index = null, arrayName = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (data.isLocked) {
        // Render simple container without swipe logic
        const simpleContainer = document.createElement('div');
        simpleContainer.className = 'mb-3';
        simpleContainer.innerHTML = ITEM_TEMPLATES[type] ? ITEM_TEMPLATES[type](data) : '';
        // Add currency binding just in case
        simpleContainer.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
        container.appendChild(simpleContainer);
        return;
    }

    // Create the outer swipe wrapper
    const outer = document.createElement('div');
    outer.className = 'swipe-outer';

    // The Background (Red/Trash) - Clickable Area
    const bg = document.createElement('div');
    bg.className = 'swipe-bg cursor-pointer'; // Added cursor-pointer
    bg.innerHTML = '<i class="fas fa-trash"></i>';
    
    // The Front (Card Content)
    const front = document.createElement('div');
    front.className = 'swipe-front'; 
    front.innerHTML = ITEM_TEMPLATES[type] ? ITEM_TEMPLATES[type](data) : `<div class="mobile-card">...</div>`;

    // Attach data to front for logic identification
    if (index !== null && arrayName) {
        front.dataset.index = index;
        front.dataset.array = arrayName;
    }

    // Explicit Click Listener for Delete
    bg.onclick = (e) => {
        e.stopPropagation(); // Prevent bubbling issues
        front.classList.add('deleting'); // Trigger CSS slide-out
        setTimeout(() => {
            performDelete(front);
        }, 300);
    };

    outer.appendChild(bg);
    outer.appendChild(front);
    container.appendChild(outer);
    
    outer.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
}

function renderMobileAssumptions() {
    const container = document.getElementById('m-assumptions-container');
    if (!container) return;
    const a = window.currentData.assumptions || assumptions.defaults;
    
    // Updated slider template to use .mobile-slider class and blue headers
    const slider = (label, id, min, max, step, val, suffix = '', colorClass = 'text-blue-400') => `
        <label class="block space-y-1">
            <div class="flex justify-between items-center">
                <span class="mobile-label ${colorClass}">${label}</span>
            </div>
            <div class="flex items-center gap-2">
                <input data-id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}" class="mobile-slider">
                <span class="${colorClass} font-bold mono-numbers w-10 text-right text-xs">${val}${suffix}</span>
            </div>
        </label>
    `;

    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
                <span class="mobile-label">Current Age</span>
                <input data-id="currentAge" type="number" value="${a.currentAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div class="space-y-1">
                <span class="mobile-label">Retirement Age</span>
                <input data-id="retirementAge" type="number" value="${a.retirementAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-blue-400 outline-none">
            </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
             <div class="space-y-1">
                <span class="mobile-label">Family Size</span>
                <input data-id="hhSize" type="number" min="1" max="10" value="${window.currentData.benefits?.hhSize || 1}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
             <div class="space-y-1">
                <span class="mobile-label">State</span>
                <select data-id="state" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-bold text-[10px] text-white outline-none h-[46px]">
                    ${Object.keys(stateTaxRates).sort().map(s => `<option ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        </div>

        <div class="space-y-1">
            <span class="mobile-label">Filing Status</span>
            <select data-id="filingStatus" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-bold text-xs text-white outline-none">
                <option ${a.filingStatus === 'Single' ? 'selected' : ''}>Single</option>
                <option ${a.filingStatus === 'Married Filing Jointly' ? 'selected' : ''}>Married Filing Jointly</option>
                <option ${a.filingStatus === 'Head of Household' ? 'selected' : ''}>Head of Household</option>
            </select>
        </div>

        ${slider("Stock Growth", "stockGrowth", 0, 15, 0.5, a.stockGrowth, "%")}
        ${slider("Crypto Growth", "cryptoGrowth", 0, 15, 0.5, a.cryptoGrowth, "%")}
        ${slider("Metals Growth", "metalsGrowth", 0, 15, 0.5, a.metalsGrowth, "%")}
        ${slider("Real Estate Growth", "realEstateGrowth", 0, 15, 0.5, a.realEstateGrowth, "%")}
        
        <div class="space-y-2 pt-4 border-t border-slate-700">
             ${slider("Inflation", "inflation", 0, 10, 0.1, a.inflation, "%", "text-red-400")}
        </div>

        <div class="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
            <div class="space-y-1">
                <span class="mobile-label">SS Start Age</span>
                <input data-id="ssStartAge" type="number" value="${a.ssStartAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div class="space-y-1">
                <span class="mobile-label">SS Monthly</span>
                <input data-id="ssMonthly" data-type="currency" value="${math.toCurrency(a.ssMonthly)}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-teal-400 outline-none">
            </div>
        </div>
    `;

    // Handle HH Size Binding manually since it's in benefits
    const hhInput = container.querySelector('[data-id="hhSize"]');
    if (hhInput) {
        hhInput.oninput = (e) => {
            if (!window.currentData.benefits) window.currentData.benefits = {};
            window.currentData.benefits.hhSize = parseInt(e.target.value);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
        };
    }
    
    // Bind currency formatting for SS Monthly
    const ssInput = container.querySelector('[data-id="ssMonthly"]');
    if (ssInput) {
        formatter.bindCurrencyEventListeners(ssInput);
    }
}

init();


import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave } from './data.js';
import { logoutUser } from './auth.js';
import { math, engine, assumptions, stateTaxRates } from './utils.js';
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
        autoSave(false); // Save from memory (window.currentData)
    }, 1500);
};

let currentTab = 'assets-debts';
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
        window.currentData.budget.savings.push({ monthly: 0, annual: 0, type: 'Taxable' });
    }
    else if (type === 'budget.expenses') {
        window.currentData.budget = window.currentData.budget || {};
        window.currentData.budget.expenses = window.currentData.budget.expenses || [];
        window.currentData.budget.expenses.push({ monthly: 0, annual: 0 });
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
                <div id="m-investment-cards" class="space-y-3"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-home text-indigo-400 mr-2"></i>Real Estate</h2>
                    <button onclick="window.addMobileItem('realEstate')" class="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-indigo-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-re-cards" class="space-y-3"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-car text-teal-400 mr-2"></i>Other Assets</h2>
                    <button onclick="window.addMobileItem('otherAssets')" class="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-teal-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-other-asset-cards" class="space-y-3"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-university text-orange-400 mr-2"></i>HELOCs</h2>
                    <button onclick="window.addMobileItem('helocs')" class="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-orange-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-heloc-cards" class="space-y-3"></div>
            </div>

            <div>
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-xl font-black text-white uppercase tracking-tighter"><i class="fas fa-credit-card text-red-500 mr-2"></i>Other Debts</h2>
                    <button onclick="window.addMobileItem('debts')" class="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center text-white active:scale-95 shadow-lg shadow-red-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-debt-cards" class="space-y-3"></div>
            </div>
        </div>
    `,
    'income': () => `
        <div class="space-y-6">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-money-bill-wave text-teal-400 mr-2"></i>Income Sources</h2>
                <button onclick="window.addMobileItem('income')" class="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-teal-900/20"><i class="fas fa-plus"></i></button>
            </div>
            <div id="m-income-cards" class="space-y-4"></div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-8">
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-piggy-bank text-emerald-400 mr-2"></i>Asset Funding</h2>
                    <button onclick="window.addMobileItem('budget.savings')" class="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-emerald-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-budget-savings" class="space-y-3"></div>
            </div>
            
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-chart-pie text-pink-500 mr-2"></i>Monthly Spending</h2>
                    <button onclick="window.addMobileItem('budget.expenses')" class="w-10 h-10 bg-pink-600 rounded-xl flex items-center justify-center text-white active:scale-95 shadow-lg shadow-pink-900/20"><i class="fas fa-plus"></i></button>
                </div>
                <div id="m-budget-expenses" class="space-y-3"></div>
            </div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
             <div class="flex items-center gap-2 mb-4">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-stairs text-purple-400 mr-2" style="transform: scaleX(-1);"></i>Burndown</h2>
            </div>
            
            <div class="mobile-card mb-6">
                <div class="flex justify-between items-center mb-2">
                    <label class="mobile-label text-slate-500">Income Strategy Dial</label>
                    <span id="mobile-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span>
                </div>
                <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500">
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
    `,
    'assumptions': () => `
        <div class="space-y-8">
            <div class="flex items-center gap-2">
                <h2 class="text-2xl font-black text-white uppercase tracking-tighter"><i class="fas fa-sliders-h text-emerald-400 mr-2"></i>Assumptions</h2>
            </div>
            <div id="benefits-module"></div>
            <div class="mobile-card space-y-6">
                <h3 class="text-lg font-black text-white uppercase tracking-tighter">Global Parameters</h3>
                <div id="m-assumptions-container" class="space-y-4"></div>
            </div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data) => {
        const ASSET_TYPE_COLORS = { 'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Post-Tax (Roth)': 'text-type-posttax', 'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', 'Real Estate': 'text-indigo-400', 'Debt': 'text-red-400' };
        const tc = ASSET_TYPE_COLORS[data.type] || 'text-white';
        return `
        <div class="mobile-card flex flex-col gap-3">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Account Name">
            </div>
            <div class="flex justify-between items-end">
                <div class="flex flex-col">
                    <span class="mobile-label">Asset Class</span>
                    <select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 mt-1 outline-none ${tc}">
                        <option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option>
                        <option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option>
                        <option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option>
                        <option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option>
                        <option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option>
                        <option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option>
                        <option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option>
                    </select>
                </div>
                <div class="text-right">
                    <span class="mobile-label">Balance</span>
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-teal-400 font-black text-xl mono-numbers outline-none">
                </div>
            </div>
        </div>`;
    },
    realEstate: (data) => `
        <div class="mobile-card space-y-3">
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
            <div>
                 <span class="mobile-label">Principal / mo</span>
                 <input data-id="principalPayment" data-type="currency" value="${math.toCurrency(data.principalPayment || 0)}" inputmode="decimal" class="block w-full bg-transparent text-blue-400 opacity-60 font-black text-lg mono-numbers outline-none border-b border-slate-700">
            </div>
        </div>
    `,
    otherAsset: (data) => `
        <div class="mobile-card space-y-3">
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
            <div>
                 <span class="mobile-label">Principal / mo</span>
                 <input data-id="principalPayment" data-type="currency" value="${math.toCurrency(data.principalPayment || 0)}" inputmode="decimal" class="block w-full bg-transparent text-blue-400 opacity-60 font-black text-lg mono-numbers outline-none border-b border-slate-700">
            </div>
        </div>
    `,
    heloc: (data) => `
        <div class="mobile-card space-y-3">
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
        <div class="mobile-card space-y-3">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Debt Name">
            </div>
            <div class="grid grid-cols-2 gap-4">
                 <div>
                    <span class="mobile-label">Balance</span>
                    <input data-id="balance" data-type="currency" value="${math.toCurrency(data.balance || 0)}" inputmode="decimal" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                     <span class="mobile-label">Principal / mo</span>
                     <input data-id="principalPayment" data-type="currency" value="${math.toCurrency(data.principalPayment || 0)}" inputmode="decimal" class="block w-full bg-transparent text-blue-400 opacity-60 font-black text-lg mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
        </div>
    `,
    income: (data) => `
        <div class="mobile-card space-y-4">
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
                <div class="flex gap-4">
                     <label class="flex items-center gap-1.5"><input type="checkbox" data-id="contribOnBonus" ${data.contribOnBonus ? 'checked' : ''} class="w-3 h-3 bg-slate-800 border-slate-600 rounded"><span class="text-[8px] font-bold text-slate-500 uppercase">Contrib Bonus</span></label>
                     <label class="flex items-center gap-1.5"><input type="checkbox" data-id="matchOnBonus" ${data.matchOnBonus ? 'checked' : ''} class="w-3 h-3 bg-slate-800 border-slate-600 rounded"><span class="text-[8px] font-bold text-slate-500 uppercase">Match Bonus</span></label>
                </div>
            </div>

            <div class="flex items-end gap-4">
                 <div class="flex-grow">
                    <span class="mobile-label">Deductions (Annual)</span>
                    <input data-id="incomeExpenses" data-type="currency" value="${math.toCurrency(data.incomeExpenses || 0)}" class="block w-full bg-transparent text-pink-400 font-bold mono-numbers outline-none border-b border-slate-700">
                 </div>
                 <div class="flex-grow">
                    <span class="mobile-label">Tax Free Until</span>
                    <input data-id="nonTaxableUntil" type="number" value="${data.nonTaxableUntil || 2026}" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none border-b border-slate-700">
                 </div>
            </div>
             <label class="flex items-center gap-2 mt-2"><input type="checkbox" data-id="remainsInRetirement" ${data.remainsInRetirement ? 'checked' : ''} class="w-4 h-4 bg-slate-800 border-slate-600 rounded"><span class="text-[9px] font-bold text-slate-400 uppercase">Continue in Retirement</span></label>
        </div>
    `,
    expense: (data) => `
        <div class="mobile-card flex justify-between items-center">
            <div class="flex flex-col w-1/2">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-xs outline-none" placeholder="Item Name">
                <div class="flex gap-3 mt-1">
                    <label class="flex items-center gap-1"><input type="checkbox" data-id="removedInRetirement" ${data.removedInRetirement ? 'checked' : ''} class="w-3 h-3"><span class="text-[7px] uppercase font-black text-slate-500">Stop</span></label>
                    <label class="flex items-center gap-1"><input type="checkbox" data-id="isFixed" ${data.isFixed ? 'checked' : ''} class="w-3 h-3"><span class="text-[7px] uppercase font-black text-slate-500">Fixed</span></label>
                </div>
            </div>
            <div class="text-right">
                <span class="mobile-label">Monthly</span>
                <input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" inputmode="decimal" class="block w-full text-right bg-transparent text-pink-400 font-black text-lg mono-numbers outline-none">
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
        const input = e.target;
        
        // Handle Global Assumptions
        if (input.dataset.id && document.getElementById('m-assumptions-container') && input.closest('#m-assumptions-container')) {
            (window.currentData.assumptions = window.currentData.assumptions || {})[input.dataset.id] = parseFloat(input.value) || 0;
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
        
        // Handle Card Data Binding
        const card = input.closest('.mobile-card');
        if (card && card.dataset.array && card.dataset.index !== undefined) {
            const arrName = card.dataset.array;
            const idx = parseInt(card.dataset.index);
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

function renderTab() {
    const main = document.getElementById('mobile-content');
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    
    // Ensure FAB is hidden if it exists
    const fab = document.getElementById('mobile-fab');
    if(fab) fab.classList.add('hidden');
    
    if(!window.currentData) return;

    if (currentTab === 'assets-debts') {
        window.currentData.investments?.forEach((i, idx) => addMobileRow('m-investment-cards', 'investment', i, idx, 'investments'));
        window.currentData.realEstate?.forEach((i, idx) => addMobileRow('m-re-cards', 'realEstate', i, idx, 'realEstate'));
        window.currentData.otherAssets?.forEach((i, idx) => addMobileRow('m-other-asset-cards', 'otherAsset', i, idx, 'otherAssets'));
        window.currentData.helocs?.forEach((i, idx) => addMobileRow('m-heloc-cards', 'heloc', i, idx, 'helocs'));
        window.currentData.debts?.forEach((d, idx) => addMobileRow('m-debt-cards', 'debt', d, idx, 'debts'));
    }
    if (currentTab === 'income') {
        window.currentData.income?.forEach((i, idx) => addMobileRow('m-income-cards', 'income', i, idx, 'income'));
    }
    if (currentTab === 'budget') {
        window.currentData.budget?.savings?.forEach((i, idx) => addMobileRow('m-budget-savings', 'expense', { ...i, monthly: i.annual/12 }, idx, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((i, idx) => addMobileRow('m-budget-expenses', 'expense', i, idx, 'budget.expenses'));
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

        burndown.init();
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
        benefits.init();
        benefits.load(window.currentData.benefits);
        renderMobileAssumptions();
    }
    
    updateMobileNW();
    initSwipeHandlers();
}

// Swipe to Delete Logic
function initSwipeHandlers() {
    let startX = 0;
    let currentX = 0;
    let isSwiping = false;
    let activeCard = null;

    const cards = document.querySelectorAll('.swipe-front');

    cards.forEach(card => {
        card.addEventListener('touchstart', (e) => {
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
                // Determine if we should prevent scroll (if mostly horizontal)
                // This is tricky with passive listeners, so we mostly rely on CSS touch-action: pan-y
                card.style.transform = `translateX(${diffX}px)`;
                currentX = touchX;
            }
        }, { passive: true });

        card.addEventListener('touchend', (e) => {
            if (!isSwiping || activeCard !== card) return;
            isSwiping = false;
            activeCard = null;

            const diffX = currentX - startX;
            const threshold = -100; // px to trigger delete

            if (diffX < threshold) {
                // Trigger Delete
                card.classList.add('deleting');
                setTimeout(() => {
                    performDelete(card);
                }, 300); // Match CSS transition
            } else {
                // Snap Back
                card.classList.add('snapping');
                card.style.transform = 'translateX(0)';
            }
        });
    });
}

function performDelete(cardElement) {
    const card = cardElement.closest('.mobile-card'); // The wrapper actually has the data attributes now, wait.
    // The structure is swipe-outer > swipe-front > mobile-card.
    // Actually, in addMobileRow, I put the data-array/index on the swipe-front (the mobile-card itself).
    
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

    // Create the outer swipe wrapper
    const outer = document.createElement('div');
    outer.className = 'swipe-outer';

    // The Background (Red/Trash)
    const bg = document.createElement('div');
    bg.className = 'swipe-bg';
    bg.innerHTML = '<i class="fas fa-trash"></i>';
    outer.appendChild(bg);

    // The Front (Card Content)
    const front = document.createElement('div');
    front.className = 'swipe-front'; // This is what we animate
    
    // Generate content
    front.innerHTML = ITEM_TEMPLATES[type] ? ITEM_TEMPLATES[type](data) : `<div class="mobile-card">...</div>`;
    
    // The ITEM_TEMPLATES return a <div class="mobile-card">...</div>
    // We need to move the data attributes to the 'front' element so our swipe handler can read them,
    // OR just put the attributes on the inner card and have the handler find them.
    // Let's attach data to the 'front' element for the handler to use easily.
    if (index !== null && arrayName) {
        front.dataset.index = index;
        front.dataset.array = arrayName;
    }
    
    // The template returns a string that IS a div.mobile-card. 
    // We want that div to BE the front, or inside it?
    // The CSS logic .swipe-front needs to be on the element that transforms.
    // Let's make .swipe-front wrap the content.
    
    outer.appendChild(front);
    container.appendChild(outer);
    
    // Important: The ITEM_TEMPLATE returns a string with class 'mobile-card'. 
    // This inner div will have the background color. 
    // The .swipe-front handles the motion.
    
    outer.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
}

function renderMobileAssumptions() {
    const container = document.getElementById('m-assumptions-container');
    if (!container) return;
    const a = window.currentData.assumptions || assumptions.defaults;
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="mobile-label">Retirement Age</span>
                <input data-id="retirementAge" type="number" value="${a.retirementAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-blue-400 outline-none">
            </div>
            <div>
                <span class="mobile-label">Current Age</span>
                <input data-id="currentAge" type="number" value="${a.currentAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
        </div>
        <div class="space-y-2">
            <span class="mobile-label">Stock Growth: <span class="text-white">${a.stockGrowth}%</span></span>
            <input data-id="stockGrowth" type="range" min="0" max="15" step="0.5" value="${a.stockGrowth}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500">
        </div>
        <div class="space-y-2">
            <span class="mobile-label">Inflation: <span class="text-white">${a.inflation}%</span></span>
            <input data-id="inflation" type="range" min="0" max="10" step="0.1" value="${a.inflation}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500">
        </div>
    `;
}

init();

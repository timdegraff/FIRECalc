
import { onAuthStateChanged, getRedirectResult, GoogleAuthProvider, signInWithRedirect, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave, updateSummaries } from './data.js';
import { logoutUser } from './auth.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { formatter } from './formatter.js';

window.addRow = () => {}; 
window.updateSidebarChart = () => {};
window.createAssumptionControls = () => {};

window.debouncedAutoSave = () => {
    if (window.mobileSaveTimeout) clearTimeout(window.mobileSaveTimeout);
    window.mobileSaveTimeout = setTimeout(() => {
        autoSave(false); 
    }, 1500);
};

let currentTab = 'assets-debts';

// --- MOBILE AUTH STRATEGY (REDIRECT ONLY) ---
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

async function performMobileLogin() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error("Mobile Login Error:", error);
        alert("Login failed. Please try again.");
    }
}

// Handle Redirect Result (Essential for Mobile Flow)
getRedirectResult(auth)
    .then((result) => {
        if (result) {
            console.log("Mobile redirect successful", result.user?.uid);
        }
    })
    .catch(e => {
        console.error("Mobile Redirect Catch:", e);
    });

// 2. Listen for state changes
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) { 
        // --- LOGGED IN ---
        await initializeData(user); 
        if (loginScreen) loginScreen.classList.add('hidden'); 
        if (appContainer) appContainer.classList.remove('hidden'); 
        renderTab(); 
    }
    else { 
        // --- LOGGED OUT ---
        if (appContainer) appContainer.classList.add('hidden'); 
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden'); 
            // Reset to clean Login Button state
            loginScreen.innerHTML = `
                <div class="p-8 text-center w-full">
                    <h1 class="text-5xl font-black mb-1 text-white tracking-tighter">FIRECalc</h1>
                    <p class="text-slate-500 mb-12 font-bold uppercase tracking-widest text-[10px]">Mobile Retirement Engine</p>
                    <button id="login-btn" class="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 text-lg">
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6" alt="Google">
                        Sign in with Google
                    </button>
                </div>`;
            document.getElementById('login-btn').onclick = performMobileLogin;
        }
    }
});

const ASSET_TYPE_COLORS = {
    'Taxable': 'text-type-taxable', 'Pre-Tax (401k/IRA)': 'text-type-pretax', 'Post-Tax (Roth)': 'text-type-posttax',
    'Cash': 'text-type-cash', 'Crypto': 'text-type-crypto', 'Metals': 'text-type-metals', 'HSA': 'text-type-hsa', '529 Plan': 'text-type-529'
};

const MOBILE_TEMPLATES = {
    'assets-debts': () => `
        <div class="space-y-4">
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-chart-line text-orange-400"></i> Investments</h2><button data-add-context="investment" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-investment-cards" class="space-y-3"></div>
            <div class="h-8"></div>
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-home text-teal-400"></i> Real Estate</h2><button data-add-context="realEstate" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-re-cards" class="space-y-3"></div>
            <div class="h-8"></div>
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-car text-orange-400"></i> Other Assets</h2><button data-add-context="otherAsset" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-other-assets-cards" class="space-y-3"></div>
            <div class="h-8"></div>
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-university text-blue-400"></i> HELOCs</h2><button data-add-context="heloc" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-heloc-cards" class="space-y-3"></div>
            <div class="h-8"></div>
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-credit-card text-pink-500"></i> Other Debts</h2><button data-add-context="debt" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-debt-cards" class="space-y-3"></div>
        </div>
    `,
    'income': () => `
        <div class="space-y-6">
            <div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">2026 Total Income</p><p id="mobile-sum-income" class="text-3xl font-black text-white mono-numbers tracking-tighter">$0</p></div>
            <div class="flex items-center justify-between"><h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-money-bill-wave text-emerald-400"></i> Income Sources</h2><button data-add-context="income" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-income-cards" class="space-y-4"></div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-8">
            <div class="grid grid-cols-2 gap-4"><div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Savings</p><p id="mobile-sum-savings" class="text-xl font-black text-emerald-400 mono-numbers tracking-tighter">$0</p></div><div class="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center shadow-lg"><p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Budget</p><p id="mobile-sum-budget" class="text-xl font-black text-pink-500 mono-numbers tracking-tighter">$0</p></div></div>
            <div class="flex items-center justify-between"><h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-piggy-bank text-emerald-400"></i> Savings</h2><button data-add-context="savings" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-budget-savings" class="space-y-3"></div>
            <div class="flex items-center justify-between"><h2 class="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-2"><i class="fas fa-shopping-cart text-pink-500"></i> Monthly Spending</h2><button data-add-context="spending" class="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center active:scale-95 transition-all"><i class="fas fa-plus"></i></button></div>
            <div id="m-budget-expenses" class="space-y-3"></div>
        </div>
    `,
    'projection': () => `
        <div class="space-y-6 pb-4">
            <div class="flex items-center justify-between"><h2 class="text-xl font-black text-white uppercase tracking-tighter">Visual Projection</h2><button id="toggle-projection-real" class="px-3 py-1 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-400">Nominal $</button></div>
            <div class="card-container p-4 bg-slate-800 rounded-2xl border border-slate-700 h-[300px] relative"><canvas id="projection-chart"></canvas></div>
            
            <div class="flex items-center gap-4 bg-slate-900 p-3 rounded-xl border border-slate-800 shadow-inner">
                <div class="flex flex-col"><span class="mobile-label">End Age</span><span id="mobile-proj-end-val" class="text-blue-400 font-black mono-numbers text-sm">72</span></div>
                <input type="range" id="input-projection-end" min="50" max="100" value="72" class="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500">
            </div>

            <div class="space-y-3">
                <h3 class="mobile-label px-1">Yearly Data Breakdown</h3>
                <div id="projection-table-container" class="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-inner"></div>
            </div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
            <div id="burndown-view-container" class="space-y-6">
                <div class="mobile-card flex flex-col items-center justify-center p-4 relative">
                    <button id="toggle-burndown-real" class="absolute top-2 right-2 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[9px] font-black text-slate-500 uppercase">Nominal $</button>
                    <span class="mobile-label mb-1">Estimated SNAP Benefit</span>
                    <span id="est-snap-indicator" class="text-emerald-400 font-black mono-numbers text-3xl">$0/mo</span>
                </div>
                <div id="m-insolvency-banner" class="hidden mobile-card bg-red-600 border-red-500 flex flex-col items-center justify-center p-3 animate-pulse">
                    <span class="text-[9px] font-black text-white/70 uppercase tracking-widest mb-0.5">Liquid assets depleted</span>
                    <span id="m-insolvency-text" class="text-white font-black mono-numbers text-xl uppercase">INSOLVENT AT AGE --</span>
                </div>
                <div class="mobile-card space-y-4">
                    <div class="flex justify-between items-center"><span class="mobile-label">Burndown Dial (MAGI)</span><span id="label-strategy-status" class="text-emerald-400 font-black mono-numbers text-[9px] uppercase tracking-widest">Platinum Max</span></div>
                    <input type="range" id="input-strategy-dial" min="0" max="100" step="1" value="33" class="input-range w-full bg-slate-600">
                </div>
                <input type="checkbox" id="toggle-rule-72t" checked class="hidden"><input type="checkbox" id="toggle-budget-sync" checked class="hidden"><input type="range" id="input-top-retire-age" class="hidden"> 
            </div>
            <div id="burndown-table-container" class="mt-8 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50"></div>
        </div>
    `,
    'more': () => `
        <div class="space-y-8">
            <div class="mobile-card space-y-6"><div class="flex items-center gap-3 border-b border-slate-700 pb-3"><i class="fas fa-user-circle text-blue-400 text-lg"></i><h3 class="text-lg font-black text-white uppercase tracking-tighter">Personal Profile</h3></div><div id="m-profile-container" class="space-y-4"></div></div>
            <div class="mobile-card space-y-6"><div class="flex items-center gap-3 border-b border-slate-700 pb-3"><i class="fas fa-chart-line text-emerald-400 text-lg"></i><h3 class="text-lg font-black text-white uppercase tracking-tighter">Market Assumptions</h3></div><div id="m-market-container" class="space-y-4"></div></div>
            <div class="mobile-card space-y-6"><div class="flex items-center gap-3 border-b border-slate-700 pb-3"><i class="fas fa-hand-holding-usd text-amber-400 text-lg"></i><h3 class="text-lg font-black text-white uppercase tracking-tighter">Social Security</h3></div><div id="m-ss-container" class="space-y-4"></div></div>
            <div id="benefits-module"></div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data, idx, arrayName) => {
        const tc = ASSET_TYPE_COLORS[data.type] || 'text-white';
        return `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-start"><input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Account Name"></div><div class="flex justify-between items-end"><div class="flex flex-col"><span class="mobile-label">Asset Class</span><select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 mt-1 outline-none ${tc}"><option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option><option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option><option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option><option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option><option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option><option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option><option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option><option value="529 Plan" ${data.type === '529 Plan' ? 'selected' : ''}>529 Plan</option></select></div><div class="text-right"><span class="mobile-label">Balance</span><input data-id="value" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.value || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-xl mono-numbers outline-none"></div></div></div></div>`
    },
    realEstate: (data, idx, arrayName) => `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-start"><input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Property Name"></div><div class="flex justify-between items-center gap-4"><div class="flex-1"><span class="mobile-label">Value</span><input data-id="value" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.value || 0)}" class="block w-full bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none"></div><div class="flex-1 text-right"><span class="mobile-label">Mortgage</span><input data-id="mortgage" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.mortgage || 0)}" class="block w-full text-right bg-transparent text-red-400 font-black text-lg mono-numbers outline-none"></div></div></div></div>`,
    otherAsset: (data, idx, arrayName) => `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-start"><input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Asset Name"></div><div class="flex justify-between items-center gap-4"><div class="flex-1"><span class="mobile-label">Value</span><input data-id="value" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.value || 0)}" class="block w-full bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none"></div><div class="flex-1 text-right"><span class="mobile-label">Loan</span><input data-id="loan" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.loan || 0)}" class="block w-full text-right bg-transparent text-red-400 font-black text-lg mono-numbers outline-none"></div></div></div></div>`,
    heloc: (data, idx, arrayName) => `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-start"><input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Bank/HELOC Name"></div><div class="grid grid-cols-2 gap-4"><div class="col-span-1"><span class="mobile-label">Balance</span><input data-id="balance" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.balance || 0)}" class="block w-full bg-transparent text-red-400 font-black text-lg mono-numbers outline-none"></div><div class="col-span-1 text-right"><span class="mobile-label">Limit</span><input data-id="limit" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.limit || 0)}" class="block w-full text-right bg-transparent text-slate-500 font-bold text-lg mono-numbers outline-none"></div></div></div></div>`,
    debt: (data, idx, arrayName) => `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-start"><input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Liability Name"></div><div class="text-right"><span class="mobile-label">Current Balance</span><input data-id="balance" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.balance || 0)}" class="block w-full text-right bg-transparent text-red-400 font-black text-xl mono-numbers outline-none"></div></div></div></div>`,
    income: (data, idx, arrayName) => {
        const annualAmt = data.isMonthly ? (data.amount || 0) * 12 : (data.amount || 0);
        return `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform space-y-4" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-center"><input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-full outline-none" placeholder="Source"></div><div class="grid grid-cols-2 gap-4 border-b border-slate-700/50 pb-3"><div><span class="mobile-label">Annual Amount</span><input data-id="amount" data-type="currency" inputmode="decimal" value="${math.toCurrency(annualAmt)}" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none"></div><div class="text-right"><span class="mobile-label">Growth %</span><input data-id="increase" type="number" inputmode="decimal" value="${data.increase || 0}" class="block w-full text-right bg-transparent text-white font-bold mono-numbers outline-none"></div></div><div class="grid grid-cols-3 gap-2"><div><span class="mobile-label">Bonus %</span><input data-id="bonusPct" type="number" inputmode="decimal" value="${data.bonusPct || 0}" class="block w-full bg-transparent text-slate-400 font-bold mono-numbers outline-none"></div><div class="text-center"><span class="mobile-label">401k %</span><input data-id="contribution" type="number" inputmode="decimal" value="${data.contribution || 0}" class="block w-full text-center bg-transparent text-blue-400 font-bold mono-numbers outline-none"></div><div class="text-right"><span class="mobile-label">Match %</span><input data-id="match" type="number" inputmode="decimal" value="${data.match || 0}" class="block w-full text-right bg-transparent text-emerald-400 font-bold mono-numbers outline-none"></div></div><div class="pt-2 border-t border-slate-700/50"><label class="flex items-center gap-2"><input type="checkbox" data-id="remainsInRetirement" ${data.remainsInRetirement ? 'checked' : ''} class="w-4 h-4 accent-blue-500 rounded bg-slate-900 border-slate-600"><span class="text-[9px] font-bold text-slate-500 uppercase">Retirement Income?</span></label></div></div></div>`
    },
    savings: (data, idx, arrayName) => {
        const tc = ASSET_TYPE_COLORS[data.type] || 'text-white';
        if (data.isLocked) return `<div class="mobile-card relative z-10 bg-slate-800 flex flex-col gap-3 mb-3 border-l-4 border-blue-500" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-center"><div class="flex flex-col w-1/2"><span class="mobile-label mb-1">Source</span><div class="text-sm font-bold text-white ${tc}">Pre-Tax (401k/IRA)</div></div><div class="text-right"><span class="mobile-label">Monthly</span><input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none" readonly></div></div></div>`;
        return `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-center"><div class="flex flex-col w-1/2"><span class="mobile-label mb-1">Destination</span><select data-id="type" class="bg-slate-900 text-sm font-bold rounded px-2 py-1 outline-none ${tc} -ml-2"><option value="Taxable" ${data.type === 'Taxable' ? 'selected' : ''}>Taxable</option><option value="Pre-Tax (401k/IRA)" ${data.type === 'Pre-Tax (401k/IRA)' ? 'selected' : ''}>Pre-Tax</option><option value="Post-Tax (Roth)" ${data.type === 'Post-Tax (Roth)' ? 'selected' : ''}>Roth</option><option value="Cash" ${data.type === 'Cash' ? 'selected' : ''}>Cash</option><option value="Crypto" ${data.type === 'Crypto' ? 'selected' : ''}>Crypto</option><option value="Metals" ${data.type === 'Metals' ? 'selected' : ''}>Metals</option><option value="HSA" ${data.type === 'HSA' ? 'selected' : ''}>HSA</option><option value="529 Plan" ${data.type === '529 Plan' ? 'selected' : ''}>529 Plan</option></select></div><div class="text-right"><span class="mobile-label">Monthly</span><input data-id="monthly" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-lg mono-numbers outline-none"></div></div><div class="pt-2 border-t border-slate-700/50 mt-2"><label class="flex items-center gap-2"><input type="checkbox" data-id="removedInRetirement" ${data.removedInRetirement ? 'checked' : ''} class="w-4 h-4 accent-pink-500 rounded bg-slate-900 border-slate-600"><span class="text-[9px] font-bold text-slate-500 uppercase">Stop in Retirement</span></label></div></div></div>`
    },
    expense: (data, idx, arrayName) => `<div class="swipe-wrapper relative overflow-hidden rounded-2xl mb-3"><div class="swipe-action-bg"><button data-action="remove-swipe" data-idx="${idx}" data-array="${arrayName}" class="text-white"><i class="fas fa-trash text-lg"></i></button></div><div class="mobile-card relative z-10 bg-slate-800 transition-transform flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}"><div class="flex justify-between items-center"><div class="flex flex-col w-1/2"><input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-xs outline-none" placeholder="Item Name"></div><div class="text-right"><span class="mobile-label">Monthly</span><input data-id="monthly" data-type="currency" inputmode="decimal" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-pink-400 font-black text-lg mono-numbers outline-none"></div></div></div>`
};

function init() {
    attachGlobal();
    attachSwipeListeners();
    
    onAuthStateChanged(auth, async (user) => {
        const loginScreen = document.getElementById('login-screen');
        const appContainer = document.getElementById('app-container');

        if (user) { 
            await initializeData(user); 
            if (loginScreen) loginScreen.classList.add('hidden'); 
            if (appContainer) appContainer.classList.remove('hidden'); 
            renderTab(); 
        }
        else { 
            // Standard state: just show the login screen if no user
            if (appContainer) appContainer.classList.add('hidden'); 
            if (loginScreen) {
                loginScreen.classList.remove('hidden'); 
                loginScreen.innerHTML = `
                    <div class="p-8 text-center w-full">
                        <h1 class="text-5xl font-black mb-1 text-white tracking-tighter">FIRECalc</h1>
                        <p class="text-slate-500 mb-12 font-bold uppercase tracking-widest text-[10px]">Mobile Retirement Engine</p>
                        <button id="login-btn" class="w-full py-5 bg-blue-600 text-white rounded-2xl font-black shadow-xl flex items-center justify-center gap-3 text-lg">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6" alt="Google">
                            Sign in with Google
                        </button>
                    </div>`;
                document.getElementById('login-btn').onclick = performMobileLogin;
            }
        }
    });
}

function attachGlobal() {
    const lb = document.getElementById('login-btn'); if(lb) lb.onclick = performMobileLogin;
    const lob = document.getElementById('logout-btn'); if(lob) lob.onclick = logoutUser;
    
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.onclick = () => { currentTab = btn.dataset.tab; document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); renderTab(); };
    });

    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        
        // Handle Nominal/Real Dollar Toggles
        if (btn.id === 'toggle-projection-real') {
            projection.toggleRealDollars();
            projection.updateToggleStyle(btn);
            projection.run(window.currentData);
            if (window.debouncedAutoSave) window.debouncedAutoSave();
            return;
        }

        if (btn.id === 'toggle-burndown-real') {
            burndown.toggleRealDollars();
            burndown.updateToggleStyle(btn);
            burndown.run();
            if (window.debouncedAutoSave) window.debouncedAutoSave();
            return;
        }

        if (btn.dataset.addContext) {
            const ctx = btn.dataset.addContext;
            if (ctx === 'investment') (window.currentData.investments = window.currentData.investments || []).push({ type: 'Taxable', value: 0 });
            else if (ctx === 'realEstate') (window.currentData.realEstate = window.currentData.realEstate || []).push({ name: '', value: 0, mortgage: 0, principalPayment: 0 });
            else if (ctx === 'otherAsset') (window.currentData.otherAssets = window.currentData.otherAssets || []).push({ name: '', value: 0, loan: 0, principalPayment: 0 });
            else if (ctx === 'heloc') (window.currentData.helocs = window.currentData.helocs || []).push({ name: '', balance: 0, limit: 0, rate: 7.0 });
            else if (ctx === 'debt') (window.currentData.debts = window.currentData.debts || []).push({ name: '', balance: 0 });
            else if (ctx === 'income') (window.currentData.income = window.currentData.income || []).push({ amount: 0, increase: 0 });
            else if (ctx === 'savings') (window.currentData.budget.savings = window.currentData.budget.savings || []).push({ type: 'Taxable', monthly: 0, annual: 0, removedInRetirement: true, isFixed: false });
            else if (ctx === 'spending') (window.currentData.budget.expenses = window.currentData.budget.expenses || []).push({ name: '', monthly: 0, annual: 0, removedInRetirement: false, isFixed: false });
            renderTab(); if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.body.addEventListener('input', (e) => {
        const input = e.target, card = input.closest('.mobile-card');
        if (input.id === 'input-projection-end') { window.currentData.projectionEndAge = parseInt(input.value); document.getElementById('mobile-proj-end-val').textContent = input.value; projection.run(window.currentData); if (window.debouncedAutoSave) window.debouncedAutoSave(); return; }
        if (card && card.dataset.array && card.dataset.idx !== undefined) {
            const arr = card.dataset.array, idx = parseInt(card.dataset.idx), key = input.dataset.id, target = (arr === 'budget.expenses' ? window.currentData.budget.expenses : (arr === 'budget.savings' ? window.currentData.budget.savings : window.currentData[arr]));
            if (target?.[idx]) {
                let val = input.type === 'checkbox' ? input.checked : (input.dataset.type === 'currency' ? math.fromCurrency(input.value) : (input.type === 'number' ? parseFloat(input.value) || 0 : input.value));
                if (arr === 'income' && key === 'amount') target[idx]['isMonthly'] = false;
                target[idx][key] = val;
                if (key === 'monthly' && arr.includes('budget')) target[idx]['annual'] = val * 12;
                if (key === 'annual' && arr.includes('budget')) target[idx]['monthly'] = val / 12;
                updateMobileSummaries(); if (window.debouncedAutoSave) window.debouncedAutoSave();
            }
        } else if (input.dataset.id) {
            (window.currentData.assumptions = window.currentData.assumptions || {})[input.dataset.id] = parseFloat(input.value) || 0;
            const disp = document.getElementById('val-' + input.dataset.id); if (disp) disp.textContent = input.value + (input.type === 'range' ? '%' : '');
            updateMobileSummaries(); if (window.debouncedAutoSave) window.debouncedAutoSave();
        } else if (input.id === 'input-strategy-dial') {
            const val = parseInt(input.value); document.getElementById('label-strategy-status').textContent = val <= 33 ? "Platinum Zone" : (val <= 66 ? "Silver CSR Zone" : "Standard");
            burndown.run(); updateInsolvencyBanner(); if (window.debouncedAutoSave) window.debouncedAutoSave();
        }
    });

    document.getElementById('close-inspector').onclick = () => document.getElementById('inspector-overlay').classList.add('hidden');
}

function attachSwipeListeners() {
    let sX = 0, cur = null;
    document.body.addEventListener('touchstart', (e) => { const card = e.target.closest('.swipe-wrapper .mobile-card'); if (!card) return; if (cur && cur !== card) cur.style.transform = `translateX(0)`; cur = card; sX = e.touches[0].clientX; card.style.transition = 'none'; }, {passive: true});
    document.body.addEventListener('touchmove', (e) => { if (!cur) return; const diff = e.touches[0].clientX - sX; if (diff < 0 && diff > -100) cur.style.transform = `translateX(${diff}px)`; }, {passive: true});
    document.body.addEventListener('touchend', (e) => { if (!cur) return; const diff = e.changedTouches[0].clientX - sX; cur.style.transition = 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)'; cur.style.transform = diff < -60 ? `translateX(-80px)` : `translateX(0)`; });
}

function updateMobileSummaries() {
    if (!window.currentData) return;
    const s = engine.calculateSummaries(window.currentData);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('mobile-nw-label', `${math.toSmartCompactCurrency(s.netWorth)} Net Worth`);
    set('mobile-sum-income', math.toCurrency(s.totalGrossIncome));
    set('mobile-sum-savings', math.toCurrency(s.totalAnnualSavings));
    set('mobile-sum-budget', math.toCurrency(s.totalAnnualBudget));
}

function updateInsolvencyBanner() {
    const age = burndown.getInsolvencyAge(), ban = document.getElementById('m-insolvency-banner'), txt = document.getElementById('m-insolvency-text');
    if (age && ban && txt) { ban.classList.remove('hidden'); txt.textContent = `INSOLVENT AT AGE ${age}`; }
    else if (ban) ban.classList.add('hidden');
}

function renderTab() {
    const main = document.getElementById('mobile-content'); main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    if (!window.currentData) return;
    if (currentTab === 'assets-debts') {
        window.currentData.investments?.forEach((v, i) => addMobileRow('m-investment-cards', 'investment', v, i, 'investments'));
        window.currentData.realEstate?.forEach((v, i) => addMobileRow('m-re-cards', 'realEstate', v, i, 'realEstate'));
        window.currentData.otherAssets?.forEach((v, i) => addMobileRow('m-other-assets-cards', 'otherAsset', v, i, 'otherAssets'));
        window.currentData.helocs?.forEach((v, i) => addMobileRow('m-heloc-cards', 'heloc', v, i, 'helocs'));
        window.currentData.debts?.forEach((v, i) => addMobileRow('m-debt-cards', 'debt', v, i, 'debts'));
    } else if (currentTab === 'income') window.currentData.income?.forEach((v, i) => addMobileRow('m-income-cards', 'income', v, i, 'income'));
    else if (currentTab === 'budget') {
        const s = engine.calculateSummaries(window.currentData); addMobileRow('m-budget-savings', 'savings', { type: 'Pre-Tax (401k/IRA)', monthly: s.total401kContribution / 12, isLocked: true }, -1, 'virtual');
        window.currentData.budget?.savings?.forEach((v, i) => !v.isLocked && addMobileRow('m-budget-savings', 'savings', v, i, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((v, i) => addMobileRow('m-budget-expenses', 'expense', v, i, 'budget.expenses'));
    } else if (currentTab === 'projection') {
        projection.load(window.currentData.projectionSettings);
        const sl = document.getElementById('input-projection-end'), val = window.currentData.projectionEndAge || 72;
        if (sl) { sl.value = val; document.getElementById('mobile-proj-end-val').textContent = val; }
        projection.updateToggleStyle(document.getElementById('toggle-projection-real'));
        projection.run(window.currentData);
    } else if (currentTab === 'burndown') {
        const sl = document.getElementById('input-strategy-dial'); if (sl && window.currentData.burndown?.strategyDial) sl.value = window.currentData.burndown.strategyDial;
        burndown.updateToggleStyle(document.getElementById('toggle-burndown-real'));
        burndown.run(); updateInsolvencyBanner();
    } else if (currentTab === 'more') {
        renderMobileProfile(); benefits.init(); benefits.load(window.currentData.benefits);
        setTimeout(() => { const hh = document.querySelector('#benefits-module [data-benefit-id="hhSize"]')?.closest('.flex.items-center.gap-4'); if(hh) hh.style.display = 'none'; }, 100);
    }
    updateMobileSummaries();
}

function renderMobileProfile() {
    const pC = document.getElementById('m-profile-container'), mC = document.getElementById('m-market-container'), sC = document.getElementById('m-ss-container');
    if (!pC || !window.currentData) return;
    const a = window.currentData.assumptions || assumptions.defaults, hh = window.currentData.benefits?.hhSize || 1;
    pC.innerHTML = `<div class="grid grid-cols-2 gap-4"><div><span class="mobile-label">Current Age</span><input data-id="currentAge" type="number" inputmode="decimal" value="${a.currentAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none"></div><div><span class="mobile-label">Retire Age</span><input data-id="retirementAge" type="number" inputmode="decimal" value="${a.retirementAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-blue-400 outline-none"></div></div><div><span class="mobile-label">Legal State</span><select data-id="state" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-bold text-white outline-none mt-1">${Object.keys(stateTaxRates).sort().map(s => `<option value="${s}" ${a.state === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>`;
    mC.innerHTML = ['stockGrowth', 'cryptoGrowth', 'metalsGrowth', 'realEstateGrowth', 'inflation'].map(k => `<div class="space-y-2"><div class="flex justify-between"><span class="mobile-label text-blue-400">${k}</span><span id="val-${k}" class="text-white font-bold text-xs">${a[k]}%</span></div><input data-id="${k}" type="range" min="0" max="20" step="0.5" value="${a[k]}" class="w-full h-4 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"></div>`).join('');
    sC.innerHTML = `<div class="grid grid-cols-2 gap-4"><div><span class="mobile-label">Start Age</span><input data-id="ssStartAge" type="number" inputmode="decimal" value="${a.ssStartAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none"></div><div><span class="mobile-label">Monthly Benefit</span><input data-id="ssMonthly" type="number" inputmode="decimal" value="${a.ssMonthly}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-teal-400 outline-none"></div></div>`;
}

function addMobileRow(id, type, data, idx, array) {
    const c = document.getElementById(id); if (!c) return;
    const el = document.createElement('div'); el.innerHTML = ITEM_TEMPLATES[type](data, idx, array);
    const card = el.firstElementChild; c.appendChild(card);
    card.querySelectorAll('[data-type="currency"]').forEach(i => { formatter.bindCurrencyEventListeners(i); i.addEventListener('click', (e) => { if (math.fromCurrency(e.target.value) === 0) e.target.value = ''; }); });
}

init();

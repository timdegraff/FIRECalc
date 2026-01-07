
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave, updateSummaries } from './data.js';
import { signInWithGoogle, logoutUser } from './auth.js';
import { math, engine, assetColors, assumptions, stateTaxRates } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
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
    'HSA': 'text-type-hsa'
};

const MOBILE_TEMPLATES = {
    'assets-debts': () => `
        <div class="space-y-4">
            <h2 class="text-xl font-black text-white uppercase tracking-tighter">Investments</h2>
            <div id="m-investment-cards" class="space-y-3"></div>
            
            <div class="h-8"></div>
            <h2 class="text-xl font-black text-white uppercase tracking-tighter">Real Estate & Assets</h2>
            <div id="m-re-cards" class="space-y-3"></div>

            <div class="h-8"></div>
            <h2 class="text-xl font-black text-white uppercase tracking-tighter">Liabilities</h2>
            <div id="m-debt-cards" class="space-y-3"></div>
        </div>
    `,
    'income': () => `
        <div class="space-y-6">
            <h2 class="text-2xl font-black text-white uppercase tracking-tighter">Income Sources</h2>
            <div id="m-income-cards" class="space-y-4"></div>
        </div>
    `,
    'budget': () => `
        <div class="space-y-8">
            <h2 class="text-2xl font-black text-white uppercase tracking-tighter">Asset Funding</h2>
            <div id="m-budget-savings" class="space-y-3"></div>
            
            <h2 class="text-2xl font-black text-white uppercase tracking-tighter">Monthly Spending</h2>
            <div id="m-budget-expenses" class="space-y-3"></div>
        </div>
    `,
    'burndown': () => `
        <div id="tab-burndown-mobile" class="w-full">
            <div id="burndown-view-container" class="space-y-4"></div>
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
        <div class="mobile-card flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Account Name">
                <button data-action="remove" class="text-slate-600"><i class="fas fa-trash"></i></button>
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
                    </select>
                </div>
                <div class="text-right">
                    <span class="mobile-label">Balance</span>
                    <input data-id="value" data-type="currency" value="${math.toCurrency(data.value || 0)}" class="block w-full text-right bg-transparent text-teal-400 font-black text-xl mono-numbers outline-none">
                </div>
            </div>
        </div>
    `},
    income: (data, idx, arrayName) => `
        <div class="mobile-card space-y-4" data-idx="${idx}" data-array="${arrayName}">
             <div class="flex justify-between items-center">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Source">
                <button data-action="remove" class="text-slate-600"><i class="fas fa-trash"></i></button>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <span class="mobile-label">Gross Amount</span>
                    <input data-id="amount" data-type="currency" value="${math.toCurrency(data.amount || 0)}" class="block w-full bg-transparent text-teal-400 font-bold mono-numbers outline-none border-b border-slate-700">
                </div>
                <div>
                    <span class="mobile-label">Growth %</span>
                    <input data-id="increase" type="number" value="${data.increase || 0}" class="block w-full bg-transparent text-white font-bold mono-numbers outline-none border-b border-slate-700">
                </div>
            </div>
        </div>
    `,
    expense: (data, idx, arrayName) => `
        <div class="mobile-card flex justify-between items-center" data-idx="${idx}" data-array="${arrayName}">
            <div class="flex flex-col w-1/2">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent font-bold text-white uppercase text-xs outline-none" placeholder="Item Name">
                <div class="flex gap-3 mt-1">
                    <label class="flex items-center gap-1"><input type="checkbox" data-id="removedInRetirement" ${data.removedInRetirement ? 'checked' : ''} class="w-3 h-3"><span class="text-[7px] uppercase font-black text-slate-500">Stop</span></label>
                    <label class="flex items-center gap-1"><input type="checkbox" data-id="isFixed" ${data.isFixed ? 'checked' : ''} class="w-3 h-3"><span class="text-[7px] uppercase font-black text-slate-500">Fixed</span></label>
                </div>
            </div>
            <div class="text-right">
                <span class="mobile-label">Monthly</span>
                <input data-id="monthly" data-type="currency" value="${math.toCurrency(data.monthly || 0)}" class="block w-full text-right bg-transparent text-pink-400 font-black text-lg mono-numbers outline-none">
            </div>
            <button data-action="remove" class="ml-3 text-slate-600"><i class="fas fa-times"></i></button>
        </div>
    `
};

function init() {
    attachGlobal();
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

    // New Header Add Button Logic
    const headerAddBtn = document.getElementById('header-add-btn');
    headerAddBtn.onclick = () => {
        if (currentTab === 'assets-debts') {
            if (!window.currentData.investments) window.currentData.investments = [];
            window.currentData.investments.push({ type: 'Taxable', value: 0 });
            renderTab();
        }
        if (currentTab === 'income') {
             if (!window.currentData.income) window.currentData.income = [];
             window.currentData.income.push({ amount: 0, increase: 0 });
             renderTab();
        }
        if (currentTab === 'budget') {
             if (!window.currentData.budget.expenses) window.currentData.budget.expenses = [];
             window.currentData.budget.expenses.push({ monthly: 0, annual: 0 });
             renderTab();
        }
    };

    // Live Data Binding for Mobile
    document.body.addEventListener('input', (e) => {
        const input = e.target;
        
        // Handle Select Color Change
        if (input.tagName === 'SELECT' && input.dataset.id === 'type') {
            const newColor = ASSET_TYPE_COLORS[input.value] || 'text-white';
            // Remove old color classes
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

                targetArray[idx][key] = val;
                
                if (key === 'monthly' && (arrayName.includes('budget'))) targetArray[idx]['annual'] = val * 12;
                if (key === 'annual' && (arrayName.includes('budget'))) targetArray[idx]['monthly'] = val / 12;
            }
        } 
        // Handle Assumptions (Profile & Market)
        else if (input.closest('#m-profile-container') || input.closest('#m-market-container') || input.closest('#m-ss-container')) {
             if (!window.currentData.assumptions) window.currentData.assumptions = {};
             let val = input.value;
             if (input.type === 'number' || input.type === 'range') val = parseFloat(val) || 0;
             window.currentData.assumptions[input.dataset.id] = val;
        }
        // Handle Household Size binding (Specific Case: UI is in profile, but data might be synced to benefits)
        if (input.dataset.benefitId === 'hhSize') {
             if (!window.currentData.benefits) window.currentData.benefits = {};
             window.currentData.benefits.hhSize = parseFloat(input.value) || 1;
             // Force refresh logic in benefits if needed
             if (benefits.refresh) benefits.refresh();
        }

        // 2. Trigger AutoSave
        if (window.debouncedAutoSave) window.debouncedAutoSave();
        updateMobileNW();
    });
    
    // Remove handler
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (btn && btn.dataset.action === 'remove') {
            const card = btn.closest('.mobile-card');
            if (card) {
                 const arrayName = card.dataset.array;
                 const idx = parseInt(card.dataset.idx);
                 
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
        }
    });

    document.getElementById('close-inspector').onclick = () => {
        document.getElementById('inspector-overlay').classList.add('hidden');
    };
}

function updateMobileNW() {
    if (!window.currentData) return;
    const s = engine.calculateSummaries(window.currentData);
    const lbl = document.getElementById('mobile-nw-label');
    if (lbl) lbl.textContent = `${math.toCurrency(s.netWorth)} Net Worth`;
}

function renderTab() {
    const main = document.getElementById('mobile-content');
    const headerAddBtn = document.getElementById('header-add-btn');
    
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    
    // Header Add Button Visibility
    if (['assets-debts', 'income', 'budget'].includes(currentTab)) {
        headerAddBtn.classList.remove('invisible');
    } else {
        headerAddBtn.classList.add('invisible');
    }

    if (!window.currentData) return;

    if (currentTab === 'assets-debts') {
        window.currentData.investments?.forEach((item, i) => addMobileRow('m-investment-cards', 'investment', item, i, 'investments'));
        window.currentData.realEstate?.forEach((item, i) => addMobileRow('m-re-cards', 'investment', { ...item, type: 'Real Estate' }, i, 'realEstate'));
        window.currentData.debts?.forEach((item, i) => addMobileRow('m-debt-cards', 'investment', { ...item, type: 'Debt', value: -item.balance }, i, 'debts'));
    }

    if (currentTab === 'income') {
        window.currentData.income?.forEach((item, i) => addMobileRow('m-income-cards', 'income', item, i, 'income'));
    }

    if (currentTab === 'budget') {
        window.currentData.budget?.savings?.forEach((item, i) => addMobileRow('m-budget-savings', 'expense', { ...item, monthly: item.annual/12 }, i, 'budget.savings'));
        window.currentData.budget?.expenses?.forEach((item, i) => addMobileRow('m-budget-expenses', 'expense', item, i, 'budget.expenses'));
    }

    if (currentTab === 'burndown') {
        burndown.init();
        burndown.run();
        renderMobilePriority();
        setTimeout(() => {
            const container = document.getElementById('burndown-table-container');
            if (container) {
                container.onclick = (e) => {
                    const row = e.target.closest('tr');
                    if (row) {
                        const age = row.querySelector('td')?.textContent;
                        if (age) openInspector(age);
                    }
                };
            }
        }, 300);
    }

    if (currentTab === 'more') {
        renderMobileProfile();
        benefits.init();
        benefits.load(window.currentData.benefits);
        
        // Hide Desktop Benefit HH Size slider if present to avoid confusion, 
        // since we moved it to Profile section
        setTimeout(() => {
            const benefitsHH = document.querySelector('#benefits-module [data-benefit-id="hhSize"]')?.closest('.flex.items-center.gap-4');
            if(benefitsHH) benefitsHH.style.display = 'none';
        }, 100);
    }
    
    updateMobileNW();
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
                <input data-id="currentAge" type="number" value="${a.currentAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div>
                <span class="mobile-label">Retire Age</span>
                <input data-id="retirementAge" type="number" value="${a.retirementAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-blue-400 outline-none">
            </div>
        </div>
        <div>
             <span class="mobile-label">Household Size</span>
             <input data-benefit-id="hhSize" type="range" min="1" max="10" step="1" value="${hhSize}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2">
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
                <input data-id="stockGrowth" type="range" min="0" max="15" step="0.5" value="${a.stockGrowth}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Crypto Growth</span><span class="text-white font-bold text-xs">${a.cryptoGrowth}%</span></div>
                <input data-id="cryptoGrowth" type="range" min="0" max="50" step="1" value="${a.cryptoGrowth}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Metals Growth</span><span class="text-white font-bold text-xs">${a.metalsGrowth}%</span></div>
                <input data-id="metalsGrowth" type="range" min="0" max="15" step="0.5" value="${a.metalsGrowth}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-yellow-500">
            </div>
             <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Real Estate</span><span class="text-white font-bold text-xs">${a.realEstateGrowth}%</span></div>
                <input data-id="realEstateGrowth" type="range" min="0" max="10" step="0.5" value="${a.realEstateGrowth}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500">
            </div>
            <div class="space-y-2">
                <div class="flex justify-between"><span class="mobile-label">Inflation</span><span class="text-white font-bold text-xs">${a.inflation}%</span></div>
                <input data-id="inflation" type="range" min="0" max="10" step="0.1" value="${a.inflation}" class="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-red-500">
            </div>
        </div>
    `;

    sContainer.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <span class="mobile-label">Start Age</span>
                <input data-id="ssStartAge" type="number" value="${a.ssStartAge}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-white outline-none">
            </div>
            <div>
                <span class="mobile-label">Monthly Benefit</span>
                <input data-id="ssMonthly" type="number" value="${a.ssMonthly}" class="block w-full bg-slate-900 border border-slate-700 rounded-lg p-3 font-black text-teal-400 outline-none">
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
    container.appendChild(el.firstElementChild);
    el.querySelectorAll('[data-type="currency"]').forEach(formatter.bindCurrencyEventListeners);
}

init();

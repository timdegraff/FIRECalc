
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeData, autoSave, updateSummaries } from './data.js';
import { signInWithGoogle, logoutUser } from './auth.js';
import { math, engine, assetColors, assumptions } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { formatter } from './formatter.js';

// --- MOBILE POLYFILLS & OVERRIDES ---
// These prevent data.js from crashing when it tries to call desktop-only UI functions
window.addRow = () => {}; 
window.updateSidebarChart = () => {};
window.createAssumptionControls = () => {};

// Override desktop auto-save to skip HTML scraping. 
// Mobile updates window.currentData directly via Live Binding.
window.debouncedAutoSave = () => {
    if (window.mobileSaveTimeout) clearTimeout(window.mobileSaveTimeout);
    window.mobileSaveTimeout = setTimeout(() => {
        // Pass 'false' to skip scraping and save window.currentData as-is
        autoSave(false); 
    }, 1000);
};
// ------------------------------------

let currentTab = 'assets-debts';

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
            <div id="burndown-view-container" class="space-y-4">
                <!-- burndown.js will inject Strategy UI here -->
            </div>
            <div class="mt-8">
                <h3 class="mobile-label mb-2">Funding Priority</h3>
                <div id="m-priority-list" class="space-y-2"></div>
            </div>
        </div>
    `,
    'more': () => `
        <div class="space-y-8">
            <div id="benefits-module"></div>
            <div class="mobile-card space-y-6">
                <h3 class="text-lg font-black text-white uppercase tracking-tighter">Global Assumptions</h3>
                <div id="m-assumptions-container" class="space-y-4"></div>
            </div>
        </div>
    `
};

const ITEM_TEMPLATES = {
    investment: (data, idx, arrayName) => `
        <div class="mobile-card flex flex-col gap-3" data-idx="${idx}" data-array="${arrayName}">
            <div class="flex justify-between items-start">
                <input data-id="name" value="${data.name || ''}" class="bg-transparent border-none font-black text-white uppercase tracking-widest text-sm w-2/3 outline-none" placeholder="Account Name">
                <button data-action="remove" class="text-slate-600"><i class="fas fa-trash"></i></button>
            </div>
            <div class="flex justify-between items-end">
                <div class="flex flex-col">
                    <span class="mobile-label">Asset Class</span>
                    <select data-id="type" class="bg-slate-900 text-[10px] font-bold rounded px-2 py-1 mt-1 outline-none text-blue-400">
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
    `,
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

    const fab = document.getElementById('mobile-fab');
    fab.onclick = () => {
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
        
        // 1. Update In-Memory Data immediately
        const card = input.closest('.mobile-card');
        if (card && card.dataset.array && card.dataset.idx !== undefined) {
            const arrayName = card.dataset.array;
            const idx = parseInt(card.dataset.idx);
            const key = input.dataset.id;
            
            // Handle nested objects for budget
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
                
                // Linked fields logic for budget
                if (key === 'monthly' && (arrayName.includes('budget'))) targetArray[idx]['annual'] = val * 12;
                if (key === 'annual' && (arrayName.includes('budget'))) targetArray[idx]['monthly'] = val / 12;
            }
        } else if (input.closest('#m-assumptions-container')) {
             if (!window.currentData.assumptions) window.currentData.assumptions = {};
             window.currentData.assumptions[input.dataset.id] = parseFloat(input.value) || 0;
        }

        // 2. Trigger AutoSave (which now skips scraping)
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
    const fab = document.getElementById('mobile-fab');
    main.innerHTML = MOBILE_TEMPLATES[currentTab]();
    
    fab.classList.toggle('hidden', !['assets-debts', 'income', 'budget'].includes(currentTab));

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
        benefits.init();
        benefits.load(window.currentData.benefits);
        renderMobileAssumptions();
    }
    
    updateMobileNW();
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

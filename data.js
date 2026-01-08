
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { math, engine, assumptions } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';

let db;
let user; // If null, we are in Guest Mode
let autoSaveTimeout = null;

// Guest Mode LocalStorage Keys
const GUEST_DATA_KEY = 'firecalc_guest_data';

window.debouncedAutoSave = () => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    // Trigger "Saving" State (Orange Flash)
    const indicators = document.querySelectorAll('#save-indicator');
    const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';

    indicators.forEach(el => {
        // Only flash indicator if not in guest mode
        if (!isGuest) {
            el.className = "text-orange-500 transition-colors duration-200"; 
        }
    });

    autoSaveTimeout = setTimeout(() => {
        autoSave();
    }, 1000);
};

export async function initializeData(authUser) {
    db = getFirestore();
    user = authUser;
    return loadData();
}

async function loadData() {
    // --- AUTHENTICATED PATH ---
    if (user) {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            window.currentData = docSnap.data();
            sanitizeAndPatchData();
        } else {
            window.currentData = getInitialData();
            await autoSave(false);
        }
    } 
    // --- GUEST PATH ---
    else {
        const localData = localStorage.getItem(GUEST_DATA_KEY);
        if (localData) {
            try {
                window.currentData = JSON.parse(localData);
                sanitizeAndPatchData();
            } catch (e) {
                console.error("Corrupt guest data, resetting:", e);
                window.currentData = getInitialData();
            }
        } else {
            window.currentData = getInitialData();
        }
    }
    
    loadUserDataIntoUI(window.currentData);
    benefits.load(window.currentData.benefits);
    burndown.load(window.currentData.burndown);
    projection.load(window.currentData.projectionSettings);
    
    // Set initial synced state
    document.querySelectorAll('#save-indicator').forEach(el => {
        const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';
        if (isGuest) {
            el.classList.add('hidden');
        } else {
            el.className = "text-green-500 transition-colors duration-200";
        }
    });
}

function sanitizeAndPatchData() {
    if (!window.currentData.assumptions) window.currentData.assumptions = { ...assumptions.defaults };
    
    // Merge missing default keys for segmented APY (Advanced Mode Persistence)
    Object.keys(assumptions.defaults).forEach(key => {
        if (window.currentData.assumptions[key] === undefined) {
            window.currentData.assumptions[key] = assumptions.defaults[key];
        }
    });

    if (!window.currentData.burndown) {
        window.currentData.burndown = { useSEPP: true };
    }
}

export function loadUserDataIntoUI(data) {
    clearDynamicContent();
    const populate = (arr, id, type) => {
        if (arr?.length) arr.forEach(item => window.addRow(id, type, item));
        else if (!['budget-savings', 'heloc', 'debt'].includes(type)) window.addRow(id, type, {});
    };
    populate(data.investments, 'investment-rows', 'investment');
    populate(data.stockOptions, 'stock-option-rows', 'stockOption');
    populate(data.realEstate, 'real-estate-rows', 'realEstate');
    populate(data.otherAssets, 'other-assets-rows', 'otherAsset');
    populate(data.helocs, 'heloc-rows', 'heloc');
    populate(data.debts, 'debt-rows', 'debt');
    populate(data.income, 'income-cards', 'income');
    const summaries = engine.calculateSummaries(data);
    
    window.addRow('budget-savings-rows', 'budget-savings', { type: 'Pre-Tax (401k/IRA)', annual: summaries.total401kContribution, monthly: summaries.total401kContribution / 12, isLocked: true });
    populate(data.budget?.savings?.filter(s => s.isLocked !== true), 'budget-savings-rows', 'budget-savings');
    populate(data.budget?.expenses, 'budget-expenses-rows', 'budget-expense');
    
    const projEndInput = document.getElementById('input-projection-end');
    const projEndLabel = document.getElementById('label-projection-end');
    if (projEndInput) {
        const val = data.projectionEndAge || 72;
        projEndInput.value = val;
        if (projEndLabel) projEndLabel.textContent = val;
    }

    window.createAssumptionControls(data);
    updateSummaries(data);
    window.updateSidebarChart(data);
}

function clearDynamicContent() {
    ['investment-rows', 'stock-option-rows', 'real-estate-rows', 'other-assets-rows', 'heloc-rows', 'debt-rows', 'income-cards', 'budget-savings-rows', 'budget-expenses-rows']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
}

function stripUndefined(obj) {
    if (Array.isArray(obj)) {
        return obj.map(item => stripUndefined(item));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => [key, stripUndefined(value)])
        );
    }
    return obj;
}

export async function autoSave(scrape = true) {
    if (scrape) window.currentData = scrapeDataFromUI();
    updateSummaries(window.currentData);
    window.updateSidebarChart(window.currentData);
    
    const projTab = document.getElementById('tab-projection');
    if (projTab && !projTab.classList.contains('hidden')) projection.run(window.currentData);
    
    const burnTab = document.getElementById('tab-burndown');
    if (burnTab && !burnTab.classList.contains('hidden')) burndown.run();
    
    const sanitizedData = stripUndefined(window.currentData);

    // --- AUTHENTICATED SAVE ---
    if (user && db) {
        try { 
            await setDoc(doc(db, "users", user.uid), sanitizedData, { merge: true }); 
            setSaveState('success');
        }
        catch (e) { 
            console.error("Save Error:", e); 
            setSaveState('error');
        }
    } 
    // --- GUEST SAVE ---
    else {
        try {
            localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(sanitizedData));
            setSaveState('success');
        } catch (e) {
            console.error("Local Save Error:", e);
            setSaveState('error');
        }
    }
}

function setSaveState(state) {
    const indicators = document.querySelectorAll('#save-indicator');
    const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';

    indicators.forEach(el => {
        if (isGuest) {
            el.classList.add('hidden');
        } else {
            el.className = state === 'success' ? "text-green-500 transition-colors duration-200" : "text-red-500 transition-colors duration-200";
        }
    });
}

function scrapeDataFromUI() {
    if (window.addMobileItem) return window.currentData;

    const prevData = window.currentData || getInitialData();
    const data = { 
        assumptions: { ...prevData.assumptions }, 
        investments: [], stockOptions: [], realEstate: [], otherAssets: [], helocs: [], debts: [], income: [], 
        budget: { savings: [], expenses: [] }, 
        benefits: benefits.scrape(), 
        burndown: burndown.scrape(),
        projectionSettings: projection.scrape(),
        projectionEndAge: parseFloat(document.getElementById('input-projection-end')?.value) || 72
    };

    const stateEl = document.querySelector('[data-id="state"]');
    if (stateEl) data.assumptions.state = stateEl.value;
    const filingStatusEl = document.querySelector('[data-id="filingStatus"]');
    if (filingStatusEl) data.assumptions.filingStatus = filingStatusEl.value;

    document.querySelectorAll('#assumptions-container [data-id]').forEach(i => {
        if (i.tagName !== 'SELECT') {
            const val = parseFloat(i.value);
            data.assumptions[i.dataset.id] = isNaN(val) ? 0 : val;
        }
    });

    document.querySelectorAll('#investment-rows tr').forEach(r => data.investments.push(scrapeRow(r)));
    document.querySelectorAll('#stock-option-rows tr').forEach(r => data.stockOptions.push(scrapeRow(r)));
    document.querySelectorAll('#real-estate-rows tr').forEach(r => data.realEstate.push(scrapeRow(r)));
    document.querySelectorAll('#other-assets-rows tr').forEach(r => data.otherAssets.push(scrapeRow(r)));
    document.querySelectorAll('#heloc-rows tr').forEach(r => data.helocs.push(scrapeRow(r, 'heloc')));
    document.querySelectorAll('#debt-rows tr').forEach(r => data.debts.push(scrapeRow(r)));
    document.querySelectorAll('#income-cards > div').forEach(r => {
        const d = scrapeRow(r);
        d.isMonthly = r.querySelector('[data-id="isMonthly"]')?.textContent.trim().toLowerCase() === 'monthly';
        d.incomeExpensesMonthly = r.querySelector('[data-id="incomeExpensesMonthly"]')?.textContent.trim().toLowerCase() === 'monthly';
        data.income.push(d);
    });
    document.querySelectorAll('#budget-savings-rows tr').forEach(r => {
        const d = scrapeRow(r);
        if (r.querySelector('[data-id="monthly"]')?.readOnly) d.isLocked = true;
        data.budget.savings.push(d);
    });
    document.querySelectorAll('#budget-expenses-rows tr').forEach(r => data.budget.expenses.push(scrapeRow(r)));
    return data;
}

function scrapeRow(row, rowType = null) {
    const d = {};
    row.querySelectorAll('[data-id]').forEach(i => {
        if (i.tagName === 'BUTTON' || i.dataset.id === 'capWarning' || i.dataset.id === 'netEquityDisplay') return;
        const k = i.dataset.id;
        if (i.type === 'checkbox') d[k] = i.checked;
        else if (i.dataset.type === 'currency') {
            let val = math.fromCurrency(i.value);
            if (rowType === 'heloc' && (k === 'balance' || k === 'limit')) {
                val = Math.max(0, val);
            }
            d[k] = val;
        }
        else if (i.tagName === 'SELECT') d[k] = i.value;
        else if (i.type === 'number' || i.type === 'range') d[k] = parseFloat(i.value) || 0;
        else d[k] = i.value;
    });
    return d;
}

function getInitialData() {
    return { 
        assumptions: { 
            ...assumptions.defaults,
            currentAge: 40,
            retirementAge: 45,
            ssStartAge: 62,
            ssMonthly: 3000,
            stockGrowth: 10,
            cryptoGrowth: 10,
            metalsGrowth: 8,
            realEstateGrowth: 3.5,
            inflation: 3,
            state: 'Michigan',
            filingStatus: 'Married Filing Jointly'
        }, 
        investments: [
            { name: "Emergency Fund", type: "Cash", value: 25000, costBasis: 25000 },
            { name: "Vanguard 401k", type: "Pre-Tax (401k/IRA)", value: 300000, costBasis: 200000 },
            { name: "Roth IRA", type: "Post-Tax (Roth)", value: 200000, costBasis: 150000 }
        ], 
        stockOptions: [
            { name: "Startup Grant (Example)", shares: 5000, strikePrice: 1.00, currentPrice: 5.00, growth: 15, isLtcg: true }
        ],
        realEstate: [
            { name: "Primary Home", value: 450000, mortgage: 250000, principalPayment: 900 }
        ], 
        otherAssets: [], 
        helocs: [], 
        debts: [], 
        income: [
            { name: "Primary Salary", amount: 175000, increase: 3.0, bonusPct: 0, contribution: 6, match: 4, isMonthly: false, incomeExpenses: 0, incomeExpensesMonthly: false, remainsInRetirement: false }
        ], 
        budget: { 
            savings: [
                { type: "Post-Tax (Roth)", name: "Roth Contrib", monthly: 500, annual: 6000, removedInRetirement: true, isFixed: false },
                { type: "HSA", name: "HSA Contrib", monthly: 500, annual: 6000, removedInRetirement: true, isFixed: false }
            ], 
            expenses: [
                { name: "Mortgage", monthly: 2000, annual: 24000, isFixed: true, removedInRetirement: false },
                { name: "Cars", monthly: 1000, annual: 12000, isFixed: false, removedInRetirement: false },
                { name: "Groceries", monthly: 1000, annual: 12000, isFixed: false, removedInRetirement: false },
                { name: "Utilities", monthly: 400, annual: 4800, isFixed: false, removedInRetirement: false },
                { name: "Discretionary / Other", monthly: 2000, annual: 24000, isFixed: false, removedInRetirement: false }
            ] 
        }, 
        benefits: {
            hhSize: 5,
            unifiedIncome: 40000,
            shelterCosts: 2000
        }, 
        burndown: { 
            useSEPP: true,
            strategyDial: 10,
            priority: ['cash', 'taxable', 'roth-basis', '401k', 'crypto', 'metals', 'roth-earnings', 'heloc', 'hsa']
        }, 
        projectionSettings: {}, 
        projectionEndAge: 72 
    };
}

export function updateSummaries(data) {
    const s = engine.calculateSummaries(data);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = math.toCurrency(v); };
    const setText = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };
    const setRaw = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    // Assets
    set('sidebar-networth', s.netWorth);
    set('sum-assets', s.totalAssets);
    set('sum-liabilities', s.totalLiabilities);
    set('sum-networth', s.netWorth);
    
    // Income
    set('sum-gross-income', s.totalGrossIncome);
    set('sum-income-adjusted', s.magiBase);
    
    // Calculate Retirement Income Floor (Persistent Income + SS in today's $)
    const persistentIncome = (data.income || []).reduce((sum, inc) => {
        if (!inc.remainsInRetirement) return sum;
        const base = math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1);
        return sum + base;
    }, 0);
    const ssAnnual = engine.calculateSocialSecurity(data.assumptions?.ssMonthly || 0, data.assumptions?.workYearsAtRetirement || 35, 1);
    set('sum-retirement-income-floor', persistentIncome + ssAnnual);
    
    // Budget
    set('sum-budget-savings', s.totalAnnualSavings);
    set('sum-budget-annual', s.totalAnnualBudget);
    set('sum-budget-total', s.totalAnnualSavings + s.totalAnnualBudget);
    
    // Assumptions
    const yrsToRetire = Math.max(0, (data.assumptions?.retirementAge || 65) - (data.assumptions?.currentAge || 40));
    setRaw('sum-yrs-to-retire', `${yrsToRetire} ${yrsToRetire === 1 ? 'Year' : 'Years'}`);
    const lifeExp = engine.getLifeExpectancy(data.assumptions?.currentAge || 40);
    setRaw('sum-life-exp', `Age ${Math.round((data.assumptions?.currentAge || 40) + lifeExp)}`);
    
    // Retirement Year 1 Budget (Target Spending)
    const burnResults = burndown.simulateProjection(data);
    const rAge = data.assumptions?.retirementAge || 65;
    const firstRetYear = burnResults.find(r => r.age >= rAge);
    if (firstRetYear) {
        set('sum-retire-budget', firstRetYear.budget);
    }

    // Sync Health Plan color and text consistently across tabs
    const dial = data.burndown?.strategyDial || 33;
    const planName = dial <= 33 ? "Platinum" : (dial <= 66 ? "Silver CSR" : "Private");
    
    const updateHealthDisplay = (id) => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = planName;
            el.className = "text-4xl font-black uppercase tracking-tighter transition-colors " + 
                (planName === "Platinum" ? "text-emerald-400" : (planName === "Silver CSR" ? "text-blue-400" : "text-slate-400"));
        }
    };
    updateHealthDisplay('sum-health-plan');
    updateHealthDisplay('sum-draw-strategy');

    // Insolvency
    const insolvAge = burndown.getInsolvencyAge();
    setText('sum-solvency-age', insolvAge ? `Age ${insolvAge}` : "Age 100+");

    const r401k = Array.from(document.querySelectorAll('#budget-savings-rows tr')).find(r => r.querySelector('[data-id="monthly"]')?.readOnly);
    if (r401k) {
        const monthly = r401k.querySelector('[data-id="monthly"]');
        const annual = r401k.querySelector('[data-id="annual"]');
        if (monthly) monthly.value = math.toCurrency(s.total401kContribution / 12);
        if (annual) annual.value = math.toCurrency(s.total401kContribution);
    }
}

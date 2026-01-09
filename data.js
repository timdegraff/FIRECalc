
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

// Helper to safely set indicator color without nuking button styles
function setIndicatorColor(el, colorClass) {
    if (!el) return;
    el.classList.remove('text-slate-600', 'text-green-500', 'text-red-500', 'text-orange-500', 'text-slate-400');
    el.classList.add(colorClass, 'transition-colors', 'duration-200');
}

window.debouncedAutoSave = () => {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    const indicators = document.querySelectorAll('#save-indicator');
    const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';

    indicators.forEach(el => {
        if (!isGuest) {
            setIndicatorColor(el, 'text-orange-500');
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
    
    document.querySelectorAll('#save-indicator').forEach(el => {
        const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';
        if (isGuest) {
            el.classList.add('hidden');
        } else {
            setIndicatorColor(el, 'text-green-500');
        }
    });
}

function sanitizeAndPatchData() {
    if (!window.currentData.assumptions) window.currentData.assumptions = { ...assumptions.defaults };
    Object.keys(assumptions.defaults).forEach(key => {
        if (window.currentData.assumptions[key] === undefined) {
            window.currentData.assumptions[key] = assumptions.defaults[key];
        }
    });
    if (!window.currentData.burndown) {
        window.currentData.burndown = { useSync: true };
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
    if (projEndInput) {
        const val = data.projectionEndAge || 72;
        projEndInput.value = val;
        const lbl = document.getElementById('label-projection-end');
        if (lbl) lbl.textContent = val;
    }

    if (window.createAssumptionControls) window.createAssumptionControls(data);
    updateSummaries(data);
    if (window.updateSidebarChart) window.updateSidebarChart(data);
    if (benefits.load) benefits.load(data.benefits);
    if (burndown.load) burndown.load(data.burndown);
    if (projection.load) projection.load(data.projectionSettings);
}

function clearDynamicContent() {
    ['investment-rows', 'stock-option-rows', 'real-estate-rows', 'other-assets-rows', 'heloc-rows', 'debt-rows', 'income-cards', 'budget-savings-rows', 'budget-expenses-rows']
    .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
}

function stripUndefined(obj) {
    if (Array.isArray(obj)) return obj.map(item => stripUndefined(item));
    if (obj !== null && typeof obj === 'object') {
        return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, stripUndefined(v)]));
    }
    return obj;
}

export async function autoSave(scrape = true) {
    if (scrape) window.currentData = scrapeDataFromUI();
    updateSummaries(window.currentData);
    if (window.updateSidebarChart) window.updateSidebarChart(window.currentData);
    
    const projTab = document.getElementById('tab-projection');
    if (projTab && !projTab.classList.contains('hidden')) projection.run(window.currentData);
    
    const burnTab = document.getElementById('tab-burndown');
    if (burnTab && !burnTab.classList.contains('hidden')) burndown.run();
    
    const sanitizedData = stripUndefined(window.currentData);

    if (user && db) {
        try { 
            await setDoc(doc(db, "users", user.uid), sanitizedData, { merge: true }); 
            setSaveState('success');
        } catch (e) { setSaveState('error'); }
    } else {
        try {
            localStorage.setItem(GUEST_DATA_KEY, JSON.stringify(sanitizedData));
            setSaveState('success');
        } catch (e) { setSaveState('error'); }
    }
}

function setSaveState(state) {
    const indicators = document.querySelectorAll('#save-indicator');
    const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';
    indicators.forEach(el => {
        if (isGuest) el.classList.add('hidden');
        else setIndicatorColor(el, state === 'success' ? "text-green-500" : "text-red-500");
    });
}

function scrapeDataFromUI() {
    if (window.addMobileItem) return window.currentData;
    const prevData = window.currentData || getInitialData();
    const data = { 
        assumptions: { ...prevData.assumptions }, 
        investments: [], stockOptions: [], realEstate: [], otherAssets: [], helocs: [], debts: [], income: [], 
        budget: { savings: [], expenses: [] }, 
        benefits: benefits.scrape ? benefits.scrape() : {}, 
        burndown: burndown.scrape ? burndown.scrape() : {},
        projectionSettings: projection.scrape ? projection.scrape() : {},
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
    document.querySelectorAll('#income-cards > div').forEach(c => data.income.push(scrapeRow(c)));
    document.querySelectorAll('#budget-savings-rows tr').forEach(r => {
        const rowData = scrapeRow(r);
        if (!rowData.isLocked) data.budget.savings.push(rowData);
    });
    document.querySelectorAll('#budget-expenses-rows tr').forEach(r => data.budget.expenses.push(scrapeRow(r)));

    return data;
}

function scrapeRow(el, forcedType = null) {
    const obj = {};
    el.querySelectorAll('[data-id]').forEach(i => {
        const id = i.dataset.id;
        if (i.type === 'checkbox') obj[id] = i.checked;
        else if (i.dataset.type === 'currency') obj[id] = math.fromCurrency(i.value);
        else if (i.type === 'number' || i.step) obj[id] = parseFloat(i.value) || 0;
        else obj[id] = i.value;
    });
    if (forcedType) obj.type = forcedType;
    return obj;
}

export function updateSummaries(data) {
    const s = engine.calculateSummaries(data);
    const set = (id, val, isCurr = true) => {
        const el = document.getElementById(id);
        if (el) el.textContent = isCurr ? math.toCurrency(val) : val;
    };

    set('sum-assets', s.totalAssets);
    set('sum-liabilities', s.totalLiabilities);
    set('sum-networth', s.netWorth);
    set('sidebar-networth', s.netWorth);
    set('sum-gross-income', s.totalGrossIncome);
    set('sum-income-adjusted', s.magiBase);
    set('sum-budget-savings', s.totalAnnualSavings);
    set('sum-budget-annual', s.totalAnnualBudget);
    set('sum-budget-total', s.totalAnnualSavings + s.totalAnnualBudget);

    const yrsToRetire = Math.max(0, (data.assumptions?.retirementAge || 65) - (data.assumptions?.currentAge || 40));
    set('sum-yrs-to-retire', yrsToRetire, false);
    set('sum-life-exp', engine.getLifeExpectancy(data.assumptions?.currentAge || 40) + (data.assumptions?.currentAge || 40), false);

    const floor = (data.income || []).filter(i => i.remainsInRetirement).reduce((sum, inc) => sum + math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1), 0);
    set('sum-retirement-income-floor', floor);
    
    const floorDetails = document.getElementById('sum-floor-breakdown');
    if (floorDetails) {
        const ss = engine.calculateSocialSecurity(data.assumptions?.ssMonthly || 0, data.assumptions?.workYearsAtRetirement || 35, 1);
        floorDetails.textContent = `Streams: ${math.toSmartCompactCurrency(floor)} + Est SS: ${math.toSmartCompactCurrency(ss)}`;
    }
}

export function getInitialData() {
    return {
        assumptions: { 
            ...assumptions.defaults, 
            currentAge: 42, 
            retirementAge: 45, 
            ssStartAge: 62, 
            ssMonthly: 3500,
            stockGrowth: 10,
            realEstateGrowth: 3.5
        },
        investments: [
            { name: 'HYSA Reserve', type: 'Cash', value: 40000, costBasis: 40000 },
            { name: 'Vanguard Brokerage', type: 'Taxable', value: 450000, costBasis: 300000 },
            { name: 'Employer 401k', type: 'Pre-Tax (401k/IRA)', value: 750000, costBasis: 500000 },
            { name: 'Roth IRAs', type: 'Roth IRA', value: 300000, costBasis: 200000 },
            { name: 'Family HSA', type: 'HSA', value: 45000, costBasis: 45000 },
            { name: '529 Plans', type: '529', value: 75000, costBasis: 60000 }
        ],
        realEstate: [
            { name: 'Primary Residence', value: 550000, mortgage: 250000, principalPayment: 1200 }
        ],
        otherAssets: [
            { name: 'Family SUV', value: 40000, loan: 15000, principalPayment: 500 },
            { name: 'Commuter Sedan', value: 30000, loan: 10000, principalPayment: 350 },
            { name: 'Personal Property', value: 25000, loan: 0, principalPayment: 0 }
        ],
        income: [
            { name: 'Lead Income', amount: 175000, increase: 3, contribution: 13, match: 4, bonusPct: 15, remainsInRetirement: false, contribOnBonus: true },
            { name: 'Support Income', amount: 100000, increase: 3, contribution: 23, match: 3, bonusPct: 5, remainsInRetirement: false, contribOnBonus: true }
        ],
        budget: {
            expenses: [
                { name: 'Mortgage / Tax / Ins', annual: 36000, removedInRetirement: false, isFixed: true },
                { name: 'Auto Loans', annual: 12000, removedInRetirement: true, isFixed: true },
                { name: 'Groceries', annual: 14400, removedInRetirement: false, isFixed: false },
                { name: 'Utilities', annual: 6000, removedInRetirement: false, isFixed: false },
                { name: 'Travel & Vacation', annual: 8000, removedInRetirement: false, isFixed: false },
                { name: 'Miscellaneous', annual: 4000, removedInRetirement: false, isFixed: false }
            ]
        },
        benefits: { hhSize: 5, shelterCosts: 3000, hasSUA: true },
        burndown: { strategyDial: 33, useSync: true, cashReserve: 30000 },
        projectionSettings: { isRealDollars: false }
    };
}

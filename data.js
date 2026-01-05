
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { math, engine, assumptions } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';

let db;
let user;

export async function initializeData(authUser) {
    db = getFirestore();
    user = authUser;
    return loadData();
}

async function loadData() {
    const docRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        window.currentData = docSnap.data();
        if (!window.currentData.assumptions) window.currentData.assumptions = { ...assumptions.defaults };
    } else {
        window.currentData = getInitialData();
        await autoSave(false);
    }
    loadUserDataIntoUI(window.currentData);
    benefits.load(window.currentData.benefits);
    burndown.load(window.currentData.burndown);
    projection.load(window.currentData.projectionSettings);
}

export function loadUserDataIntoUI(data) {
    clearDynamicContent();
    const populate = (arr, id, type) => {
        if (arr?.length) arr.forEach(item => window.addRow(id, type, item));
        else if (!['budget-savings', 'heloc', 'debt'].includes(type)) window.addRow(id, type, {});
    };
    populate(data.investments, 'investment-rows', 'investment');
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
        const val = data.projectionEndAge || 75;
        projEndInput.value = val;
        if (projEndLabel) projEndLabel.textContent = val;
    }

    window.createAssumptionControls(data);
    updateSummaries(data);
}

function clearDynamicContent() {
    ['investment-rows', 'real-estate-rows', 'other-assets-rows', 'heloc-rows', 'debt-rows', 'income-cards', 'budget-savings-rows', 'budget-expenses-rows']
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
    if (!document.getElementById('tab-projection').classList.contains('hidden')) projection.run(window.currentData);
    if (!document.getElementById('tab-burndown').classList.contains('hidden')) burndown.run();
    
    if (user && db) {
        try { 
            const sanitizedData = stripUndefined(window.currentData);
            await setDoc(doc(db, "users", user.uid), sanitizedData, { merge: true }); 
        }
        catch (e) { console.error("Save Error:", e); }
    }
}

function scrapeDataFromUI() {
    const prevData = window.currentData || getInitialData();
    const data = { 
        assumptions: { ...prevData.assumptions }, 
        investments: [], realEstate: [], otherAssets: [], helocs: [], debts: [], income: [], 
        budget: { savings: [], expenses: [] }, 
        benefits: benefits.scrape(), 
        burndown: burndown.scrape(),
        projectionSettings: projection.scrape(),
        projectionEndAge: parseFloat(document.getElementById('input-projection-end')?.value) || 75
    };

    const stateEl = document.querySelector('[data-id="state"]');
    if (stateEl) data.assumptions.state = stateEl.value;
    const filingStatusEl = document.querySelector('[data-id="filingStatus"]');
    if (filingStatusEl) data.assumptions.filingStatus = filingStatusEl.value;

    document.querySelectorAll('#assumptions-container [data-id], #burndown-live-sliders [data-id]').forEach(i => {
        if (i.tagName !== 'SELECT') data.assumptions[i.dataset.id] = parseFloat(i.value) || 0;
    });

    document.querySelectorAll('#investment-rows tr').forEach(r => data.investments.push(scrapeRow(r)));
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
        if (i.tagName === 'BUTTON' || i.dataset.id === 'capWarning') return;
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
        else if (i.type === 'number') d[k] = parseFloat(i.value) || 0;
        else d[k] = i.value;
    });
    return d;
}

function getInitialData() {
    return { assumptions: { ...assumptions.defaults }, investments: [], realEstate: [], otherAssets: [], helocs: [], debts: [], income: [], budget: { savings: [], expenses: [] }, benefits: {}, burndown: {}, projectionSettings: {}, projectionEndAge: 75 };
}

export function updateSummaries(data) {
    const s = engine.calculateSummaries(data);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = math.toCurrency(v); };
    set('sidebar-networth', s.netWorth);
    set('sum-assets', s.totalAssets);
    set('sum-liabilities', s.totalLiabilities);
    set('sum-networth', s.netWorth);
    set('sum-budget-savings', s.totalAnnualSavings);
    set('sum-budget-annual', s.totalAnnualBudget);
    set('sum-budget-total', s.totalAnnualSavings + s.totalAnnualBudget);
    
    set('sum-gross-income', s.totalGrossIncome);
    set('sum-income-adjusted', s.magiBase);
    
    const r401k = Array.from(document.querySelectorAll('#budget-savings-rows tr')).find(r => r.querySelector('[data-id="monthly"]')?.readOnly);
    if (r401k) {
        const monthly = r401k.querySelector('[data-id="monthly"]');
        const annual = r401k.querySelector('[data-id="annual"]');
        if (monthly) monthly.value = math.toCurrency(s.total401kContribution / 12);
        if (annual) annual.value = math.toCurrency(s.total401kContribution);
    }
}

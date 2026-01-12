
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from './firebase-config.js';
import { engine, math } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { PROFILE_45_COUPLE } from './profiles.js';

const db = getFirestore();
window.currentData = null;
window.saveTimeout = null;

const DEFAULTS = PROFILE_45_COUPLE;

export async function initializeData(user) {
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const remoteData = docSnap.data();
                window.currentData = {
                    ...JSON.parse(JSON.stringify(DEFAULTS)),
                    ...remoteData,
                    assumptions: { ...DEFAULTS.assumptions, ...(remoteData.assumptions || {}) },
                    budget: { ...DEFAULTS.budget, ...(remoteData.budget || {}) },
                    benefits: { ...DEFAULTS.benefits, ...(remoteData.benefits || {}) }
                };
            } else {
                window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
                await setDoc(docRef, window.currentData);
            }
        } catch (e) {
            console.error("Firestore Load Error:", e);
            window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
        }
    } else {
        const local = localStorage.getItem('firecalc_guest_data');
        if (local) {
            try {
                const parsed = JSON.parse(local);
                window.currentData = { ...DEFAULTS, ...parsed };
                if (!window.currentData.assumptions || isNaN(window.currentData.assumptions.currentAge)) {
                    window.currentData.assumptions = { ...DEFAULTS.assumptions };
                }
            } catch(e) {
                window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
            }
        } else {
            window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
        }
    }

    loadUserDataIntoUI();
    if(window.updateSidebarChart) window.updateSidebarChart(window.currentData);
    if(window.createAssumptionControls) window.createAssumptionControls(window.currentData);
    benefits.load(window.currentData.benefits);
    burndown.load(window.currentData.burndown);
    projection.load(window.currentData.projectionSettings);
    updateSummaries();
}

function loadUserDataIntoUI() {
    if (!window.addRow || !window.currentData) return; 
    
    ['investment-rows', 'real-estate-rows', 'other-assets-rows', 'debt-rows', 'heloc-rows', 'budget-savings-rows', 'budget-expenses-rows', 'income-cards', 'stock-option-rows'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '';
    });

    const d = window.currentData;
    d.investments?.forEach(i => window.addRow('investment-rows', 'investment', i));
    d.realEstate?.forEach(i => window.addRow('real-estate-rows', 'realEstate', i));
    d.otherAssets?.forEach(i => window.addRow('other-assets-rows', 'otherAsset', i));
    d.helocs?.forEach(i => window.addRow('heloc-rows', 'heloc', i));
    d.debts?.forEach(i => window.addRow('debt-rows', 'debt', i));
    d.stockOptions?.forEach(i => window.addRow('stock-option-rows', 'stockOption', i));
    d.income?.forEach(i => window.addRow('income-cards', 'income', i));
    d.budget?.expenses?.forEach(i => window.addRow('budget-expenses-rows', 'budget-expense', i));

    const summaries = engine.calculateSummaries(d);
    window.addRow('budget-savings-rows', 'budget-savings', { 
        type: 'Pre-Tax (401k/IRA)', 
        annual: summaries.total401kContribution, 
        monthly: summaries.total401kContribution / 12, 
        isLocked: true 
    });

    d.budget?.savings?.forEach(i => {
        if (!i.isLocked) window.addRow('budget-savings-rows', 'budget-savings', i);
    });
}

function scrapeData() {
    if (!window.currentData) return null; 

    const getData = (id, fields) => {
        const container = document.getElementById(id);
        if (!container) return null; 
        const rows = Array.from(container.children).filter(row => !row.classList.contains('locked-row'));
        return rows.map(row => {
            const obj = {};
            fields.forEach(field => {
                const el = row.querySelector(`[data-id="${field}"]`);
                if (el) {
                    if (el.type === 'checkbox') obj[field] = el.checked;
                    else if (el.dataset.type === 'currency' || el.dataset.type === 'percent') obj[field] = math.fromCurrency(el.value);
                    else if (el.type === 'number') obj[field] = parseFloat(el.value) || 0;
                    else {
                        let val = el.value;
                        if (val === 'true') val = true;
                        else if (val === 'false') val = false;
                        obj[field] = val;
                    }
                }
            });
            return obj;
        });
    };

    const newData = {
        ...window.currentData,
        investments: getData('investment-rows', ['name', 'type', 'value', 'costBasis']) ?? window.currentData.investments,
        realEstate: getData('real-estate-rows', ['name', 'value', 'mortgage', 'principalPayment']) ?? window.currentData.realEstate,
        otherAssets: getData('other-assets-rows', ['name', 'value', 'loan']) ?? window.currentData.otherAssets,
        helocs: getData('heloc-rows', ['name', 'balance', 'limit', 'rate']) ?? window.currentData.helocs,
        debts: getData('debt-rows', ['name', 'balance', 'principalPayment']) ?? window.currentData.debts,
        stockOptions: getData('stock-option-rows', ['name', 'shares', 'strikePrice', 'currentPrice', 'growth', 'isLtcg']) ?? window.currentData.stockOptions,
        income: getData('income-cards', ['name', 'amount', 'increase', 'contribution', 'match', 'bonusPct', 'isMonthly', 'incomeExpenses', 'incomeExpensesMonthly', 'nonTaxableUntil', 'remainsInRetirement', 'contribOnBonus', 'matchOnBonus']) ?? window.currentData.income
    };

    const budgetSavings = getData('budget-savings-rows', ['type', 'monthly', 'annual', 'removedInRetirement']);
    const budgetExpenses = getData('budget-expenses-rows', ['name', 'monthly', 'annual', 'remainsInRetirement', 'isFixed']);
    
    newData.budget = {
        savings: budgetSavings ?? window.currentData.budget?.savings,
        expenses: budgetExpenses ?? window.currentData.budget?.expenses
    };

    const assumptionsContainer = document.getElementById('assumptions-container');
    if (assumptionsContainer) {
        const aObj = { ...window.currentData.assumptions };
        assumptionsContainer.querySelectorAll('[data-id]').forEach(el => {
            const key = el.dataset.id;
            if (el.type === 'checkbox') aObj[key] = el.checked;
            else if (el.dataset.type === 'currency') aObj[key] = math.fromCurrency(el.value);
            else if (el.dataset.type === 'percent') {
                const val = math.fromCurrency(el.value);
                // Engine expects growth as whole numbers (8.0) and lifestyle as decimals (1.0)
                const isMultiplier = ['phaseGo1', 'phaseGo2', 'phaseGo3'].includes(key);
                aObj[key] = isMultiplier ? val : (val * 100);
            }
            else if (el.tagName === 'SELECT') aObj[key] = el.value;
            else {
                let val = parseFloat(el.value);
                aObj[key] = isNaN(val) ? el.value : val;
            }
        });
        newData.assumptions = aObj;
    }

    if (document.getElementById('benefits-module')) newData.benefits = benefits.scrape();
    if (document.getElementById('burndown-view-container')) newData.burndown = burndown.scrape();
    if (document.getElementById('projection-chart')) newData.projectionSettings = projection.scrape();

    return newData;
}

export function forceSyncData() {
    const newData = scrapeData();
    if (!newData) return;
    window.currentData = newData;
    updateSummaries();
    if(window.updateSidebarChart) window.updateSidebarChart(newData);
}

export function autoSave(updateUI = true) {
    if (!window.currentData) return; 
    if (window.saveTimeout) clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
        const newData = scrapeData();
        if (!newData) return;
        window.currentData = newData; 
        
        if (updateUI) {
            updateSummaries();
            if(window.updateSidebarChart) window.updateSidebarChart(newData);
        }

        const user = auth.currentUser;
        if (user) {
            try {
                await setDoc(doc(db, "users", user.uid), newData);
                showSaveIndicator();
            } catch (e) { console.error("Save Error", e); }
        } else if (localStorage.getItem('firecalc_guest_mode') === 'true') {
            localStorage.setItem('firecalc_guest_data', JSON.stringify(newData));
            showSaveIndicator(); 
        }
    }, 1000);
}

window.debouncedAutoSave = () => autoSave(true);

function showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    // Highlight the cloud icon green for 100ms
    el.classList.add('text-emerald-400');
    setTimeout(() => {
        el.classList.remove('text-emerald-400');
    }, 100);
}

export function updateSummaries() {
    const data = window.currentData;
    if (!data) return;
    
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
    
    const currentAge = parseFloat(data.assumptions?.currentAge) || 40;
    const retirementAge = parseFloat(data.assumptions?.retirementAge) || 65;
    const ssStartAge = parseFloat(data.assumptions?.ssStartAge) || 67;
    const inflation = (data.assumptions?.inflation || 3) / 100;
    const currentYear = new Date().getFullYear();

    const yrsToRetire = Math.max(0, retirementAge - currentAge);
    const retireYear = currentYear + yrsToRetire;
    set('sum-yrs-to-retire', yrsToRetire, false);
    set('sum-life-exp', engine.getLifeExpectancy(currentAge) + currentAge, false);

    const infFacRet = Math.pow(1 + inflation, yrsToRetire);
    
    // UPDATED: Correctly subtract expenses for retirement income summary
    const streamsAtRet = (data.income || []).filter(i => i.remainsInRetirement).reduce((sum, inc) => {
        const growth = (parseFloat(inc.increase) / 100) || 0;
        const gross = (math.fromCurrency(inc.amount) * (inc.isMonthly === true || inc.isMonthly === 'true' ? 12 : 1) * Math.pow(1 + growth, yrsToRetire));
        const exp = (math.fromCurrency(inc.incomeExpenses) * (inc.incomeExpensesMonthly === true || inc.incomeExpensesMonthly === 'true' ? 12 : 1));
        return sum + (gross - exp);
    }, 0);

    const ssAtRet = (retirementAge >= ssStartAge) ? engine.calculateSocialSecurity(data.assumptions?.ssMonthly || 0, data.assumptions?.workYearsAtRetirement || 35, infFacRet) : 0;
    const totalNominalFloor = streamsAtRet + ssAtRet;
    set('sum-retirement-income-floor', totalNominalFloor);

    const incTitleEl = document.getElementById('label-retirement-income-title');
    if (incTitleEl) incTitleEl.textContent = `Retirement Income in ${retireYear}`;
    const incSubEl = document.getElementById('sum-retirement-income-sub');
    if (incSubEl) incSubEl.textContent = `${math.toCurrency(totalNominalFloor / infFacRet)} in 2026 Dollars`;

    let totalRealRetireBudget = 0;
    const totalNominalRetireBudget = (data.budget?.expenses || []).reduce((sum, exp) => {
        if (exp.remainsInRetirement === false) return sum;
        const base = math.fromCurrency(exp.annual);
        totalRealRetireBudget += base;
        return sum + (exp.isFixed ? base : base * infFacRet);
    }, 0);

    const budTitleEl = document.getElementById('label-retirement-budget-title');
    if (budTitleEl) budTitleEl.textContent = `Retirement Budget in ${retireYear}`;
    set('sum-budget-total', totalNominalRetireBudget); 
    const budSubEl = document.getElementById('sum-retirement-budget-sub');
    if (budSubEl) budSubEl.textContent = `${math.toCurrency(totalNominalRetireBudget / infFacRet)} in 2026 Dollars`;

    set('sum-retire-budget', totalNominalRetireBudget);
}

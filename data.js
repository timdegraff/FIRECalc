import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth } from './firebase-config.js';
import { engine, math } from './utils.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';

const db = getFirestore();
window.currentData = null;
window.saveTimeout = null;

// Default Data Structure
const DEFAULTS = {
    investments: [
        { name: 'Vanguard 401k', type: 'Pre-Tax (401k/IRA)', value: 300000, costBasis: 0 },
        { name: 'Roth IRA', type: 'Roth IRA', value: 200000, costBasis: 150000 },
        { name: 'Emergency Fund', type: 'Cash', value: 25000, costBasis: 25000 },
        { name: 'Brokerage', type: 'Taxable', value: 50000, costBasis: 40000 }
    ],
    realEstate: [
        { name: 'Primary Home', value: 450000, mortgage: 250000, principalPayment: 900 }
    ],
    income: [
        { name: 'Primary Salary', amount: 175000, increase: 3, contribution: 6, match: 4, bonusPct: 0, isMonthly: false, incomeExpenses: 0 }
    ],
    budget: {
        savings: [
            { type: 'Taxable', annual: 12000, monthly: 1000, removedInRetirement: true }
        ],
        expenses: [
            { name: 'Mortgage', annual: 24000, monthly: 2000, remainsInRetirement: true, isFixed: true },
            { name: 'Living Expenses', annual: 48000, monthly: 4000, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { ...window.assumptions?.defaults }
};

export async function initializeData(user) {
    if (user) {
        // Authenticated Load
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                window.currentData = { ...DEFAULTS, ...docSnap.data() };
            } else {
                window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
                await setDoc(docRef, window.currentData);
            }
        } catch (e) {
            console.error("Firestore Load Error:", e);
            window.currentData = JSON.parse(JSON.stringify(DEFAULTS));
        }
    } else {
        // Guest Mode Load
        const local = localStorage.getItem('firecalc_guest_data');
        window.currentData = local ? JSON.parse(local) : JSON.parse(JSON.stringify(DEFAULTS));
    }

    // Initialize UI Modules
    loadUserDataIntoUI();
    if(window.updateSidebarChart) window.updateSidebarChart(window.currentData);
    if(window.createAssumptionControls) window.createAssumptionControls(window.currentData);
    benefits.load(window.currentData.benefits);
    burndown.load(window.currentData.burndown);
    projection.load(window.currentData.projectionSettings);
    updateSummaries();
}

function loadUserDataIntoUI() {
    if (!window.addRow) return; 
    
    // Clear dynamic tables
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

    // Calculate Locked 401k Row
    const summaries = engine.calculateSummaries(d);
    window.addRow('budget-savings-rows', 'budget-savings', { 
        type: 'Pre-Tax (401k/IRA)', 
        annual: summaries.total401kContribution, 
        monthly: summaries.total401kContribution / 12, 
        isLocked: true 
    });

    // Add User Savings Rows
    d.budget?.savings?.forEach(i => {
        // Prevent loading locked rows if they accidentally got saved
        if (!i.isLocked) window.addRow('budget-savings-rows', 'budget-savings', i);
    });
}

function scrapeData() {
    const getData = (id, fields) => {
        const container = document.getElementById(id);
        if (!container) return [];
        // CRITICAL FIX: Ignore rows with class 'locked-row' to prevent duplicates
        const rows = Array.from(container.children).filter(row => !row.classList.contains('locked-row'));
        return rows.map(row => {
            const obj = {};
            fields.forEach(field => {
                const el = row.querySelector(`[data-id="${field}"]`);
                if (el) {
                    if (el.type === 'checkbox') obj[field] = el.checked;
                    else if (el.dataset.type === 'currency') obj[field] = math.fromCurrency(el.value);
                    else if (el.type === 'number') obj[field] = parseFloat(el.value) || 0;
                    else obj[field] = el.value;
                }
            });
            // Handle hidden inputs for row-specific settings
            row.querySelectorAll('input[type="hidden"]').forEach(h => {
                if (fields.includes(h.dataset.id)) obj[h.dataset.id] = (h.value === 'true');
            });
            return obj;
        });
    };

    const newData = {
        assumptions: { ...window.currentData.assumptions }, // Preserves assumption keys not in scraping list
        investments: getData('investment-rows', ['name', 'type', 'value', 'costBasis']),
        realEstate: getData('real-estate-rows', ['name', 'value', 'mortgage', 'principalPayment']),
        otherAssets: getData('other-assets-rows', ['name', 'value', 'loan']),
        helocs: getData('heloc-rows', ['name', 'balance', 'limit', 'rate']),
        debts: getData('debt-rows', ['name', 'balance', 'principalPayment']),
        stockOptions: getData('stock-option-rows', ['name', 'shares', 'strikePrice', 'currentPrice', 'growth', 'isLtcg']),
        income: getData('income-cards', ['name', 'amount', 'increase', 'contribution', 'match', 'bonusPct', 'isMonthly', 'incomeExpenses', 'incomeExpensesMonthly', 'nonTaxableUntil', 'remainsInRetirement', 'contribOnBonus', 'matchOnBonus']),
        budget: {
            savings: getData('budget-savings-rows', ['type', 'monthly', 'annual', 'removedInRetirement']),
            expenses: getData('budget-expenses-rows', ['name', 'monthly', 'annual', 'remainsInRetirement', 'isFixed'])
        },
        benefits: benefits.scrape(),
        burndown: burndown.scrape(),
        projectionSettings: projection.scrape()
    };

    return newData;
}

/**
 * Force a synchronous refresh of the global data state from the UI.
 * Used before switching to tabs that depend on calculated projections.
 */
export function forceSyncData() {
    const newData = scrapeData();
    window.currentData = newData;
    updateSummaries();
    if(window.updateSidebarChart) window.updateSidebarChart(newData);
}

export function autoSave(updateUI = true) {
    if (window.saveTimeout) clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(async () => {
        const newData = scrapeData();
        window.currentData = newData; // Update local state immediately
        
        if (updateUI) {
            updateSummaries();
            if(window.updateSidebarChart) window.updateSidebarChart(newData);
        }

        const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';
        const user = auth.currentUser;

        // Persist Data
        if (user) {
            try {
                await setDoc(doc(db, "users", user.uid), newData);
                showSaveIndicator();
            } catch (e) { console.error("Save Error", e); }
        } else if (isGuest) {
            localStorage.setItem('firecalc_guest_data', JSON.stringify(newData));
            showSaveIndicator(); // Mobile might use this
        }
    }, 1000);
}

// Global debounced save for UI events
window.debouncedAutoSave = () => autoSave(true);

function showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.classList.add('text-emerald-400');
    setTimeout(() => el.classList.remove('text-emerald-400'), 2000);
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
    
    const currentAge = data.assumptions?.currentAge || 40;
    const retirementAge = data.assumptions?.retirementAge || 65;
    const ssStartAge = data.assumptions?.ssStartAge || 67;
    const inflation = (data.assumptions?.inflation || 3) / 100;

    const yrsToRetire = Math.max(0, retirementAge - currentAge);
    set('sum-yrs-to-retire', yrsToRetire, false);
    set('sum-life-exp', engine.getLifeExpectancy(currentAge) + currentAge, false);

    // Factors for retirement
    const infFacRet = Math.pow(1 + inflation, yrsToRetire);

    // Income at retirement (Yr 1)
    const streamsAtRet = (data.income || []).filter(i => i.remainsInRetirement).reduce((sum, inc) => {
        const growth = (parseFloat(inc.increase) / 100) || 0;
        return sum + (math.fromCurrency(inc.amount) * (inc.isMonthly ? 12 : 1) * Math.pow(1 + growth, yrsToRetire));
    }, 0);
    const ssAtRet = (retirementAge >= ssStartAge) ? engine.calculateSocialSecurity(data.assumptions?.ssMonthly || 0, data.assumptions?.workYearsAtRetirement || 35, infFacRet) : 0;
    const totalRetIncome = streamsAtRet + ssAtRet;
    set('sum-retirement-income-floor', totalRetIncome);

    // Retirement Year 1 Budget Calculation
    const retireBudget = (data.budget?.expenses || []).reduce((sum, exp) => {
        if (exp.remainsInRetirement === false) return sum;
        const base = math.fromCurrency(exp.annual);
        // If fixed, don't inflate. If not fixed, inflate to retirement year.
        return sum + (exp.isFixed ? base : base * infFacRet);
    }, 0);
    set('sum-retire-budget', retireBudget);
    set('sum-budget-total', retireBudget); 

    // Income at SS start age breakdown
    const floorDetails = document.getElementById('sum-floor-breakdown');
    if (floorDetails) {
        let details = [];
        if (streamsAtRet > 0) details.push(`Income: ${math.toSmartCompactCurrency(streamsAtRet)}`);
        if (ssAtRet > 0) details.push(`SS: ${math.toSmartCompactCurrency(ssAtRet)}`);
        floorDetails.textContent = details.join(' + ');
    }
}

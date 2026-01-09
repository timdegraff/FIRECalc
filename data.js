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
    
    // Trigger "Saving" State (Orange Flash)
    const indicators = document.querySelectorAll('#save-indicator');
    const isGuest = localStorage.getItem('firecalc_guest_mode') === 'true';

    indicators.forEach(el => {
        // Only flash indicator if not in guest mode
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
            setIndicatorColor(el, 'text-green-500');
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
            setIndicatorColor(el, state === 'success' ? "text-green-500" : "text-red-500");
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
    document
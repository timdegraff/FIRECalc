export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const assetColors = {
    'Cash': '#f472b6',
    'Taxable': '#10b981',
    'Brokerage': '#10b981',
    'Stock Options': '#14b8a6',
    'Pre-Tax (401k/IRA)': '#3b82f6',
    'Pre-Tax': '#3b82f6',
    'Roth IRA': '#a855f7',
    'Post-Tax': '#a855f7',
    'Roth Basis': '#a855f7',
    'Roth Gains': '#9333ea',
    'Crypto': '#94a3b8',
    'Bitcoin': '#94a3b8',
    'Metals': '#eab308',
    'Real Estate': '#6366f1',
    'Other': '#64748b',
    'HELOC': '#ef4444',
    'Debt': '#dc2626',
    'HSA': '#2dd4bf',
    '529': '#fb7185'
};

export const assumptions = {
    defaults: {
        currentAge: 40,
        retirementAge: 65,
        ssStartAge: 67,
        ssMonthly: 3000,
        stockGrowth: 7,
        cryptoGrowth: 7,
        metalsGrowth: 4,
        realEstateGrowth: 3,
        inflation: 3,
        filingStatus: 'Single',
        helocRate: 7,
        state: 'Michigan',
        workYearsAtRetirement: 35,
        slowGoFactor: 1.0,
        midGoFactor: 0.9,
        noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    }
};

export const stateTaxRates = {
    'Alabama': { rate: 0.04, taxesSS: false, expanded: false },
    'Alaska': { rate: 0.00, taxesSS: false, expanded: true, fplBase: 20080 },
    'Arizona': { rate: 0.025, taxesSS: false, expanded: true },
    'Arkansas': { rate: 0.044, taxesSS: false, expanded: true },
    'California': { rate: 0.093, taxesSS: false, expanded: true },
    'Colorado': { rate: 0.044, taxesSS: true, expanded: true },
    'Connecticut': { rate: 0.06, taxesSS: true, expanded: true },
    'Delaware': { rate: 0.05, taxesSS: false, expanded: true },
    'District of Columbia': { rate: 0.08, taxesSS: false, expanded: true },
    'Florida': { rate: 0.00, taxesSS: false, expanded: false },
    'Georgia': { rate: 0.0575, taxesSS: false, expanded: false },
    'Hawaii': { rate: 0.08, taxesSS: false, expanded: true, fplBase: 18470 },
    'Idaho': { rate: 0.058, taxesSS: false, expanded: true },
    'Illinois': { rate: 0.0495, taxesSS: false, expanded: true },
    'Indiana': { rate: 0.0305, taxesSS: false, expanded: true },
    'Iowa': { rate: 0.06, taxesSS: false, expanded: true },
    'Kansas': { rate: 0.05, taxesSS: true, expanded: false },
    'Kentucky': { rate: 0.045, taxesSS: false, expanded: true },
    'Louisiana': { rate: 0.04, taxesSS: false, expanded: true },
    'Maine': { rate: 0.06, taxesSS: false, expanded: true },
    'Maryland': { rate: 0.0475, taxesSS: false, expanded: true },
    'Massachusetts': { rate: 0.05, taxesSS: false, expanded: true },
    'Michigan': { rate: 0.0425, taxesSS: false, expanded: true },
    'Minnesota': { rate: 0.07, taxesSS: true, expanded: true },
    'Mississippi': { rate: 0.05, taxesSS: false, expanded: false },
    'Missouri': { rate: 0.049, taxesSS: false, expanded: true },
    'Montana': { rate: 0.05, taxesSS: true, expanded: true },
    'Nebraska': { rate: 0.06, taxesSS: true, expanded: true },
    'Nevada': { rate: 0.00, taxesSS: false, expanded: true },
    'New Hampshire': { rate: 0.00, taxesSS: false, expanded: true },
    'New Jersey': { rate: 0.0637, taxesSS: false, expanded: true },
    'New Mexico': { rate: 0.049, taxesSS: true, expanded: true },
    'New York': { rate: 0.06, taxesSS: false, expanded: true },
    'North Carolina': { rate: 0.045, taxesSS: false, expanded: true },
    'North Dakota': { rate: 0.02, taxesSS: false, expanded: true },
    'Ohio': { rate: 0.035, taxesSS: false, expanded: true },
    'Oklahoma': { rate: 0.0475, taxesSS: false, expanded: true },
    'Oregon': { rate: 0.09, taxesSS: false, expanded: true },
    'Pennsylvania': { rate: 0.0307, taxesSS: false, expanded: true },
    'Rhode Island': { rate: 0.04, taxesSS: true, expanded: true },
    'South Carolina': { rate: 0.06, taxesSS: false, expanded: false },
    'South Dakota': { rate: 0.00, taxesSS: false, expanded: true },
    'Tennessee': { rate: 0.00, taxesSS: false, expanded: false },
    'Texas': { rate: 0.00, taxesSS: false, expanded: false },
    'Utah': { rate: 0.0465, taxesSS: true, expanded: true },
    'Vermont': { rate: 0.06, taxesSS: true, expanded: true },
    'Virginia': { rate: 0.0575, taxesSS: false, expanded: true },
    'Washington': { rate: 0.00, taxesSS: false, expanded: true },
    'West Virginia': { rate: 0.04, taxesSS: true, expanded: true },
    'Wisconsin': { rate: 0.053, taxesSS: false, expanded: true },
    'Wyoming': { rate: 0.00, taxesSS: false, expanded: false }
};

export const math = {
    toCurrency: (value, isCompact = false, decimals = 0) => {
        if (isNaN(value) || value === null) return '$0';
        const absVal = Math.abs(value);
        let maxFrac = decimals;
        if (isCompact && absVal >= 1000000) maxFrac = 1;
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', currency: 'USD',
            notation: isCompact ? 'compact' : 'standard',
            minimumFractionDigits: decimals, 
            maximumFractionDigits: Math.max(decimals, maxFrac)
        }).format(value);
    },
    toSmartCompactCurrency: (value) => {
        if (isNaN(value) || value === null) return '$0';
        const sign = value < 0 ? '-' : '';
        const absVal = Math.abs(value);
        if (absVal >= 1000000000000) return sign + '$999B';
        if (absVal < 1000) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
        if (absVal < 1000000) return sign + '$' + Math.round(absVal / 1000) + 'K';
        if (absVal < 10000000) return sign + '$' + (absVal / 1000000).toFixed(1) + 'M';
        if (absVal < 1000000000) return sign + '$' + Math.round(absVal / 1000000) + 'M';
        if (absVal < 10000000000) return sign + '$' + (absVal / 1000000000).toFixed(1) + 'B';
        return sign + '$' + Math.round(absVal / 1000000000) + 'B';
    },
    fromCurrency: (value) => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        const isPercent = String(value).includes('%');
        const num = Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
        return isPercent ? num / 100 : num;
    },
    getGrowthForAge: (type, age, currentAge, assumptions) => {
        const keyMap = {
            'Stock': 'stockGrowth',
            'Stock Options': 'stockGrowth',
            'Crypto': 'cryptoGrowth',
            'Metals': 'metalsGrowth',
            'RealEstate': 'realEstateGrowth'
        };
        const key = keyMap[type];
        if (!key) return 0;
        const initial = parseFloat(assumptions[key]) || 0;
        const isAdvanced = !!assumptions.advancedGrowth;
        if (!isAdvanced) return initial / 100;
        const years = parseFloat(assumptions[key + 'Years']) || 0;
        const perpetual = parseFloat(assumptions[key + 'Perpetual'] || initial);
        if (age < currentAge + years) return initial / 100;
        return perpetual / 100;
    }
};

const SNAP_CONFIG = {
    states: {
        'TX': { limit: 1.65, assetTest: true, assetLimit: 5000 },
        'GA': { limit: 1.30, assetTest: false },
        'NH': { limit: 1.30, assetTest: false },
        'UT': { limit: 1.30, assetTest: false },
        'ID': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'IN': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'IA': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500, maha: true },
        'KS': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'MS': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'MO': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500, maha: true },
        'SD': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'TN': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500, maha: true },
        'WY': { limit: 1.30, assetTest: true, assetLimit: 3000, assetLimitDisabled: 4500 },
        'NE': { limit: 2.00, assetTest: false, maha: true },
        'CO': { limit: 2.00, assetTest: false, maha: true },
        'HI': { limit: 2.00, assetTest: false, maha: true },
        'ND': { limit: 2.00, assetTest: false, maha: true },
        'SC': { limit: 2.00, assetTest: false, maha: true },
        'VA': { limit: 2.00, assetTest: false, maha: true }
    },
    constants: {
        federal: {
            fpl100: [1305, 1763, 2221, 2680, 3138, 3596, 4055, 4513],
            stdDed: [209, 209, 209, 223, 261, 299],
            maxShelter: 744,
            maxAllotment: [292, 536, 768, 975, 1183, 1390, 1536, 1756],
            sua: 682
        },
        alaska: {
            fpl100: [1630, 2203, 2776, 3349, 3923, 4496, 5069, 5642],
            stdDed: [287, 287, 287, 306, 358, 410],
            maxShelter: 1189,
            maxAllotment: [377, 692, 992, 1260, 1529, 1797, 1986, 2270],
            sua: 900 // Est
        },
        hawaii: {
            fpl100: [1501, 2028, 2555, 3083, 3610, 4138, 4665, 5192],
            stdDed: [240, 240, 240, 256, 300, 344],
            maxShelter: 1003,
            maxAllotment: [497, 911, 1305, 1657, 2010, 2362, 2611, 2985],
            sua: 850 // Est
        }
    }
};

export const engine = {
    getLifeExpectancy: (age) => {
        const table = {
            30: 55.3, 31: 54.3, 32: 53.3, 33: 52.4, 34: 51.4, 35: 50.5, 36: 49.5, 37: 48.6, 38: 47.6, 39: 46.7,
            40: 45.7, 41: 44.8, 42: 43.8, 43: 42.9, 44: 41.9, 45: 41.0, 46: 40.0, 47: 39.1, 48: 38.1, 49: 37.2,
            50: 36.2, 51: 35.3, 52: 34.3, 53: 33.4, 54: 32.5, 55: 31.5, 56: 30.6, 57: 29.8, 58: 28.9, 59: 28.0, 60: 27.1
        };
        const roundedAge = Math.floor(age);
        if (roundedAge < 30) return 55.3 + (30 - roundedAge);
        if (roundedAge > 60) return 27.1 - (roundedAge - 60);
        return table[roundedAge];
    },
    calculateRMD: (balance, age) => {
        if (age < 75 || balance <= 0) return 0;
        const distributionPeriod = {
            75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8,
            85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5,
            95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4
        };
        return balance / (distributionPeriod[age] || 6.4);
    },
    calculateMaxSepp: (balance, age) => {
        if (balance <= 0) return 0;
        const n = engine.getLifeExpectancy(age), r = 0.05; 
        const annualPayment = balance * ((r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1));
        return Math.floor(annualPayment);
    },
    calculateSocialSecurity: (baseMonthly, workYears, inflationFactor) => {
        const fullBenefit = baseMonthly * 12 * inflationFactor;
        const multiplier = Math.min(1, Math.max(0.1, workYears / 35));
        return fullBenefit * multiplier;
    },
    calculateTaxableSocialSecurity: (ssAmount, otherIncome, status = 'Single') => {
        if (ssAmount <= 0) return 0;
        const provisionalIncome = otherIncome + (ssAmount * 0.5);
        let t1 = status === 'Married Filing Jointly' ? 32000 : 25000;
        let t2 = status === 'Married Filing Jointly' ? 44000 : 34000;
        let taxable = 0;
        if (provisionalIncome > t2) taxable = (0.5 * (t2 - t1)) + (0.85 * (provisionalIncome - t2));
        else if (provisionalIncome > t1) taxable = 0.5 * (provisionalIncome - t1);
        return Math.min(taxable, ssAmount * 0.85);
    },
    calculateTax: (ordinaryIncome, ltcgIncome, status = 'Single', state = 'Michigan', inflationFactor = 1) => {
        const stdDedMap = { 'Single': 15000, 'Married Filing Jointly': 30000, 'Head of Household': 22500 };
        const stdDed = (stdDedMap[status] || 15000) * inflationFactor;
        let taxableOrdinary = Math.max(0, ordinaryIncome - stdDed);
        let taxableLtcg = Math.max(0, ltcgIncome - Math.max(0, stdDed - ordinaryIncome));
        let tax = 0;
        const a = window.currentData?.assumptions || {};
        const userLtcgRate = (a.ltcgRate || 15) / 100;
        const brackets = {
            'Single': [[11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]],
            'Married Filing Jointly': [[23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]],
            'Head of Household': [[17000, 0.10], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]]
        };
        const baseBrackets = brackets[status] || brackets['Single'];
        let prev = 0, remainingOrdinary = taxableOrdinary;
        for (const [limitBase, rate] of baseBrackets) {
            const limit = limitBase === Infinity ? Infinity : limitBase * inflationFactor;
            const range = Math.min(remainingOrdinary, limit - prev);
            tax += range * rate;
            remainingOrdinary -= range;
            prev = limit;
            if (remainingOrdinary <= 0) break;
        }
        const ltcgZeroLimit = (status === 'Married Filing Jointly' ? 94000 : (status === 'Head of Household' ? 63000 : 47000)) * inflationFactor;
        const ltcgInTaxableRange = Math.max(0, taxableLtcg - Math.max(0, ltcgZeroLimit - taxableOrdinary));
        tax += (ltcgInTaxableRange * userLtcgRate);
        tax += ((ordinaryIncome + ltcgIncome) * (stateTaxRates[state]?.rate || 0));
        return tax;
    },
    calculateSnapBenefit: (earnedMonthly, unearnedMonthly, liquidAssets, hhSize, shelterCosts, hasSUA, isDisabledOrElderly, childSupportPaid = 0, depCare = 0, medicalExps = 0, stateId = 'Michigan', inflationFactor = 1) => {
        const isAK = stateId === 'Alaska', isHI = stateId === 'Hawaii';
        const geoSet = isAK ? SNAP_CONFIG.constants.alaska : (isHI ? SNAP_CONFIG.constants.hawaii : SNAP_CONFIG.constants.federal);
        const stateConfig = SNAP_CONFIG.states[stateId] || { limit: 2.00, assetTest: false };
        
        // Gate 1: Gross Income Test
        if (!isDisabledOrElderly) {
            const fpl100Value = (geoSet.fpl100[hhSize - 1] || (geoSet.fpl100[7] + (hhSize - 8) * (geoSet.fpl100[7] - geoSet.fpl100[6]))) * inflationFactor;
            const grossLimit = fpl100Value * stateConfig.limit;
            if ((earnedMonthly + unearnedMonthly) > grossLimit) return 0;
        }

        // Gate 2: Asset Test
        if (stateConfig.assetTest) {
            const limit = isDisabledOrElderly ? (stateConfig.assetLimitDisabled || stateConfig.assetLimit) : stateConfig.assetLimit;
            if (liquidAssets > limit) return 0;
        }

        // Gate 3: The Math
        const stdDed = (geoSet.stdDed[hhSize - 1] || geoSet.stdDed[5]) * inflationFactor;
        const earnedDed = earnedMonthly * 0.20;
        const medicalDed = isDisabledOrElderly ? Math.max(0, medicalExps - 35) : 0;
        
        const adjustedIncome = Math.max(0, (earnedMonthly - earnedDed) + unearnedMonthly - stdDed - childSupportPaid - depCare - medicalDed);
        const totalShelterCosts = shelterCosts + (hasSUA ? geoSet.sua * inflationFactor : 0);
        const shelterThreshold = adjustedIncome * 0.50;
        let excessShelter = Math.max(0, totalShelterCosts - shelterThreshold);
        
        if (!isDisabledOrElderly) excessShelter = Math.min(excessShelter, geoSet.maxShelter * inflationFactor);
        
        const netIncome = Math.max(0, adjustedIncome - excessShelter);
        const maxAllotment = (geoSet.maxAllotment[hhSize - 1] || (geoSet.maxAllotment[7] + (hhSize - 8) * (geoSet.maxAllotment[7] - geoSet.maxAllotment[6]))) * inflationFactor;
        
        const benefit = Math.floor(Math.max(0, maxAllotment - (netIncome * 0.30)));
        if (hhSize <= 2 && (earnedMonthly + unearnedMonthly) <= 0 && benefit < 23) return 23;
        
        return benefit;
    },
    calculateSummaries: (data) => {
        const inv = data.investments || [], options = data.stockOptions || [], re = data.realEstate || [], oa = data.otherAssets || [], helocs = data.helocs || [], debts = data.debts || [], inc = data.income || [], budget = data.budget || { savings: [], expenses: [] };
        const optionsEquity = options.reduce((s, x) => {
            const shares = parseFloat(x.shares) || 0;
            const strike = math.fromCurrency(x.strikePrice);
            const fmv = math.fromCurrency(x.currentPrice);
            return s + Math.max(0, (fmv - strike) * shares);
        }, 0);
        const totalAssets = inv.reduce((s, x) => s + math.fromCurrency(x.value), 0) + optionsEquity + re.reduce((s, x) => s + math.fromCurrency(x.value), 0) + oa.reduce((s, x) => s + math.fromCurrency(x.value), 0);
        const totalLiabilities = re.reduce((s, x) => s + math.fromCurrency(x.mortgage), 0) + oa.reduce((s, x) => s + math.fromCurrency(x.loan), 0) + helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0) + debts.reduce((s, x) => s + math.fromCurrency(x.balance), 0);
        const age = data.assumptions?.currentAge || 40;
        let irsLimit = 23500;
        if (age >= 60 && age <= 63) irsLimit = 34750;
        else if (age >= 50) irsLimit = 31000;
        let total401kContribution = 0, totalGrossInflow = 0, totalNetSource = 0, currentYearMagi = 0;
        const currentYear = new Date().getFullYear();
        inc.forEach(x => {
            const isMon = x.isMonthly === true || x.isMonthly === 'true';
            let base = math.fromCurrency(x.amount) * (isMon ? 12 : 1);
            const bonus = (base * (parseFloat(x.bonusPct) / 100 || 0));
            const sourceGross = base + bonus;
            let personal401kRaw = base * (parseFloat(x.contribution) / 100 || 0);
            if (x.contribOnBonus) personal401kRaw += (bonus * (parseFloat(x.contribution) / 100 || 0));
            const cappedIndividual401k = Math.min(personal401kRaw, irsLimit);
            total401kContribution += cappedIndividual401k;
            const isExpMon = x.incomeExpensesMonthly === true || x.incomeExpensesMonthly === 'true';
            const sourceExpenses = (math.fromCurrency(x.incomeExpenses) * (isExpMon ? 12 : 1));
            totalGrossInflow += sourceGross;
            totalNetSource += (sourceGross - sourceExpenses); 
            
            // Respect "No Tax Until" for the current year MAGI calculation
            const taxableYear = parseInt(x.nonTaxableUntil);
            if (isNaN(taxableYear) || currentYear >= taxableYear) {
                currentYearMagi += (sourceGross - sourceExpenses - cappedIndividual401k);
            }
        });
        const hsaSavings = budget.savings?.filter(s => s.type === 'HSA').reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        const manualSavingsSum = budget.savings?.filter(x => !x.isLocked).reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        return { 
            netWorth: totalAssets - totalLiabilities, 
            totalAssets, totalLiabilities, 
            totalGrossIncome: totalGrossInflow, 
            magiBase: Math.max(0, currentYearMagi - hsaSavings), 
            total401kContribution, 
            totalAnnualSavings: manualSavingsSum + total401kContribution + hsaSavings, 
            totalAnnualBudget: budget.expenses?.reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0 
        };
    }
};
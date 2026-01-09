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
    'Crypto': '#f59e0b',
    'Bitcoin': '#f59e0b',
    'Metals': '#eab308',
    'Real Estate': '#6366f1',
    'Other': '#94a3b8',
    'HELOC': '#ef4444',
    'Debt': '#dc2626',
    'HSA': '#2dd4bf',
    '529': '#fb7185'
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
        const absVal = Math.abs(value);
        if (absVal >= 1000000000000) return '$999B';
        if (absVal < 1000) return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
        if (absVal < 1000000) return '$' + Math.round(absVal / 1000) + 'K';
        if (absVal < 10000000) return '$' + (absVal / 1000000).toFixed(1) + 'M';
        if (absVal < 1000000000) return '$' + Math.round(absVal / 1000000) + 'M';
        if (absVal < 10000000000) return '$' + (absVal / 1000000000).toFixed(1) + 'B';
        return '$' + Math.round(absVal / 1000000000) + 'B';
    },
    fromCurrency: (value) => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        return Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
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
        const perpetual = parseFloat(assumptions[key + 'Perpetual']) || initial;

        if (age < currentAge + years) {
            return initial / 100;
        }
        return perpetual / 100;
    }
};

export const assumptions = {
    defaults: { 
        currentAge: 40, retirementAge: 65, ssStartAge: 67, ssMonthly: 3000, 
        stockGrowth: 8, cryptoGrowth: 10, metalsGrowth: 6, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Married Filing Jointly', benefitCeiling: 1.38, 
        helocRate: 7, state: 'Michigan', workYearsAtRetirement: 35,
        slowGoFactor: 1.1, midGoFactor: 1.0, noGoFactor: 0.8,
        advancedGrowth: false,
        stockGrowthYears: 10, stockGrowthPerpetual: 4,
        cryptoGrowthYears: 5, cryptoGrowthPerpetual: 5,
        metalsGrowthYears: 10, metalsGrowthPerpetual: 3,
        realEstateGrowthYears: 15, realEstateGrowthPerpetual: 2
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
        
        // Projected 2026 Federal Brackets
        const brackets = {
            'Single': [
                [11925, 0.10], [48475, 0.12], [103350, 0.22], [197300, 0.24],
                [250525, 0.32], [626350, 0.35], [Infinity, 0.37]
            ],
            'Married Filing Jointly': [
                [23850, 0.10], [96950, 0.12], [206700, 0.22], [394600, 0.24],
                [501050, 0.32], [751600, 0.35], [Infinity, 0.37]
            ],
            'Head of Household': [
                [17000, 0.10], [64850, 0.12], [103350, 0.22], [197300, 0.24],
                [250525, 0.32], [626350, 0.35], [Infinity, 0.37]
            ]
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
        const ltcgInFifteen = Math.max(0, taxableLtcg - Math.max(0, ltcgZeroLimit - taxableOrdinary));
        tax += (ltcgInFifteen * 0.15);
        tax += ((ordinaryIncome + ltcgIncome) * (stateTaxRates[state]?.rate || 0));
        return tax;
    },
    calculateSnapBenefit: (income, hhSize, shelterCosts, hasSUA, isDisabled, state = 'Michigan', inflationFactor = 1) => {
        const monthlyGross = income / 12;
        const fplBaseline = stateTaxRates[state]?.fplBase || 16060;
        const snapFpl = (fplBaseline + (hhSize - 1) * 5650) * inflationFactor;
        if (monthlyGross > (snapFpl * 2.0) / 12) return 0;
        const stdDed = (hhSize <= 3 ? 205 : (hhSize === 4 ? 220 : (hhSize === 5 ? 255 : 295))) * inflationFactor;
        const adjIncome = Math.max(0, monthlyGross - stdDed);
        const shelterThreshold = adjIncome / 2;
        const rawExcessShelter = Math.max(0, (shelterCosts + (hasSUA ? 680 * inflationFactor : 0)) - shelterThreshold);
        const finalShelterDeduction = (isDisabled) ? rawExcessShelter : Math.min(rawExcessShelter, 712 * inflationFactor);
        const maxBenefit = (295 + (hhSize - 1) * 215) * inflationFactor;
        return Math.floor(Math.max(0, maxBenefit - (Math.max(0, adjIncome - finalShelterDeduction) * 0.3)));
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
        let total401kContribution = 0, totalGrossIncomeAccum = 0; 
        inc.forEach(x => {
            let base = math.fromCurrency(x.amount) * (x.isMonthly ? 12 : 1);
            let personal401k = base * (parseFloat(x.contribution) / 100 || 0);
            if (x.contribOnBonus) personal401k += (base * (parseFloat(x.bonusPct) / 100 || 0) * (parseFloat(x.contribution) / 100 || 0));
            total401kContribution += personal401k;
            totalGrossIncomeAccum += (base + base * (parseFloat(x.bonusPct) / 100 || 0)) - (math.fromCurrency(x.incomeExpenses) * (x.incomeExpensesMonthly ? 12 : 1)); 
        });
        
        const finalGross = Math.max(0, totalGrossIncomeAccum);
        const age = data.assumptions?.currentAge || 40;
        let irsLimit = 23500;
        if (age >= 60 && age <= 63) irsLimit = 34750;
        else if (age >= 50) irsLimit = 31000;
        
        const capped401k = Math.min(total401kContribution, irsLimit);
        const hsaSavings = budget.savings?.filter(s => s.type === 'HSA').reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        const manualSavingsSum = budget.savings?.filter(x => !x.isLocked).reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        
        return { 
            netWorth: totalAssets - totalLiabilities, 
            totalAssets, 
            totalLiabilities, 
            totalGrossIncome: finalGross, 
            magiBase: Math.max(0, finalGross - capped401k - hsaSavings), 
            total401kContribution: capped401k, 
            totalAnnualSavings: manualSavingsSum + capped401k + hsaSavings, 
            totalAnnualBudget: budget.expenses?.reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0 
        };
    }
};
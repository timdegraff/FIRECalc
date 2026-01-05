
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2);

export const assetColors = {
    'Cash': '#f472b6',
    'Taxable': '#10b981',
    'Brokerage': '#10b981',
    'Pre-Tax (401k/IRA)': '#3b82f6',
    'Pre-Tax': '#3b82f6',
    'Post-Tax (Roth)': '#a855f7',
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
    '529 Plan': '#fb7185'
};

// 2026 Status: Most states exempt SS. These are approximations.
export const stateTaxRates = {
    'Michigan': { rate: 0.0425, taxesSS: false },
    'Florida': { rate: 0.00, taxesSS: false },
    'Texas': { rate: 0.00, taxesSS: false },
    'California': { rate: 0.093, taxesSS: false }, // Progressive, using est avg high
    'New York': { rate: 0.06, taxesSS: false },
    'Washington': { rate: 0.00, taxesSS: false },
    'Nevada': { rate: 0.00, taxesSS: false },
    'Tennessee': { rate: 0.00, taxesSS: false },
    'New Hampshire': { rate: 0.00, taxesSS: false },
    'South Dakota': { rate: 0.00, taxesSS: false },
    'Wyoming': { rate: 0.00, taxesSS: false },
    'Illinois': { rate: 0.0495, taxesSS: false },
    'Ohio': { rate: 0.035, taxesSS: false },
    'Indiana': { rate: 0.0305, taxesSS: false },
    'Wisconsin': { rate: 0.053, taxesSS: false },
    'North Carolina': { rate: 0.045, taxesSS: false },
    'Colorado': { rate: 0.044, taxesSS: true }, // Taxed > age 65 limits
    'Connecticut': { rate: 0.06, taxesSS: true },
    'Minnesota': { rate: 0.07, taxesSS: true },
    'Montana': { rate: 0.05, taxesSS: true },
    'New Mexico': { rate: 0.049, taxesSS: true },
    'Rhode Island': { rate: 0.04, taxesSS: true },
    'Utah': { rate: 0.0465, taxesSS: true },
    'Vermont': { rate: 0.06, taxesSS: true },
    'West Virginia': { rate: 0.04, taxesSS: true }
};

export const math = {
    toCurrency: (value, isCompact = false) => {
        if (isNaN(value) || value === null) return '$0';
        return new Intl.NumberFormat('en-US', { 
            style: 'currency', currency: 'USD',
            notation: isCompact ? 'compact' : 'standard',
            minimumFractionDigits: 0, maximumFractionDigits: isCompact ? 1 : 0
        }).format(value);
    },
    fromCurrency: (value) => {
        if (typeof value === 'number') return value;
        if (!value) return 0;
        return Number(String(value).replace(/[^0-9.-]+/g, "")) || 0;
    }
};

export const assumptions = {
    defaults: { 
        currentAge: 40, 
        retirementAge: 65, 
        ssStartAge: 67, 
        ssMonthly: 3000, 
        stockGrowth: 8, 
        cryptoGrowth: 10, 
        metalsGrowth: 6, 
        realEstateGrowth: 3, 
        inflation: 3, 
        filingStatus: 'Married Filing Jointly', 
        benefitCeiling: 1.38, 
        helocRate: 7,
        state: 'Michigan',
        workYearsAtRetirement: 35,
        slowGoFactor: 1.1,
        midGoFactor: 1.0,
        noGoFactor: 0.85
    }
};

export const engine = {
    getLifeExpectancy: (age) => {
        const table = {
            30: 55.3, 31: 54.3, 32: 53.3, 33: 52.4, 34: 51.4, 35: 50.5, 36: 49.5, 37: 48.6, 38: 47.6, 39: 46.7,
            40: 45.7, 41: 44.8, 42: 43.8, 43: 42.9, 44: 41.9, 45: 41.0, 46: 40.0, 47: 39.1, 48: 38.1, 49: 37.2,
            50: 36.2, 51: 35.3, 52: 34.3, 53: 33.4, 54: 32.5, 55: 31.5, 56: 30.6, 57: 29.8, 58: 28.9, 59: 28.0,
            60: 27.1
        };
        const roundedAge = Math.floor(age);
        if (roundedAge < 30) return 55.3 + (30 - roundedAge);
        if (roundedAge > 60) return 27.1 - (roundedAge - 60);
        return table[roundedAge];
    },

    calculateRMD: (balance, age) => {
        if (age < 75 || balance <= 0) return 0;
        const distributionPeriod = {
            75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
            80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8,
            85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
            90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5,
            95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4
        };
        const factor = distributionPeriod[age] || 6.4;
        return balance / factor;
    },

    calculateMaxSepp: (balance, age) => {
        if (balance <= 0) return 0;
        const n = engine.getLifeExpectancy(age);
        const r = 0.05; 
        const numerator = r * Math.pow(1 + r, n);
        const denominator = Math.pow(1 + r, n) - 1;
        const annualPayment = balance * (numerator / denominator);
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
        let threshold1, threshold2;

        if (status === 'Married Filing Jointly') {
            threshold1 = 32000;
            threshold2 = 44000;
        } else { // Single or Head of Household
            threshold1 = 25000;
            threshold2 = 34000;
        }

        let taxableAmount = 0;
        if (provisionalIncome > threshold2) {
            taxableAmount = (0.5 * (threshold2 - threshold1)) + (0.85 * (provisionalIncome - threshold2));
        } else if (provisionalIncome > threshold1) {
            taxableAmount = 0.5 * (provisionalIncome - threshold1);
        }

        return Math.min(taxableAmount, ssAmount * 0.85);
    },

    /**
     * Calculates tax with separation for Ordinary Income vs LTCG
     */
    calculateTax: (ordinaryIncome, ltcgIncome, status = 'Single', state = 'Michigan', inflationFactor = 1) => {
        const stdDedMap = { 'Single': 15000, 'Married Filing Jointly': 30000, 'Head of Household': 22500 };
        const stdDed = (stdDedMap[status] || 15000) * inflationFactor;

        // 1. Ordinary Income Tax
        let taxableOrdinary = Math.max(0, ordinaryIncome - stdDed);
        // If Ordinary didn't use up StdDed, remainder reduces LTCG
        let ltcgDeductionRemainder = Math.max(0, stdDed - ordinaryIncome);
        let taxableLtcg = Math.max(0, ltcgIncome - ltcgDeductionRemainder);

        let tax = 0;
        
        // 2026 Ordinary Brackets
        const brackets = {
            'Single': [[11600, 0.10], [47150, 0.12], [100525, 0.22], [191950, 0.24]],
            'Married Filing Jointly': [[23200, 0.10], [94300, 0.12], [201050, 0.22], [383900, 0.24]],
            'Head of Household': [[16550, 0.10], [63100, 0.12], [100500, 0.22], [191950, 0.24]]
        };
        const baseBrackets = brackets[status] || brackets['Single'];

        let prev = 0;
        let remainingOrdinary = taxableOrdinary;
        
        for (const [limitBase, rate] of baseBrackets) {
            const limit = limitBase * inflationFactor;
            const range = Math.min(remainingOrdinary, limit - prev);
            tax += range * rate;
            remainingOrdinary -= range;
            prev = limit;
            if (remainingOrdinary <= 0) break;
        }
        if (remainingOrdinary > 0) tax += remainingOrdinary * 0.32;

        // 2. LTCG Tax (Stacked on top of Ordinary)
        // 0% Bracket limits (approx 2026)
        const ltcgZeroLimitMap = { 'Single': 47000, 'Married Filing Jointly': 94000, 'Head of Household': 63000 };
        const ltcgZeroLimit = (ltcgZeroLimitMap[status] || 47000) * inflationFactor;
        
        // Income that fills the buckets before LTCG
        const incomeStack = taxableOrdinary; 
        
        // Amount of LTCG that falls into 0% bucket
        const zeroBucketSpace = Math.max(0, ltcgZeroLimit - incomeStack);
        const ltcgInZero = Math.min(taxableLtcg, zeroBucketSpace);
        const ltcgInFifteen = taxableLtcg - ltcgInZero;
        
        // We assume 15% for the rest (High earners hit 20% but ignoring for lean FIRE)
        tax += (ltcgInFifteen * 0.15);

        // 3. State Tax
        const stateData = stateTaxRates[state] || { rate: 0, taxesSS: false };
        let stateTaxable = ordinaryIncome + ltcgIncome; // Most states tax Cap Gains as income
        // (Note: This simple model doesn't handle specific state deductions perfectly, but applies flat rate)
        tax += (stateTaxable * stateData.rate);

        return tax;
    },

    calculateSnapBenefit: (income, hhSize, shelterCosts, hasSUA, isDisabled, inflationFactor = 1) => {
        const monthlyGross = income / 12;
        const baseFpl = 16060 + (hhSize - 1) * 5650;
        const snapFpl = baseFpl * inflationFactor;
        const snapGrossLimit = snapFpl * 2.0; 
        if (monthlyGross > (snapGrossLimit / 12)) return 0;
        const stdDed = (hhSize <= 3 ? 205 : (hhSize === 4 ? 220 : (hhSize === 5 ? 255 : 295))) * inflationFactor;
        const adjIncome = Math.max(0, monthlyGross - stdDed);
        const suaAmt = (hasSUA ? 680 : 0) * inflationFactor; 
        const totalShelter = shelterCosts + suaAmt;
        const shelterThreshold = adjIncome / 2;
        const rawExcessShelter = Math.max(0, totalShelter - shelterThreshold);
        const shelterCap = 712 * inflationFactor; 
        const finalShelterDeduction = (isDisabled) ? rawExcessShelter : Math.min(rawExcessShelter, shelterCap);
        const netIncome = Math.max(0, adjIncome - finalShelterDeduction);
        const maxBenefit = (295 + (hhSize - 1) * 215) * inflationFactor;
        const estimatedBenefit = Math.max(0, maxBenefit - (netIncome * 0.3));
        return Math.floor(estimatedBenefit);
    },

    calculateSummaries: (data) => {
        const inv = data.investments || [];
        const re = data.realEstate || [];
        const oa = data.otherAssets || [];
        const helocs = data.helocs || [];
        const debts = data.debts || [];
        const inc = data.income || [];
        const budget = data.budget || { savings: [], expenses: [] };

        const totalAssets = inv.reduce((s, x) => s + math.fromCurrency(x.value), 0) +
                           re.reduce((s, x) => s + math.fromCurrency(x.value), 0) +
                           oa.reduce((s, x) => s + math.fromCurrency(x.value), 0);
                           
        const totalLiabilities = re.reduce((s, x) => s + math.fromCurrency(x.mortgage), 0) +
                                oa.reduce((s, x) => s + math.fromCurrency(x.loan), 0) +
                                helocs.reduce((s, h) => s + math.fromCurrency(h.balance), 0) +
                                debts.reduce((s, x) => s + math.fromCurrency(x.balance), 0);

        let total401kContribution = 0;
        let totalGrossIncome = 0; 
        
        inc.forEach(x => {
            let base = math.fromCurrency(x.amount);
            if (x.isMonthly) base *= 12;
            let annualDirectExpenses = math.fromCurrency(x.incomeExpenses);
            if (x.incomeExpensesMonthly) annualDirectExpenses *= 12;
            const bonus = base * (parseFloat(x.bonusPct) / 100 || 0);
            const personal401k = base * (parseFloat(x.contribution) / 100 || 0);
            total401kContribution += personal401k;
            totalGrossIncome += (base + bonus) - annualDirectExpenses; 
        });

        const hsaSavings = budget.savings?.filter(s => s.type === 'HSA').reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        const magiBase = totalGrossIncome - total401kContribution - hsaSavings;
        const manualSavingsSum = budget.savings?.filter(x => !x.isLocked).reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;
        const totalAnnualSavings = manualSavingsSum + total401kContribution + hsaSavings; 
        const totalAnnualBudget = budget.expenses?.reduce((s, x) => s + math.fromCurrency(x.annual), 0) || 0;

        return {
            netWorth: totalAssets - totalLiabilities,
            totalAssets, totalLiabilities, totalGrossIncome,
            magiBase,
            total401kContribution, totalAnnualSavings, totalAnnualBudget
        };
    }
};

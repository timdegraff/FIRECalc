
export const PROFILE_40_COUPLE = {
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
    assumptions: { 
        currentAge: 40, retirementAge: 55, ssStartAge: 67, ssMonthly: 3000, 
        stockGrowth: 8, cryptoGrowth: 8, metalsGrowth: 6, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Married Filing Jointly', 
        helocRate: 7, state: 'Michigan', workYearsAtRetirement: 35,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    },
    benefits: { dependents: [] }
};

export const PROFILE_25_SINGLE = {
    investments: [
        { name: 'Robinhood', type: 'Taxable', value: 15000, costBasis: 12000 },
        { name: 'Work 401k', type: 'Pre-Tax (401k/IRA)', value: 10000, costBasis: 0 },
        { name: 'Bitcoin', type: 'Crypto', value: 5000, costBasis: 2000 }
    ],
    realEstate: [],
    income: [
        { name: 'Salary', amount: 85000, increase: 4, contribution: 10, match: 3, bonusPct: 5, isMonthly: false, incomeExpenses: 0 }
    ],
    budget: {
        savings: [
            { type: 'Roth IRA', annual: 7000, monthly: 583, removedInRetirement: true },
            { type: 'Taxable', annual: 5000, monthly: 416, removedInRetirement: true }
        ],
        expenses: [
            { name: 'Rent', annual: 24000, monthly: 2000, remainsInRetirement: true, isFixed: false },
            { name: 'Lifestyle', annual: 30000, monthly: 2500, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { 
        currentAge: 25, retirementAge: 50, ssStartAge: 70, ssMonthly: 2500, 
        stockGrowth: 9, cryptoGrowth: 12, metalsGrowth: 6, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Single', 
        helocRate: 7, state: 'California', workYearsAtRetirement: 25,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    },
    benefits: { dependents: [] }
};

export const PROFILE_55_RETIREE = {
    investments: [
        { name: 'IRA Rollover', type: 'Pre-Tax (401k/IRA)', value: 850000, costBasis: 0 },
        { name: 'Roth IRA', type: 'Roth IRA', value: 150000, costBasis: 100000 },
        { name: 'HYSA', type: 'Cash', value: 100000, costBasis: 100000 },
        { name: 'Brokerage', type: 'Taxable', value: 300000, costBasis: 200000 }
    ],
    realEstate: [
        { name: 'Paid Off Home', value: 600000, mortgage: 0, principalPayment: 0 }
    ],
    income: [
        { name: 'Senior Role', amount: 200000, increase: 2, contribution: 15, match: 4, bonusPct: 10, isMonthly: false, incomeExpenses: 0 }
    ],
    budget: {
        savings: [
            { type: 'Pre-Tax (401k/IRA)', annual: 30500, monthly: 2541, removedInRetirement: true } 
        ],
        expenses: [
            { name: 'Property Tax/Ins', annual: 12000, monthly: 1000, remainsInRetirement: true, isFixed: false },
            { name: 'Living Expenses', annual: 72000, monthly: 6000, remainsInRetirement: true, isFixed: false },
            { name: 'Healthcare (Pre-Med)', annual: 18000, monthly: 1500, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { 
        currentAge: 55, retirementAge: 62, ssStartAge: 67, ssMonthly: 3800, 
        stockGrowth: 6, cryptoGrowth: 5, metalsGrowth: 4, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Married Filing Jointly', 
        helocRate: 7, state: 'Florida', workYearsAtRetirement: 38,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    },
    benefits: { dependents: [] }
};


export const PROFILE_40_COUPLE = {
    investments: [
        { name: 'His 401k (Fidelity)', type: 'Pre-Tax (401k/IRA)', value: 350000, costBasis: 0 },
        { name: 'Her 401k (Schwab)', type: 'Pre-Tax (401k/IRA)', value: 250000, costBasis: 0 },
        { name: 'Roth IRA (His)', type: 'Roth IRA', value: 150000, costBasis: 100000 },
        { name: 'Roth IRA (Hers)', type: 'Roth IRA', value: 150000, costBasis: 100000 },
        { name: 'Joint Brokerage', type: 'Taxable', value: 200000, costBasis: 150000 },
        { name: 'HSA (Invested)', type: 'HSA', value: 50000, costBasis: 35000 },
        { name: 'Emergency Cash', type: 'Cash', value: 30000, costBasis: 30000 }
    ],
    stockOptions: [
        { name: 'Company RSUs', shares: 1000, strikePrice: 0, currentPrice: 250, growth: 8, isLtcg: false }
    ],
    realEstate: [
        { name: 'Tennessee Home', value: 550000, mortgage: 250000, principalPayment: 1400 }
    ],
    income: [
        { name: 'Tech Manager', amount: 200000, increase: 3, contribution: 12, match: 4, bonusPct: 15, isMonthly: false, incomeExpenses: 0, contribOnBonus: false },
        { name: 'Medical Prof', amount: 125000, increase: 3, contribution: 10, match: 3, bonusPct: 0, isMonthly: false, incomeExpenses: 0, contribOnBonus: false }
    ],
    budget: {
        savings: [
            { type: 'Taxable', annual: 36000, monthly: 3000, removedInRetirement: true },
            { type: 'HSA', annual: 8300, monthly: 691, removedInRetirement: true }
        ],
        expenses: [
            { name: 'Mortgage P&I', annual: 24000, monthly: 2000, remainsInRetirement: true, isFixed: true },
            { name: 'Property Tax/Ins', annual: 9600, monthly: 800, remainsInRetirement: true, isFixed: false },
            { name: 'Car Payment', annual: 9600, monthly: 800, remainsInRetirement: false, isFixed: true },
            { name: 'Gas & Auto Maint', annual: 3600, monthly: 300, remainsInRetirement: true, isFixed: false },
            { name: 'Vacations/Travel', annual: 12000, monthly: 1000, remainsInRetirement: true, isFixed: false },
            { name: 'Groceries', annual: 18000, monthly: 1500, remainsInRetirement: true, isFixed: false },
            { name: 'Kids Activities/Childcare', annual: 18000, monthly: 1500, remainsInRetirement: false, isFixed: false },
            { name: 'Utilities & Misc', annual: 30200, monthly: 2517, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { 
        currentAge: 40, retirementAge: 55, ssStartAge: 67, ssMonthly: 3200, 
        stockGrowth: 8, cryptoGrowth: 8, metalsGrowth: 5, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Married Filing Jointly', 
        helocRate: 7.5, state: 'Tennessee', workYearsAtRetirement: 30,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    },
    benefits: { 
        dependents: [
            { name: "Kid 1", independenceYear: 2038 },
            { name: "Kid 2", independenceYear: 2036 },
            { name: "Kid 3", independenceYear: 2034 }
        ],
        hhSize: 5 
    }
};

export const PROFILE_25_SINGLE = {
    investments: [
        { name: 'Work 401k', type: 'Pre-Tax (401k/IRA)', value: 18000, costBasis: 0 },
        { name: 'Robinhood', type: 'Taxable', value: 12000, costBasis: 10000 },
        { name: 'Coinbase', type: 'Crypto', value: 8000, costBasis: 4000 },
        { name: 'HYSA', type: 'Cash', value: 10000, costBasis: 10000 }
    ],
    realEstate: [],
    income: [
        { name: 'Salary', amount: 120000, increase: 5, contribution: 10, match: 3, bonusPct: 8, isMonthly: false, incomeExpenses: 0, contribOnBonus: false }
    ],
    debts: [
        { name: 'Student Loans', balance: 12000, principalPayment: 250 }
    ],
    budget: {
        savings: [
            { type: 'Roth IRA', annual: 7000, monthly: 583, removedInRetirement: true },
            { type: 'Taxable', annual: 6000, monthly: 500, removedInRetirement: true }
        ],
        expenses: [
            { name: 'Rent', annual: 24000, monthly: 2000, remainsInRetirement: true, isFixed: false },
            { name: 'Utilities & Internet', annual: 4200, monthly: 350, remainsInRetirement: true, isFixed: false },
            { name: 'Car Payment & Ins', annual: 7800, monthly: 650, remainsInRetirement: false, isFixed: true },
            { name: 'Groceries', annual: 6000, monthly: 500, remainsInRetirement: true, isFixed: false },
            { name: 'Loan Payment', annual: 3000, monthly: 250, remainsInRetirement: false, isFixed: true },
            { name: 'Social/Dining', annual: 12000, monthly: 1000, remainsInRetirement: true, isFixed: false },
            { name: 'Travel', annual: 5000, monthly: 416, remainsInRetirement: true, isFixed: false },
            { name: 'Gym & Subscriptions', annual: 1800, monthly: 150, remainsInRetirement: true, isFixed: false },
            { name: 'Shopping/Tech', annual: 4000, monthly: 333, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { 
        currentAge: 25, retirementAge: 50, ssStartAge: 67, ssMonthly: 2800, 
        stockGrowth: 8, cryptoGrowth: 8, metalsGrowth: 5, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Single', 
        helocRate: 7, state: 'Texas', workYearsAtRetirement: 23,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 15
    },
    benefits: { dependents: [] }
};

export const PROFILE_55_RETIREE = {
    investments: [
        { name: '401k (Career)', type: 'Pre-Tax (401k/IRA)', value: 1900000, costBasis: 0 },
        { name: 'Roth IRA', type: 'Roth IRA', value: 400000, costBasis: 250000 },
        { name: 'Money Market', type: 'Cash', value: 50000, costBasis: 50000 }
    ],
    realEstate: [
        { name: 'Florida Home (Paid Off)', value: 600000, mortgage: 0, principalPayment: 0 }
    ],
    income: [
        { name: 'Executive Salary', amount: 250000, increase: 2, contribution: 20, match: 4, bonusPct: 15, isMonthly: false, incomeExpenses: 0, remainsInRetirement: false, contribOnBonus: false },
        { name: 'Corporate Pension', amount: 48000, increase: 0, contribution: 0, match: 0, bonusPct: 0, isMonthly: false, incomeExpenses: 0, remainsInRetirement: true }
    ],
    budget: {
        savings: [
            { type: 'Pre-Tax (401k/IRA)', annual: 30500, monthly: 2541, removedInRetirement: true }, 
            { type: 'Taxable', annual: 60000, monthly: 5000, removedInRetirement: true } 
        ],
        expenses: [
            { name: 'Property Tax/Ins', annual: 14400, monthly: 1200, remainsInRetirement: true, isFixed: false },
            { name: 'Healthcare (Pre-Medicare)', annual: 30000, monthly: 2500, remainsInRetirement: true, isFixed: false },
            { name: 'High-End Travel', annual: 48000, monthly: 4000, remainsInRetirement: true, isFixed: false },
            { name: 'Living Expenses', annual: 72000, monthly: 6000, remainsInRetirement: true, isFixed: false },
            { name: 'Club Dues', annual: 12000, monthly: 1000, remainsInRetirement: true, isFixed: false }
        ]
    },
    assumptions: { 
        currentAge: 55, retirementAge: 60, ssStartAge: 67, ssMonthly: 4200, 
        stockGrowth: 8, cryptoGrowth: 8, metalsGrowth: 5, realEstateGrowth: 3, 
        inflation: 3, filingStatus: 'Married Filing Jointly', 
        helocRate: 7, state: 'Florida', workYearsAtRetirement: 38,
        slowGoFactor: 1.0, midGoFactor: 0.9, noGoFactor: 0.8,
        advancedGrowth: false,
        ltcgRate: 20 
    },
    benefits: { dependents: [] }
};

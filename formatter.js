import { math } from './utils.js';

export const formatter = {
    formatCurrency: (value, isCompact = false, decimals = 0) => math.toCurrency(value, isCompact, decimals),
    
    updateZeroState: (input) => {
        const val = math.fromCurrency(input.value);
        if (val === 0) input.classList.add('value-zero');
        else input.classList.remove('value-zero');
    },

    bindCurrencyEventListeners: (input) => {
        if (!input) return;
        
        input.addEventListener('blur', (e) => {
            const raw = e.target.value;
            const decimals = parseInt(e.target.dataset.decimals) || 0;
            const val = (raw === '' || raw === '.') ? 0 : math.fromCurrency(raw);
            e.target.value = math.toCurrency(val, false, decimals);
            formatter.updateZeroState(e.target);
        });

        input.addEventListener('focus', (e) => {
            const val = math.fromCurrency(e.target.value);
            const decimals = parseInt(e.target.dataset.decimals) || 0;
            e.target.value = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
            e.target.classList.remove('value-zero');
            setTimeout(() => e.target.select(), 0);
        });
        
        formatter.updateZeroState(input);
    },

    bindNumberEventListeners: (input) => {
        if (!input) return;
        const isPercent = input.dataset.type === 'percent';

        input.addEventListener('blur', (e) => {
            const decimals = e.target.dataset.decimals !== undefined ? parseInt(e.target.dataset.decimals) : null;
            let val = parseFloat(e.target.value.replace(/[^0-9.-]+/g, "")) || 0;
            if (decimals !== null) {
                val = parseFloat(val.toFixed(decimals));
            }
            e.target.value = isPercent ? val + '%' : val;
            if (val === 0) e.target.classList.add('value-zero');
            else e.target.classList.remove('value-zero');
        });

        input.addEventListener('focus', (e) => {
            const val = parseFloat(e.target.value.replace(/[^0-9.-]+/g, "")) || 0;
            e.target.value = val;
            e.target.classList.remove('value-zero');
            setTimeout(() => e.target.select(), 0);
        });

        // Initial Formatting
        const initialVal = parseFloat(input.value.replace(/[^0-9.-]+/g, "")) || 0;
        input.value = isPercent ? initialVal + '%' : initialVal;
        if (initialVal === 0) input.classList.add('value-zero');
    }
};
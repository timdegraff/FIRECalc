
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
            // On focus, show raw value with decimals if requested
            const decimals = parseInt(e.target.dataset.decimals) || 0;
            if (val === 0) {
                e.target.value = '';
            } else {
                e.target.value = decimals > 0 ? val.toFixed(decimals) : Math.round(val);
            }
            e.target.classList.remove('value-zero');
        });
        
        // Initial state check
        formatter.updateZeroState(input);
    },

    bindNumberEventListeners: (input) => {
        if (!input) return;
        input.addEventListener('blur', (e) => {
            const val = parseFloat(e.target.value) || 0;
            if (val === 0) e.target.classList.add('value-zero');
            else e.target.classList.remove('value-zero');
        });
        input.addEventListener('focus', (e) => {
            e.target.classList.remove('value-zero');
        });
        const val = parseFloat(input.value) || 0;
        if (val === 0) input.classList.add('value-zero');
    }
};

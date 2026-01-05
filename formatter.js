
import { math } from './utils.js';

export const formatter = {
    formatCurrency: (value, isCompact = false) => math.toCurrency(value, isCompact),
    
    bindCurrencyEventListeners: (input) => {
        if (!input) return;
        input.addEventListener('blur', (e) => {
            const val = math.fromCurrency(e.target.value);
            e.target.value = math.toCurrency(val);
        });
        input.addEventListener('focus', (e) => {
            const val = math.fromCurrency(e.target.value);
            e.target.value = val === 0 ? '' : val;
        });
    }
};

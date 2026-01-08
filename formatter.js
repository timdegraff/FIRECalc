
import { math } from './utils.js';

export const formatter = {
    formatCurrency: (value, isCompact = false) => math.toCurrency(value, isCompact),
    
    bindCurrencyEventListeners: (input) => {
        if (!input) return;
        
        // Remove existing listeners to prevent duplicates if bound multiple times
        // Note: anonymous functions can't be removed easily, but this setup ensures
        // we're attaching fresh logic. Ideally, use named handlers if rebinding is frequent.
        // For this app, rows are usually created once or re-created entirely.
        
        input.addEventListener('blur', (e) => {
            const raw = e.target.value;
            // If empty or just a dot, treat as 0
            const val = (raw === '' || raw === '.') ? 0 : math.fromCurrency(raw);
            e.target.value = math.toCurrency(val);
        });

        input.addEventListener('focus', (e) => {
            const val = math.fromCurrency(e.target.value);
            // If value is 0, clear it so user can type. Otherwise show raw number for editing.
            e.target.value = val === 0 ? '' : val;
        });
    }
};

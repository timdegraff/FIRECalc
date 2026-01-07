
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
// Increment this timestamp to force a one-time reload on all devices
const APP_VERSION = "2026.1.5"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

if (currentSavedVersion !== APP_VERSION) {
    localStorage.setItem('firecalc_app_version', APP_VERSION);
    // Hard refresh to clear browser cache for mobile
    window.location.reload();
}
// ---------------------------

initializeUI();
benefits.init();
burndown.init();

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        document.getElementById('user-avatar').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || '';
        await initializeData(user);
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});


import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
// Increment this timestamp to force a one-time reload on all devices
const APP_VERSION = "1.6"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

if (currentSavedVersion !== APP_VERSION) {
    localStorage.setItem('firecalc_app_version', APP_VERSION);
    // Clear session storage to fix "missing initial state" firebase errors on mobile
    sessionStorage.clear();
    // Hard refresh to clear browser cache for mobile
    window.location.reload();
}

// Link version to UI
const verLabel = document.getElementById('app-version-label');
if (verLabel) {
    verLabel.textContent = `v${APP_VERSION}`;
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

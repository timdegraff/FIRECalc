
import { onAuthStateChanged, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "1.7"; // Bumped version for Brave fix
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

if (currentSavedVersion !== APP_VERSION) {
    localStorage.setItem('firecalc_app_version', APP_VERSION);
    sessionStorage.clear();
    window.location.reload();
}

const verLabel = document.getElementById('app-version-label');
if (verLabel) verLabel.textContent = `v${APP_VERSION}`;

initializeUI();
benefits.init();
burndown.init();

// Handle Redirect Results (Required for Brave/Safari compatibility)
getRedirectResult(auth).catch((error) => {
    if (error.code === 'auth/cross-origin-isolated-biometric-auth-not-supported') return;
    console.error("Redirect Error:", error);
});

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

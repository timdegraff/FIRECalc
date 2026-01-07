
import { onAuthStateChanged, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "1.8"; // Brave redirect fix version
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

// Use a flag to track if we are waiting for a redirect response
let isRedirecting = true;

getRedirectResult(auth).then(() => {
    isRedirecting = false;
}).catch((error) => {
    isRedirecting = false;
    if (error.code === 'auth/cross-origin-isolated-biometric-auth-not-supported') return;
    console.error("Redirect Error:", error);
});

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    // If a redirect is still being processed, don't show the login screen yet
    if (!user && isRedirecting) {
        if (loginScreen) loginScreen.innerHTML = '<div class="text-white font-bold animate-pulse uppercase tracking-widest">Validating Session...</div>';
        return;
    }

    if (user) {
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    } else {
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            // Restore original login button if it was replaced by 'Validating' text
            if (loginScreen.innerHTML.includes('Validating')) {
                window.location.reload(); 
            }
        }
        if (appContainer) appContainer.classList.add('hidden');
    }
});

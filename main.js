
import { onAuthStateChanged, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "1.9"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

// Handle Redirect Results (Required for Brave/Safari compatibility)
let isRedirecting = true;

getRedirectResult(auth).then(() => {
    isRedirecting = false;
    // Only reload for version update AFTER we check if we're redirecting
    if (currentSavedVersion !== APP_VERSION) {
        localStorage.setItem('firecalc_app_version', APP_VERSION);
        sessionStorage.clear();
        window.location.reload();
    }
}).catch((error) => {
    isRedirecting = false;
    console.error("Redirect Error:", error);
});

initializeUI();
benefits.init();
burndown.init();

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    } else {
        // If we are still waiting for the redirect result, don't show the login button yet
        if (isRedirecting) {
            if (loginScreen) loginScreen.innerHTML = `
                <div class="p-8 text-center w-full">
                    <h1 class="text-4xl font-black mb-2 text-white tracking-tighter">FIRECalc</h1>
                    <div class="flex items-center justify-center gap-3 text-blue-500 font-bold uppercase tracking-widest text-xs mt-8">
                        <i class="fas fa-circle-notch fa-spin"></i>
                        Authenticating...
                    </div>
                </div>`;
            return;
        }
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            // If the innerHTML was replaced by the 'Authenticating' message, restore it
            if (loginScreen.innerHTML.includes('Authenticating')) {
                window.location.reload();
            }
        }
        if (appContainer) appContainer.classList.add('hidden');
    }
});

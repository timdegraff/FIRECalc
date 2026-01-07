
import { onAuthStateChanged, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "2.1"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

// Handle Redirect Results (Required for Brave/Safari compatibility)
// We check session storage because getRedirectResult can sometimes take a moment to fire
let isRedirecting = sessionStorage.getItem('fc_redirect_active') === 'true';

// SAFETY VALVE: If we think we are redirecting but nothing happens for 10 seconds, reset.
if (isRedirecting) {
    setTimeout(() => {
        const loadingEl = document.getElementById('login-screen');
        // If we are still showing "Authenticating..." after 10s, something went wrong (Safari ITP dropped token).
        if (loadingEl && !loadingEl.classList.contains('hidden') && loadingEl.innerHTML.includes('Authenticating')) {
            console.warn("Redirect timeout reached. Resetting auth state.");
            sessionStorage.removeItem('fc_redirect_active');
            window.location.reload();
        }
    }, 10000);
}

getRedirectResult(auth).then((result) => {
    // Once getRedirectResult resolves (even if user is null), we are no longer "redirecting"
    sessionStorage.removeItem('fc_redirect_active');
    isRedirecting = false;
    
    if (currentSavedVersion !== APP_VERSION) {
        localStorage.setItem('firecalc_app_version', APP_VERSION);
        sessionStorage.clear();
        window.location.reload();
    }
}).catch((error) => {
    sessionStorage.removeItem('fc_redirect_active');
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
        sessionStorage.removeItem('fc_redirect_active');
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    } else {
        // If we suspect a redirect is still in progress, STICK to the loading screen
        if (isRedirecting) {
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
                loginScreen.innerHTML = `
                    <div class="p-8 text-center w-full">
                        <h1 class="text-4xl font-black mb-2 text-white tracking-tighter">FIRECalc</h1>
                        <div class="flex items-center justify-center gap-3 text-blue-500 font-bold uppercase tracking-widest text-xs mt-8">
                            <i class="fas fa-circle-notch fa-spin text-lg"></i>
                            Authenticating...
                        </div>
                        <p class="text-[9px] text-slate-600 uppercase mt-4">Waiting for Google Handshake</p>
                    </div>`;
            }
            return;
        }
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            // If the innerHTML was replaced by the 'Authenticating' message, refresh the login UI to show buttons again
            if (loginScreen.innerHTML.includes('Authenticating')) {
                 window.location.reload(); 
            }
        }
        if (appContainer) appContainer.classList.add('hidden');
    }
});

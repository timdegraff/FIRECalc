
import { onAuthStateChanged, getRedirectResult } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "2.2"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

// Check for redirect flag
let isRedirecting = sessionStorage.getItem('fc_redirect_active') === 'true';

// SAFETY VALVE: If we are "redirecting" but it takes too long (Safari ITP issue), 
// clear the flag and reload to show the login button again.
if (isRedirecting) {
    setTimeout(() => {
        // If we are still on the loading screen after 4000ms, assume failure.
        const loginScreen = document.getElementById('login-screen');
        if (loginScreen && !loginScreen.classList.contains('hidden')) {
            console.warn("Auth took too long. Resetting state.");
            sessionStorage.removeItem('fc_redirect_active');
            window.location.reload();
        }
    }, 4000);
}

// Handle the redirect result promise (Standard Firebase Flow)
getRedirectResult(auth).then(() => {
    sessionStorage.removeItem('fc_redirect_active');
    
    // Check version update only after auth check settles
    if (currentSavedVersion !== APP_VERSION) {
        localStorage.setItem('firecalc_app_version', APP_VERSION);
        sessionStorage.clear();
        window.location.reload();
    }
}).catch((error) => {
    sessionStorage.removeItem('fc_redirect_active');
    console.error("Redirect Error:", error);
});

initializeUI();
benefits.init();
burndown.init();

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        // User is logged in
        sessionStorage.removeItem('fc_redirect_active'); // Ensure flag is gone
        
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    } else {
        // User is NOT logged in
        if (sessionStorage.getItem('fc_redirect_active') === 'true') {
            // We are expecting a redirect result, so show "Authenticating..."
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
                loginScreen.innerHTML = `
                    <div class="p-8 text-center w-full">
                        <h1 class="text-4xl font-black mb-2 text-white tracking-tighter">FIRECalc</h1>
                        <div class="flex items-center justify-center gap-3 text-blue-500 font-bold uppercase tracking-widest text-xs mt-8">
                            <i class="fas fa-circle-notch fa-spin text-lg"></i>
                            Authenticating...
                        </div>
                    </div>`;
            }
        } else {
            // We are NOT expecting a redirect, show normal Login Button
            if (loginScreen) {
                loginScreen.classList.remove('hidden');
                // Restore original HTML if it was overwritten
                if (loginScreen.innerHTML.includes('Authenticating')) {
                    loginScreen.innerHTML = `
                        <div class="bg-slate-800 p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
                            <h1 class="text-4xl font-black mb-2 text-white tracking-tighter">FIRECalc</h1>
                            <p class="text-slate-400 mb-8 font-medium">Your retirement planner.</p>
                            <button id="login-btn" class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6" alt="Google">
                                Sign in with Google
                            </button>
                        </div>
                    `;
                    document.getElementById('login-btn').onclick = (await import('./auth.js')).signInWithGoogle;
                }
            }
            if (appContainer) appContainer.classList.add('hidden');
        }
    }
});

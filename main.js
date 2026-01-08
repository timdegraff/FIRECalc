
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { signInWithGooglePopup } from './auth.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

// --- VERSION CHECK LOGIC ---
const APP_VERSION = "2.3"; 
const currentSavedVersion = localStorage.getItem('firecalc_app_version');

if (currentSavedVersion !== APP_VERSION) {
    localStorage.setItem('firecalc_app_version', APP_VERSION);
    sessionStorage.clear();
    // We do NOT reload here to prevent loops, we just update the storage
    // and let the next natural reload handle it, or relies on cache busting query param.
}

// Initialize Modules
initializeUI();
benefits.init();
burndown.init();

// --- AUTH STATE LISTENER ---
// This is the source of truth. No manual flags needed.
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        // --- LOGGED IN ---
        const avatar = document.getElementById('user-avatar');
        if (avatar) avatar.src = user.photoURL || '';
        const name = document.getElementById('user-name');
        if (name) name.textContent = user.displayName || '';
        
        await initializeData(user);
        
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    } else {
        // --- LOGGED OUT ---
        if (appContainer) appContainer.classList.add('hidden');
        
        if (loginScreen) {
            loginScreen.classList.remove('hidden');
            // Render the Desktop Login View (Popup Logic)
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
            document.getElementById('login-btn').onclick = signInWithGooglePopup;
        }
    }
});

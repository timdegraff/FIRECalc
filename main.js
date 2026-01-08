
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
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
}

// Initialize Modules
initializeUI();
benefits.init();
burndown.init();

// --- AUTH STATE LISTENER ---
onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const guestModeActive = localStorage.getItem('firecalc_guest_mode') === 'true';

    // 1. Authenticated User
    if (user) {
        // Disable guest mode if we logged in
        localStorage.removeItem('firecalc_guest_mode');
        
        setupAppHeader(user.photoURL, user.displayName, "Logout");
        await initializeData(user);
        
        showApp();
    } 
    // 2. Guest Mode Active
    else if (guestModeActive) {
        setupAppHeader(null, "Guest User", "Exit Guest Mode");
        await initializeData(null); // Initialize with null user -> triggers LocalStorage path
        
        // Visual indicator for guest mode
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
            indicator.innerHTML = '<i class="fas fa-hdd"></i>';
            indicator.title = "Saved to this device only";
        }
        
        showApp();

        // 2a. Check for Guest Acknowledgement
        if (!localStorage.getItem('firecalc_guest_acknowledged')) {
            const modal = document.getElementById('guest-modal');
            const btn = document.getElementById('ack-guest-btn');
            if (modal && btn) {
                modal.classList.remove('hidden');
                btn.onclick = () => {
                    localStorage.setItem('firecalc_guest_acknowledged', 'true');
                    modal.classList.add('hidden');
                };
            }
        }
    }
    // 3. Logged Out / Initial State
    else {
        hideApp();
        renderLoginScreen();
    }

    function showApp() {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
    }

    function hideApp() {
        if (appContainer) appContainer.classList.add('hidden');
        if (loginScreen) loginScreen.classList.remove('hidden');
    }
});

function setupAppHeader(avatarUrl, userName, logoutText) {
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
        avatar.src = avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    }
    const name = document.getElementById('user-name');
    if (name) name.textContent = userName || 'Guest';
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.textContent = logoutText;
        logoutBtn.onclick = handleLogoutOrExit;
    }
}

async function handleLogoutOrExit() {
    // If guest mode is active, clear it
    if (localStorage.getItem('firecalc_guest_mode') === 'true') {
        localStorage.removeItem('firecalc_guest_mode');
        window.location.reload();
    } else {
        // Standard Firebase Logout
        try {
            const { logoutUser } = await import('./auth.js');
            await logoutUser();
        } catch (e) {
            console.error(e);
        }
    }
}

function enableGuestMode() {
    localStorage.setItem('firecalc_guest_mode', 'true');
    // Reload to trigger the "Guest Mode Active" path in onAuthStateChanged
    window.location.reload();
}

function renderLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    if (!loginScreen) return;

    loginScreen.innerHTML = `
        <div class="bg-slate-800 p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full border border-slate-700">
            <h1 class="text-4xl font-black mb-2 text-white tracking-tighter">FIRECalc</h1>
            <p class="text-slate-400 mb-8 font-medium">Your retirement planner.</p>
            
            <button id="login-btn" class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-3 mb-4">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6" alt="Google">
                Sign in with Google
            </button>

            <div class="relative flex py-2 items-center">
                <div class="flex-grow border-t border-slate-700"></div>
                <span class="flex-shrink-0 mx-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest">Or</span>
                <div class="flex-grow border-t border-slate-700"></div>
            </div>

            <button id="guest-btn" class="w-full py-3 mt-4 bg-transparent border border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 rounded-xl font-bold transition-all text-sm uppercase tracking-wider">
                Continue as Guest
            </button>
            
            <p class="text-[10px] text-slate-600 mt-4 leading-relaxed">
                Guest data is stored on this device only. <br>Sign in later to sync to the cloud (note: this will replace guest data).
            </p>
        </div>
    `;
    
    document.getElementById('login-btn').onclick = signInWithGooglePopup;
    document.getElementById('guest-btn').onclick = enableGuestMode;
}

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from './firebase-config.js';
import { signInWithGooglePopup } from './auth.js';
import { initializeUI } from './core.js';
import { initializeData, updateSummaries } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';
import { projection } from './projection.js';
import { PROFILE_25_SINGLE, PROFILE_40_COUPLE, PROFILE_55_RETIREE } from './profiles.js';

// --- DEVELOPER / RESET MODE ---
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('reset') === 'true') {
    ['firecalc_guest_data', 'firecalc_guest_acknowledged', 'firecalc_guest_mode', 'firecalc_guest_profile_selected', 'firecalc_app_version'].forEach(k => localStorage.removeItem(k));
    window.location.href = window.location.pathname;
}

// Module init
initializeUI();
benefits.init();
burndown.init();
projection.init();

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const guestModeActive = localStorage.getItem('firecalc_guest_mode') === 'true';

    if (user) {
        localStorage.removeItem('firecalc_guest_mode');
        setupAppHeader(user.photoURL, user.displayName, "Logout", true);
        try {
            await initializeData(user);
            showApp();
        } catch (e) {
            console.error("Critical Init Error:", e);
            alert("App failed to initialize. Please refresh.");
        }
    } 
    else if (guestModeActive) {
        setupAppHeader(null, null, "Exit Guest Mode", false);
        const hasAcknowledged = localStorage.getItem('firecalc_guest_acknowledged') === 'true';
        const hasSelectedProfile = localStorage.getItem('firecalc_guest_profile_selected') === 'true';

        if (!hasAcknowledged) {
            const modal = document.getElementById('guest-modal');
            const btn = document.getElementById('ack-guest-btn');
            if (modal && btn) {
                modal.classList.remove('hidden');
                btn.onclick = () => { localStorage.setItem('firecalc_guest_acknowledged', 'true'); modal.classList.add('hidden'); showProfileSelection(); };
            }
        } else if (!hasSelectedProfile) {
            showProfileSelection();
        } else {
            await initializeData(null);
            showApp();
        }
    }
    else {
        renderLoginScreen();
    }

    function showApp() {
        if (loginScreen) loginScreen.classList.add('hidden');
        if (appContainer) appContainer.classList.remove('hidden');
        updateSummaries();
    }
});

function showProfileSelection() {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.querySelectorAll('button').forEach(b => {
        b.onclick = async () => {
            const type = b.dataset.profile;
            const data = type === '25' ? PROFILE_25_SINGLE : (type === '55' ? PROFILE_55_RETIREE : PROFILE_40_COUPLE);
            localStorage.setItem('firecalc_guest_data', JSON.stringify(data));
            localStorage.setItem('firecalc_guest_profile_selected', 'true');
            modal.classList.add('hidden');
            await initializeData(null);
            document.getElementById('login-screen').classList.add('hidden');
            document.getElementById('app-container').classList.remove('hidden');
        };
    });
}

function setupAppHeader(avatarUrl, userName, logoutText, isLoggedIn) {
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.src = avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E";
    const name = document.getElementById('user-name');
    if (name) name.textContent = userName || "Guest User";
    
    // Indicator Update
    const saveInd = document.getElementById('save-indicator');
    if (saveInd) {
        const icon = saveInd.querySelector('i');
        if (isLoggedIn) {
            saveInd.className = "flex-1 py-1.5 bg-white/5 rounded-lg text-center flex items-center justify-center gap-1 border border-white/5 text-slate-600 transition-colors duration-200";
            icon.className = "fas fa-cloud text-xs";
            saveInd.title = "Cloud Synced";
        } else {
            // Guest mode: Red cloud with diagonal line
            saveInd.className = "flex-1 py-1.5 bg-white/5 rounded-lg text-center flex items-center justify-center gap-1 border border-white/5 text-red-500 transition-colors duration-200";
            icon.className = "fas fa-cloud-slash text-xs";
            saveInd.title = "Local Only (No Cloud Sync)";
        }
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.textContent = logoutText;
        logoutBtn.onclick = async () => {
            if (localStorage.getItem('firecalc_guest_mode') === 'true') {
                localStorage.removeItem('firecalc_guest_mode');
                window.location.reload();
            } else {
                const { logoutUser } = await import('./auth.js');
                await logoutUser();
            }
        };
    }
}

function renderLoginScreen() {
    const screen = document.getElementById('login-screen');
    if (!screen) return;
    screen.innerHTML = `<div class="bg-slate-800 p-10 rounded-3xl text-center max-w-sm w-full border border-slate-700">
        <h1 class="text-4xl font-black mb-2 text-white">FIRECalc</h1>
        <p class="text-slate-400 mb-8">Your retirement planner.</p>
        <button id="login-btn" class="w-full py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-3 mb-4">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" class="w-6" alt="Google">Sign in with Google
        </button>
        <button id="guest-btn" class="w-full py-3 bg-transparent border border-slate-600 text-slate-400 rounded-xl font-bold uppercase tracking-wider text-xs">Continue as Guest</button>
    </div>`;
    document.getElementById('login-btn').onclick = signInWithGooglePopup;
    document.getElementById('guest-btn').onclick = () => { localStorage.setItem('firecalc_guest_mode', 'true'); window.location.reload(); };
}
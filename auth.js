
import { GoogleAuthProvider, signInWithRedirect, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: 'select_account'
});

export async function signInWithGoogle() {
    try {
        // Essential for Safari/Brave: Mark that we are leaving the app for a redirect
        sessionStorage.setItem('fc_redirect_active', 'true');
        
        // CRITICAL: Force local persistence. This makes the session survive 
        // browser restarts and tab closures, which is vital for mobile PWA-like behavior.
        await setPersistence(auth, browserLocalPersistence);
        
        await signInWithRedirect(auth, provider);
    } catch (error) {
        // If the redirect initiation fails, clear the flag immediately
        sessionStorage.removeItem('fc_redirect_active');
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. Please ensure cookies are enabled and you aren't in 'Private' mode.");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        // Nuclear option: Clear local storage (except maybe version) to ensure clean slate
        const version = localStorage.getItem('firecalc_app_version');
        localStorage.clear();
        if (version) localStorage.setItem('firecalc_app_version', version);
        window.location.reload();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

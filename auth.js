
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
        
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
    } catch (error) {
        sessionStorage.removeItem('fc_redirect_active');
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. Please ensure cookies are enabled and you aren't in 'Private' mode.");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.removeItem('firecalc_app_version'); 
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

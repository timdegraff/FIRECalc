
import { GoogleAuthProvider, signInWithRedirect, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();

provider.setCustomParameters({
    prompt: 'select_account'
});

export async function signInWithGoogle() {
    try {
        // Set a flag so we know to show a loading spinner on the next load
        sessionStorage.setItem('fc_redirect_active', 'true');
        
        // Ensure the session persists across browser restarts
        await setPersistence(auth, browserLocalPersistence);
        
        await signInWithRedirect(auth, provider);
    } catch (error) {
        // If immediate failure, clear flag and alert
        sessionStorage.removeItem('fc_redirect_active');
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. Please ensure cookies are enabled.");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.removeItem('fc_redirect_active');
        localStorage.removeItem('firecalc_app_version'); // Clear version to force fresh load next time
        window.location.reload();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

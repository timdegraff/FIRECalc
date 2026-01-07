
import { GoogleAuthProvider, signInWithRedirect, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();

// Force account selection screen
provider.setCustomParameters({
    prompt: 'select_account'
});

export async function signInWithGoogle() {
    try {
        // Redirect is significantly more reliable in Brave and Safari
        // as it avoids third-party window communication blocks.
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
        // Note: Execution stops here as the browser redirects.
    } catch (error) {
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. If Brave Shields are on 'Aggressive', please set them to 'Standard' or use a direct browser like Safari/Chrome.");
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.clear();
        localStorage.removeItem('firecalc_app_version'); // Clear version to force clean state on next visit
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

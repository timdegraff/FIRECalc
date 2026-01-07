
import { GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();

// Force the account selection screen every time the user clicks login.
// This prevents the browser from automatically using the existing Google session 
// to sign in without user interaction after they have explicitly logged out.
provider.setCustomParameters({
    prompt: 'select_account'
});

export async function signInWithGoogle() {
    try {
        // Force local persistence to avoid sessionStorage partitioning issues on mobile/in-app browsers
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error) {
        console.error('Error signing in with Google:', error);
        alert("Sign-in failed. If you are in an in-app browser (like Instagram/Facebook), please open in Safari or Chrome.");
        return null;
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        sessionStorage.clear(); // Ensure clean slate on logout
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

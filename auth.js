
import { GoogleAuthProvider, signInWithRedirect, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// Mobile Redirect (Legacy/Fallback)
export async function signInWithGoogle() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. Please retry.");
    }
}

// Universal Popup (Preferred for Desktop & Mobile Safari ITP)
export async function signInWithGooglePopup() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error initiating popup sign-in:', error);
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
             alert("Popup blocked. Please check your browser settings or try 'Private' mode.");
        } else {
             alert(`Sign-in failed (${error.code}).`);
        }
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        localStorage.removeItem('firecalc_app_version'); 
        window.location.reload();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

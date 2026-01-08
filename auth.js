
import { GoogleAuthProvider, signInWithRedirect, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// Mobile / Default: Use Redirect
export async function signInWithGoogle() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithRedirect(auth, provider);
    } catch (error) {
        console.error('Error initiating redirect sign-in:', error);
        alert("Sign-in failed. Please retry.");
    }
}

// Desktop: Use Popup (Prevents redirect loops completely)
export async function signInWithGooglePopup() {
    try {
        await setPersistence(auth, browserLocalPersistence);
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error initiating popup sign-in:', error);
        // Fallback to redirect if popup is blocked
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
             await signInWithGoogle();
        } else {
             alert("Sign-in failed. Please retry.");
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

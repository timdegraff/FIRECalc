
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { initializeUI } from './core.js';
import { initializeData } from './data.js';
import { benefits } from './benefits.js';
import { burndown } from './burndown.js';

initializeUI();
benefits.init();
burndown.init();

onAuthStateChanged(auth, async (user) => {
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');

    if (user) {
        document.getElementById('user-avatar').src = user.photoURL || '';
        document.getElementById('user-name').textContent = user.displayName || '';
        await initializeData(user);
        loginScreen.classList.add('hidden');
        appContainer.classList.remove('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

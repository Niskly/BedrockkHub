// Import the single, shared supabase client
import { supabase } from './supabase-client.js';

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">${avatarContent}<span>${profile.username}</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="dropdown-content">
                <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        </div>`;
    document.querySelector('.user-menu-btn').addEventListener('click', () => document.querySelector('.dropdown-content').classList.toggle('show'));
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });
}

function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
}

async function initializeAuth() {
    const isLinking = sessionStorage.getItem('isLinkingMicrosoft') === 'true';
    const protectedPages = ['/settings.html', '/profile.html'];
    const publicAuthPages = ['/login.html', '/signup.html', '/verify.html', '/forgot-password.html', '/update-password.html', '/complete-profile.html'];
    const currentPath = window.location.pathname;
    const isProtectedPage = protectedPages.some(page => currentPath.endsWith(page));
    const isPublicAuthPage = publicAuthPages.some(page => currentPath.endsWith(page));
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
        if (isProtectedPage) window.location.replace('/login.html');
        else renderLoginButton();
        document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null, profile: null } }));
        return;
    }
    if (!session) {
        if (isProtectedPage && !isLinking) {
            window.location.replace('/login.html');
        } else {
            renderLoginButton();
        }
        document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null, profile: null } }));
        return;
    }
    const user = session.user;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    if (profileError && profileError.code !== 'PGRST116' && !isLinking) {
        await supabase.auth.signOut();
        renderLoginButton();
        document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null, profile: null } }));
        return;
    }
    const isProfileComplete = profile && profile.username;
    if (isProfileComplete && isPublicAuthPage) {
        window.location.replace('/');
        return;
    }
    if (!isProfileComplete && !currentPath.endsWith('/complete-profile.html') && !isPublicAuthPage && !isLinking) {
        window.location.replace('/complete-profile.html');
        return;
    }
    if (isProfileComplete) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user, profile } }));
}
initializeAuth();
supabase.auth.onAuthStateChange((_event, session) => {
    initializeAuth();
});

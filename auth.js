import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');
let authInitialized = false;

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">`
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;

    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">${avatarContent}<span>${profile.username}</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="dropdown-content">
                <a href="/settings"><i class="fa-solid fa-cog"></i> Settings</a>
                <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        </div>`;

    document.querySelector('.user-menu-btn').addEventListener('click', () => {
        document.querySelector('.dropdown-content').classList.toggle('show');
    });

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/login';
    });
}

function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
}

async function initializeAuth() {
    if (authInitialized) return;
    authInitialized = true;

    const publicPages = [
        '/',
        '/texturepacks',
        '/login',
        '/signup',
        '/complete-profile'
    ];

    const restrictedPages = [
        '/verify',
        '/update-password',
        '/settings'
    ];

    const currentPath = window.location.pathname.replace(/\/$/, '');
    const isPublicPage = publicPages.includes(currentPath);
    const isRestrictedPage = restrictedPages.includes(currentPath);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
        if (isRestrictedPage) {
            window.location.replace('/login');
            return;
        }
        renderLoginButton();
        return;
    }

    const user = session.user;
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, date_of_birth, avatar_url')
        .eq('id', user.id)
        .single();

    const requiredFields = ['username', 'date_of_birth'];
    const isProfileComplete = profile && requiredFields.every(field => profile[field]);

    if (!isProfileComplete && !isPublicPage && currentPath !== '/complete-profile') {
        window.location.replace('/complete-profile');
        return;
    }

    if (isProfileComplete && currentPath === '/complete-profile') {
        window.location.replace('/');
        return;
    }

    if (isProfileComplete) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
}

document.addEventListener('DOMContentLoaded', initializeAuth);
supabase.auth.onAuthStateChange((_event, session) => {
    initializeAuth();
});

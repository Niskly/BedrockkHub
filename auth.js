import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
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
    document.querySelector('.user-menu-btn').addEventListener('click', () => document.querySelector('.dropdown-content').classList.toggle('show'));
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

// --- THIS IS THE NEW, UNIFIED AUTH LOGIC ---
async function initializeAuth() {
    // Pages that are part of the auth flow
    const publicAuthPages = ['/login', '/signup', '/verify', '/forgot-password', '/update-password', '/complete-profile'];
    // Pages accessible to users even with an incomplete profile
    const allowedWhileIncomplete = ['/', '/texturepacks', ...publicAuthPages];

    const currentPath = window.location.pathname;

    // Check if the current page is one of the allowed ones
    const isAllowedPage = allowedWhileIncomplete.some(page =>
        currentPath === page ||
        currentPath.endsWith(page + '.html') ||
        (page === '/' && (currentPath === '' || currentPath === '/index.html'))
    );
    
    // Check if the current page is a specific auth page (for redirecting completed users)
    const isPublicAuthPage = publicAuthPages.some(page => 
        currentPath === page || 
        currentPath.endsWith(page + '.html')
    );

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("Error getting session:", sessionError);
        renderLoginButton();
        return;
    }

    if (!session) {
        renderLoginButton();
        return;
    }

    const user = session.user;
    const { data: profile, error: profileError } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();

    if (profileError && profileError.code !== 'PGRST116') { // Ignore "no rows found" error for new users
        console.error("Error getting profile:", profileError);
        await supabase.auth.signOut();
        renderLoginButton();
        return;
    }

    const isProfileComplete = profile && profile.username;

    // --- REVISED REDIRECT LOGIC ---
    // 1. If profile IS complete and user is on an auth page, send them to the homepage.
    if (isProfileComplete && isPublicAuthPage) {
        window.location.replace('/');
        return;
    }
    
    // 2. If profile IS NOT complete and user is on a page that is NOT allowed, send them to complete their profile.
    if (!isProfileComplete && !isAllowedPage) {
        window.location.replace('/complete-profile');
        return;
    }

    // --- RENDER UI LOGIC ---
    if (isProfileComplete) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
}

// Run the initialization
document.addEventListener('DOMContentLoaded', initializeAuth);

// Also listen for any future changes
supabase.auth.onAuthStateChange((_event, session) => {
    initializeAuth();
});

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI讖iIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
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
    document.querySelector('.user-menu-btn')?.addEventListener('click', () => document.querySelector('.dropdown-content').classList.toggle('show'));
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
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

// --- MASTER AUTH LOGIC ---
async function handleAuthentication() {
    const { data: { session } } = await supabase.auth.getSession();
    const currentPath = window.location.pathname.replace(/\.html$/, '');
    
    // --- 1. USER IS LOGGED OUT ---
    if (!session) {
        renderLoginButton();
        const protectedPaths = ['/complete-profile']; // Add any other protected pages here
        if (protectedPaths.includes(currentPath)) {
            window.location.replace('/login');
        }
        return;
    }

    // --- 2. USER IS LOGGED IN ---
    const user = session.user;
    const { data: profile, error } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        await supabase.auth.signOut();
        window.location.reload();
        return;
    }

    const isProfileComplete = profile && profile.username;
    const authFlowPages = ['/login', '/signup', '/verify', '/forgot-password', '/update-password'];

    // If profile is complete...
    if (isProfileComplete) {
        renderUserDropdown(profile);
        // Redirect them away from auth pages AND the complete-profile page.
        if (authFlowPages.includes(currentPath) || currentPath === '/complete-profile') {
            window.location.replace('/');
        }
    } 
    // If profile is NOT complete...
    else {
        renderLoginButton(); // Render simple nav bar
        // If they are a new user signing in for the first time, redirect them ONCE.
        const justSignedIn = window.location.hash.includes('access_token');
        if (justSignedIn && currentPath !== '/complete-profile') {
            window.location.replace('/complete-profile');
        }
    }
}

// Run the master logic on every page load
document.addEventListener('DOMContentLoaded', handleAuthentication);

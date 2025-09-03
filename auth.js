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
    // 1. Define pages that are "public" or part of the auth flow.
    // An incomplete user is ALLOWED to be on these pages.
    const publicAuthPages = [
        '/login',
        '/signup',
        '/verify',
        '/forgot-password',
        '/update-password',
        '/complete-profile'
    ];
    const currentPath = window.location.pathname;
    const isPublicAuthPage = publicAuthPages.some(page => currentPath.includes(page));

    // 2. Get the user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
        console.error("Error getting session:", sessionError);
        renderLoginButton();
        return;
    }

    // If there is no user, just show the login button and we're done.
    if (!session) {
        renderLoginButton();
        return;
    }

    const user = session.user;

    // 3. If there IS a user, get their profile details
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
    
    if (profileError) {
        console.error("Error getting profile:", profileError);
        await supabase.auth.signOut(); 
        renderLoginButton();
        return;
    }

    // 4. Now we have the FULL user status. We can make decisions.
    const isProfileComplete = profile && profile.username;

    // 5. Run REDIRECT logic first.
    if (isProfileComplete && isPublicAuthPage) {
        // Logged-in, complete user is on a page they shouldn't be on. Redirect to home.
        window.location.replace('/');
        return; // Stop here to prevent UI flicker
    }
    
    if (!isProfileComplete && !isPublicAuthPage) {
        // Logged-in, INCOMPLETE user is trying to access a protected page. Redirect them.
        window.location.replace('/complete-profile');
        return; // Stop here to prevent UI flicker
    }

    // 6. If no redirect happened, render the correct UI.
    if (isProfileComplete) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
}

// --- INITIALIZE AND LISTEN FOR CHANGES ---
document.addEventListener('DOMContentLoaded', initializeAuth);

supabase.auth.onAuthStateChange((_event, session) => {
    initializeAuth();
});


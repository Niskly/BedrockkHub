import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

// This function is our "master guard" that runs on every page
async function masterGuard(user) {
    if (!user) {
        return; // If there's no user, do nothing.
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

    const isProfileComplete = profile && profile.username;
    const isOnCompletionPage = window.location.pathname.includes('/complete-profile');
    const isOnAuthPage = window.location.pathname.includes('/login') || window.location.pathname.includes('/signup');

    // Rule #1: If profile is NOT complete AND they are NOT on the completion page, force them there.
    if (!isProfileComplete && !isOnCompletionPage) {
        window.location.replace('/complete-profile');
        return; // Stop further execution
    }

    // --- NEW RULE #2 ---
    // If profile IS complete AND they are on a login/signup page, force them to the homepage.
    if (isProfileComplete && isOnAuthPage) {
        window.location.replace('/'); // Use replace to prevent back-button loops
        return; // Stop further execution
    }
}

// Renders the dropdown for a logged-in user
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

// Renders the login button for a logged-out user
function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
}

// Determines which UI to show
async function checkUserProfileForUI(user) {
    const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    if (profile && profile.username) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
}


async function handleAuthState() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session && session.user) {
            await masterGuard(session.user);
            await checkUserProfileForUI(session.user);
        } else {
            renderLoginButton();
        }
    } catch (error) {
        console.error("Error handling auth state:", error);
        renderLoginButton();
    }
}

document.addEventListener('DOMContentLoaded', handleAuthState);

supabase.auth.onAuthStateChange((event, session) => {
    // Re-check auth state on any change, like login or logout
    handleAuthState();
});


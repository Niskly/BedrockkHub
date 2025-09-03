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

// --- CORE AUTH LOGIC ---
async function handleAuth() {
    const authFlowPages = ['/login', '/signup', '/verify', '/forgot-password', '/update-password', '/complete-profile'];
    const currentPath = window.location.pathname.replace(/\.html$/, '');
    const isAuthFlowPage = authFlowPages.includes(currentPath);

    // This handles the state for normal page loads.
    const { data: { session } } = await supabase.auth.getSession();

    // --- 1. USER IS LOGGED OUT ---
    if (!session) {
        renderLoginButton();
        return;
    }

    // --- 2. USER IS LOGGED IN ---
    const user = session.user;
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

    if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
        await supabase.auth.signOut();
        renderLoginButton();
        return;
    }

    const isProfileComplete = profile && profile.username;

    if (isProfileComplete) {
        renderUserDropdown(profile);
        // If a user with a complete profile lands on an auth page, kick them to the homepage.
        if (isAuthFlowPage) {
            window.location.replace('/');
        }
    } else {
        // User has an incomplete profile. Render the simple nav bar.
        // We DON'T force redirect them away from public pages, per your request.
        renderLoginButton();
    }
}

// --- EVENT LISTENERS ---

// This handles the special case of a user just signing in (especially with Google).
// It runs ONCE when the sign-in is detected.
supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
        // Give the session a moment to be fully established
        setTimeout(async () => {
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', session.user.id)
                    .single();
                
                // If the profile is missing or has no username, it's incomplete.
                if (!profile || !profile.username) {
                    // This is a new user or one who never finished setup.
                    // Send them to complete their profile.
                    window.location.replace('/complete-profile');
                }
            }
        }, 100);
    }
});


// This runs on every page load to set the correct UI.
document.addEventListener('DOMContentLoaded', handleAuth);


import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

// --- This is the new Master Guard function ---
async function masterGuard(user) {
    if (!user) {
        // If there's no user, do nothing. Let public pages load.
        return;
    }

    // If a user is logged in, we MUST check if their profile is complete.
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();

    const isProfileComplete = profile && profile.username;
    const isOnCompletionPage = window.location.pathname.includes('/complete-profile');

    // THE GOLDEN RULE:
    // If profile is NOT complete AND they are NOT on the completion page,
    // force them to the completion page.
    if (!isProfileComplete && !isOnCompletionPage) {
        window.location.replace('/complete-profile'); // Use replace to prevent back-button loops
    }
}


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

async function checkUserProfileForUI(user) {
    const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    if (profile && profile.username) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton(); 
    }
}

// This is now the main brain of the site's authentication
supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
        await masterGuard(session.user);
        await checkUserProfileForUI(session.user);
    } else {
        renderLoginButton();
    }
});


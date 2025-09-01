import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

// --- Renders the UI for a logged-in user with a complete profile ---
function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">`
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;

    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">
                ${avatarContent}
                <span>${profile.username}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="dropdown-content">
                <a href="/settings"><i class="fa-solid fa-cog"></i> Settings</a>
                <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        </div>
    `;
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    userMenuBtn.addEventListener('click', () => dropdownContent.classList.toggle('show'));
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });
}

// --- Renders the UI for a logged-out user ---
function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
    `;
}

// --- Main function to check the user's profile for the UI ---
async function checkUserProfileForUI(user) {
    const { data: profile, error } } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
    
    // This script only cares about displaying the UI.
    // The login page now handles all redirects.
    if (profile && profile.username) {
        renderUserDropdown(profile);
    } else {
        // If the profile is incomplete, the user shouldn't be on this page.
        // The safest action is to show the login button.
        renderLoginButton();
    }
}

// This listener correctly updates the UI without causing redirects.
supabase.auth.onAuthStateChange((event, session) => {
    if (session && session.user) {
        checkUserProfileForUI(session.user);
    } else {
        renderLoginButton();
    }
});


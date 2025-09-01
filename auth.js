import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

// This function renders the dropdown menu for a fully logged-in user
function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">`
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;

    navActions.innerHTML = `
        <a class="btn ghost" href="/index.html"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">
                ${avatarContent}
                <span>${profile.username}</span>
                <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div class="dropdown-content">
                <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
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
        window.location.reload();
    });
}

// This function renders the simple "Login" button for logged-out users
function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/index.html"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
    `;
}

// This is the main logic that runs on every page load
async function updateUserStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // A user is logged in. Let's check if their profile is complete.
        const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();
            
        if (profile && profile.username) {
            // The profile is complete. Show the user's dropdown menu.
            renderUserDropdown(profile);
        } else {
            // The profile is INCOMPLETE. This user should not be on a main page.
            // We sign them out to prevent them from getting stuck.
            // This ensures they will see the "Login" button next time.
            await supabase.auth.signOut();
            renderLoginButton();
        }
    } else {
        // No user is logged in. Show the standard "Login" button.
        renderLoginButton();
    }
}

document.addEventListener('DOMContentLoaded', updateUserStatus);


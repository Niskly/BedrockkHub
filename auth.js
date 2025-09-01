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

    // Add event listeners for the new elements
    const userMenuBtn = document.querySelector('.user-menu-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    userMenuBtn.addEventListener('click', () => {
        dropdownContent.classList.toggle('show');
    });

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.reload(); // Reload to update UI
    });
}

// --- Renders the UI for a logged-out user ---
function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/index.html"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
    `;
}

// --- NEW: Renders a "Complete Profile" button for new users ---
function renderCompleteProfileButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/index.html"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/complete-profile.html"><i class="fa-solid fa-user-pen"></i> Finish Setup</a>
    `;
}


// --- Main function to check user state ---
async function updateUserStatus() {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        // User is logged in, check their profile
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', user.id)
            .single();
            
        if (profile && profile.username) {
            // Profile is complete, render the user dropdown
            renderUserDropdown(profile);
        } else {
            // Profile is INCOMPLETE, render the "Finish Setup" button
            // This lets the user browse the site and not get stuck in a loop
            renderCompleteProfileButton();
        }
    } else {
        // User is not logged in, render the login button
        renderLoginButton();
    }
}

// Run the check when the page loads
document.addEventListener('DOMContentLoaded', updateUserStatus);


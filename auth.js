import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');
const mobileMenu = document.getElementById('mobile-menu');
const hamburgerBtn = document.getElementById('hamburger-btn');
const mainContentForBlur = document.querySelector('main');

let authInitialized = false;
let currentUserId = null;

/**
 * Toggles the mobile menu's visibility and blurs the main content.
 */
function toggleMobileMenu() {
    if (mobileMenu && mainContentForBlur && hamburgerBtn) {
        const isShown = mobileMenu.classList.toggle('show');
        mainContentForBlur.style.filter = isShown ? 'blur(5px)' : 'none';
        hamburgerBtn.innerHTML = isShown ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
    }
}


/**
 * Renders the user dropdown menu in the navigation bar for desktop and mobile.
 * @param {object} profile - The user's profile data.
 */
function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<img src="https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}" class="nav-avatar-img">`;
    
    // 1. Populate Desktop Navigation
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <div class="user-dropdown">
                <button class="user-menu-btn">
                    ${avatarContent}
                    <span>${profile.username}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                    <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                    <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>`;

        const btn = navActions.querySelector('.user-menu-btn');
        const content = navActions.querySelector('.dropdown-content');
        btn.addEventListener('click', (e) => { e.stopPropagation(); content.classList.toggle('show'); });
        document.getElementById('logout-btn').addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); });
    }

    // 2. Populate Mobile Navigation
    if (mobileMenu) {
        mobileMenu.innerHTML = `
            <a href="/profile.html?user=${profile.username}">My Profile</a>
            <a href="/settings.html">Settings</a>
            <a href="/">Home</a>
            <a href="/texturepacks.html">Texture Packs</a>
            <a href="#" id="mobile-logout-btn" style="color: var(--danger);">Logout</a>
        `;
        document.getElementById('mobile-logout-btn').addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); });
    }
}

/**
 * Renders the login/signup buttons for unauthenticated users for desktop and mobile.
 */
function renderLoginButtons() {
    // 1. Populate Desktop Navigation
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }

    // 2. Populate Mobile Navigation
    if (mobileMenu) {
        mobileMenu.innerHTML = `
            <a href="/login.html" class="btn primary">Login / Sign Up</a>
            <a href="/">Home</a>
            <a href="/texturepacks.html">Texture Packs</a>
        `;
    }
}

async function handleAuthState() {
    if (authInitialized) return;
    
    let user = null;
    let profile = null;
    let authError = null;

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session && session.user) {
            user = session.user;
            currentUserId = user.id;
            
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            if (profileData && profileData.username) {
                profile = profileData;
                renderUserDropdown(profile);
            } else {
                authError = 'Profile setup is not complete.';
                if (!window.location.pathname.endsWith('/complete-profile.html')) {
                    window.location.replace('/complete-profile.html');
                    return;
                }
            }
        } else {
            renderLoginButtons();
        }
    } catch (error) {
        console.error("Critical error in handleAuthState:", error);
        authError = error.message;
        renderLoginButtons();
    } finally {
        if (!authInitialized) {
            document.dispatchEvent(new CustomEvent('auth-ready', { 
                detail: { user, profile, error: authError } 
            }));
            authInitialized = true;
        }
    }
}

// === INITIALIZATION ===
if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', toggleMobileMenu);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthState);
} else {
    handleAuthState();
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.reload();
    } else if (event === 'SIGNED_IN') {
        handleAuthState();
    }
});

window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) content.classList.remove('show');
    }
});

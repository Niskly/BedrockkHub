import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');
const header = document.querySelector('header');
let authInitialized = false;
let currentUserId = null;

/**
 * Creates and manages the mobile navigation menu.
 * @param {object|null} profile - The user's profile data, or null if logged out.
 */
function setupMobileNav(profile) {
    if (!header) return;
    const navContainer = header.querySelector('.nav');
    if (!navContainer) return;

    // Clean up previous mobile elements to prevent duplicates.
    const existingToggle = navContainer.querySelector('.mobile-nav-toggle');
    const existingOverlay = document.querySelector('.mobile-nav-overlay');
    if (existingToggle) existingToggle.remove();
    if (existingOverlay) existingOverlay.remove();

    // Create the hamburger button that will be visible on mobile.
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'mobile-nav-toggle';
    hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    hamburgerBtn.setAttribute('aria-label', 'Open navigation menu');
    
    // Create the full-screen overlay menu.
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-nav-overlay';
    
    // Determine which links to show based on login status.
    const menuLinks = profile
        ? `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/profile.html?user=${profile.username}">My Profile</a>
            <a class="btn ghost" href="/settings.html">Settings</a>
            <a href="#" id="mobile-logout-btn" class="btn" style="background: transparent; border-color: var(--danger); color: var(--danger);">Logout</a>
        `
        : `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>
            <a class="btn ghost" href="/signup.html">Sign Up</a>
        `;

    mobileMenu.innerHTML = `
        <button class="mobile-nav-toggle mobile-nav-close" aria-label="Close navigation menu"><i class="fa-solid fa-xmark"></i></button>
        <div class="mobile-nav-links">${menuLinks}</div>
    `;

    // Add the new elements to the page.
    navContainer.appendChild(hamburgerBtn);
    document.body.appendChild(mobileMenu);

    // Wire up the open and close events for the menu.
    const openMenu = () => mobileMenu.classList.add('show');
    const closeMenu = () => mobileMenu.classList.remove('show');

    hamburgerBtn.addEventListener('click', openMenu);
    mobileMenu.querySelector('.mobile-nav-close').addEventListener('click', closeMenu);
    
    // Add logout functionality if the user is logged in.
    if (profile) {
        mobileMenu.querySelector('#mobile-logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
        });
    }
}

/**
 * Renders the user dropdown menu in the desktop navigation bar.
 * @param {object} profile - The user's profile data.
 */
function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<img src="https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}" class="nav-avatar-img">`;
    
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
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

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = content.classList.toggle('show');
            btn.setAttribute('aria-expanded', isExpanded);
        });

        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
        });
    }
    setupMobileNav(profile);
}

/**
 * Renders the login/signup buttons for unauthenticated users for desktop.
 */
function renderLoginButtons() {
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }
    setupMobileNav(null);
}

/**
 * Central function to handle the authentication state of the user. This is the single source of truth.
 */
async function handleAuthState() {
    // This flag prevents the function from running multiple times on a single page load.
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
                .select('*') // Select all to have more data if needed
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            // If the user has a complete profile, show the logged-in UI.
            if (profileData && profileData.username) {
                profile = profileData;
                renderUserDropdown(profile);
            } else {
                // If the profile is incomplete, redirect to the setup page.
                authError = 'Profile setup is not complete.';
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return; // Stop further execution to allow redirect to happen.
                }
            }
        } else {
            // If there's no user session, show the logged-out UI.
            currentUserId = null;
            renderLoginButtons();
        }
    } catch (error) {
        console.error("Authentication state error:", error);
        authError = error.message;
        currentUserId = null;
        renderLoginButtons(); // Fallback to logged-out state on error
    } finally {
        // Dispatch a custom event to let other scripts know that auth is ready.
        // This is useful for pages like settings.html to wait for user data.
        if (!authInitialized) {
            document.dispatchEvent(new CustomEvent('auth-ready', { 
                detail: { user, profile, error: authError } 
            }));
            authInitialized = true;
        }
    }
}

// --- Event Listeners and Initialization ---

// Handle initial page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthState);
} else {
    handleAuthState();
}

// Listen for changes in authentication state (login, logout)
supabase.auth.onAuthStateChange((event, session) => {
    // On logout, always redirect to the homepage to ensure a clean state.
    if (event === 'SIGNED_OUT') {
        window.location.href = '/';
    } 
    // On login, re-run the auth state handler only if the user has changed.
    // This prevents re-running on tab focus, fixing the refresh bug.
    else if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id;
        if (newUserId !== currentUserId) {
            authInitialized = false; // Reset the flag to allow re-initialization
            handleAuthState();
        }
    }
});

// Global click listener to close the dropdown menu if open.
window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
            const btn = navActions.querySelector('.user-menu-btn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    }
});

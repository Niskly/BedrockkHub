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
 */
function setupMobileNav(profile) {
    if (!header) return;
    const navContainer = header.querySelector('.nav');
    if (!navContainer) return;

    // Prevent duplicates
    navContainer.querySelector('.mobile-nav-toggle')?.remove();
    document.querySelector('.mobile-nav-overlay')?.remove();

    // Hamburger button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'mobile-nav-toggle';
    hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    hamburgerBtn.setAttribute('aria-label', 'Open navigation menu');

    // Mobile menu overlay
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'mobile-nav-overlay';

    // Links (based on auth state)
    const menuLinks = profile
        ? `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/profile.html?user=${profile.username}">My Profile</a>
            <a class="btn ghost" href="/settings.html">Settings</a>
            <a href="#" id="mobile-logout-btn" class="btn" style="background:transparent; border-color: var(--danger); color: var(--danger);">Logout</a>
        `
        : `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>
            <a class="btn ghost" href="/signup.html">Sign Up</a>
        `;

    mobileMenu.innerHTML = `
        <button class="mobile-nav-toggle mobile-nav-close" aria-label="Close navigation menu">
            <i class="fa-solid fa-xmark"></i>
        </button>
        <div class="mobile-nav-links">${menuLinks}</div>
    `;

    // Add to DOM
    navContainer.appendChild(hamburgerBtn);
    document.body.appendChild(mobileMenu);

    // Open/close events
    const openMenu = () => mobileMenu.classList.add('show');
    const closeMenu = () => mobileMenu.classList.remove('show');
    hamburgerBtn.addEventListener('click', openMenu);
    mobileMenu.querySelector('.mobile-nav-close').addEventListener('click', closeMenu);

    // Mobile logout
    if (profile) {
        mobileMenu.querySelector('#mobile-logout-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
        });
    }
}

/**
 * Renders desktop user dropdown menu.
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

        navActions.querySelector('#logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
        });
    }

    setupMobileNav(profile);
}

/**
 * Renders login/signup buttons for unauthenticated users.
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
 * Central function to handle auth state.
 */
async function handleAuthState() {
    if (authInitialized) return;

    let user = null;
    let profile = null;
    let authError = null;

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
            user = session.user;
            currentUserId = user.id;

            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') throw profileError;

            if (profileData?.username) {
                profile = profileData;
                renderUserDropdown(profile);
            } else {
                // Incomplete profile → redirect
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return;
                }
            }
        } else {
            currentUserId = null;
            renderLoginButtons();
        }
    } catch (error) {
        console.error("Authentication state error:", error);
        authError = error.message;
        currentUserId = null;
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

// --- Event Listeners ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthState);
} else {
    handleAuthState();
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = '/';
    } else if (event === 'SIGNED_IN') {
        const newUserId = session?.user?.id;
        if (newUserId !== currentUserId) {
            authInitialized = false; // allow re-initialization
            handleAuthState();
        }
    }
});

// Close dropdown when clicking outside
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

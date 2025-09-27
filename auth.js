import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');
const header = document.querySelector('header');
let authInitialized = false;
let currentUserId = null;

/**
 * Applies the selected theme to the page.
 * This function will be called by the auth flow as soon as the user's theme is known.
 * @param {string} themeName - The name of the theme to apply (e.g., 'red', 'purple').
 */
function applyUserTheme(themeName) {
    if (window.setMCHubTheme) {
        window.setMCHubTheme(themeName);
    } else {
        // Fallback for pages where theme.js might be slow to load
        document.addEventListener('theme-script-ready', () => {
             window.setMCHubTheme(themeName);
        }, { once: true });
    }
}


/**
 * Creates and manages the mobile navigation menu sidebar.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function setupMobileNav(profile, user) {
    if (!header) return;
    const navContainer = header.querySelector('.nav');
    if (!navContainer) return;

    // Clean up any old menu elements
    navContainer.querySelector('.mobile-nav-toggle')?.remove();
    document.querySelector('.mobile-nav-sidebar')?.remove();
    document.querySelector('.mobile-nav-backdrop')?.remove();

    // Hamburger button
    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'mobile-nav-toggle';
    hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    hamburgerBtn.setAttribute('aria-label', 'Open navigation menu');

    // Sidebar
    const sidebar = document.createElement('div');
    sidebar.className = 'mobile-nav-sidebar';

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-nav-backdrop';

    let userHeader = '';
    let mainLinks = '';
    let footerLinks = '';

    if (profile && user) {
        const avatarSrc = profile.avatar_url
            ? profile.avatar_url
            : `https://placehold.co/60x60/1c1c1c/de212a?text=${profile.username.charAt(0).toUpperCase()}`;

        userHeader = `
            <div class="mobile-nav-header">
                <img src="${avatarSrc}" alt="Avatar" class="mobile-nav-avatar">
                <div class="mobile-nav-user-info">
                    <span class="mobile-nav-username">${profile.username}</span>
                    <span class="mobile-nav-email">${user.email}</span>
                </div>
            </div>`;

        mainLinks = `
            <a href="/"><i class="fa-solid fa-house"></i><span>Home</span></a>
            <a href="/texturepacks.html"><i class="fa-solid fa-palette"></i><span>Texture Packs</span></a>
            <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i><span>My Profile</span></a>
        `;

        footerLinks = `
            <a href="/settings.html"><i class="fa-solid fa-cog"></i><span>Settings</span></a>
            <a href="#" id="mobile-logout-btn"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>
        `;
    } else {
        userHeader = `
            <div class="mobile-nav-header">
                 <div class="mobile-nav-avatar" style="background: var(--brand-1); display: grid; place-items:center;">
                    <i class="fa-solid fa-question"></i>
                </div>
                <div class="mobile-nav-user-info">
                    <span class="mobile-nav-username">Guest</span>
                    <span class="mobile-nav-email">Not logged in</span>
                </div>
            </div>`;
        mainLinks = `
            <a href="/"><i class="fa-solid fa-house"></i><span>Home</span></a>
            <a href="/texturepacks.html"><i class="fa-solid fa-palette"></i><span>Texture Packs</span></a>
        `;
        footerLinks = `
            <a href="/login.html"><i class="fa-solid fa-right-to-bracket"></i><span>Login</span></a>
            <a href="/signup.html" class="primary-mobile-link"><i class="fa-solid fa-user-plus"></i><span>Sign Up</span></a>
        `;
    }

    sidebar.innerHTML = `
        <button class="mobile-nav-close" aria-label="Close navigation menu"><i class="fa-solid fa-xmark"></i></button>
        ${userHeader}
        <nav class="mobile-nav-main-links">${mainLinks}</nav>
        <nav class="mobile-nav-footer-links">${footerLinks}</nav>
    `;

    // Add elements to the DOM
    navContainer.appendChild(hamburgerBtn);
    document.body.appendChild(sidebar);
    document.body.appendChild(backdrop);

    // Event listeners
    const openMenu = () => {
        sidebar.classList.add('show');
        backdrop.classList.add('show');
        document.body.style.overflow = 'hidden';
    };
    const closeMenu = () => {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
    };

    hamburgerBtn.addEventListener('click', openMenu);
    sidebar.querySelector('.mobile-nav-close').addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);

    if (profile) {
        sidebar.querySelector('#mobile-logout-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            closeMenu();
            await supabase.auth.signOut();
        });
    }
}


/**
 * Renders desktop user dropdown menu.
 * @param {object} profile - The user's profile data.
 * @param {object} user - The user's auth data.
 */
function renderUserDropdown(profile, user) {
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

    setupMobileNav(profile, user);
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
    setupMobileNav(null, null);
}

/**
 * Central function to handle auth state changes.
 */
async function handleAuthStateChange() {
    let user = null;
    let profile = null;
    let authError = null;

    authInitialized = false;

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
                applyUserTheme(profile.theme || 'red');
                renderUserDropdown(profile, user);
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                applyUserTheme('red');
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return; 
                }
                 renderLoginButtons();
            }
        } else {
            currentUserId = null;
            applyUserTheme('red');
            renderLoginButtons();
        }
    } catch (error) {
        console.error("Authentication state error:", error);
        authError = error.message;
        currentUserId = null;
        applyUserTheme('red');
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
    document.addEventListener('DOMContentLoaded', handleAuthStateChange);
} else {
    handleAuthStateChange();
}


supabase.auth.onAuthStateChange((event, session) => {
    const newUserId = session?.user?.id || null;
    if (newUserId !== currentUserId) {
        if (event === 'SIGNED_OUT') {
             window.location.href = '/';
        } else {
            // For SIGNED_IN or other events, just re-render the UI.
            // A full reload caused the infinite loop.
            handleAuthStateChange();
        }
    }
});

// Close desktop dropdown when clicking outside
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

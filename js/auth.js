import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabase = supabase; // Make it globally accessible for other scripts

let header = null;
let authInitialized = false;
let currentUserId = null;

// --- PROMISES to track loading state ---
// We need to wait for the page's HTML to be ready AND the nav component to be injected.
let domReady = false;
let componentsReady = false;

document.addEventListener('DOMContentLoaded', () => {
    domReady = true;
    console.log('[AUTH] DOMContentLoaded fired.');
    tryInitAuth();
});

document.addEventListener('components-loaded', () => {
    componentsReady = true;
    header = document.querySelector('header');
    console.log('[AUTH] components-loaded fired.');
    tryInitAuth();
});

/**
 * Tries to initialize the auth state.
 * This will only run once both the DOM and Nav Components are ready.
 */
function tryInitAuth() {
    // Only proceed if both are ready and auth hasn't run yet
    if (domReady && componentsReady && !authInitialized) {
        console.log('[AUTH] DOM and Components are ready. Initializing Auth.');
        authInitialized = true;
        handleAuthStateChange(); // Run the first auth check
    }
}

/**
 * Creates and manages the mobile navigation menu sidebar.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function setupMobileNav(profile, user) {
    if (!header) {
        console.error('[AUTH] Mobile Nav setup failed: header not found.');
        return;
    }
    
    document.querySelector('.mobile-nav-sidebar')?.remove();
    document.querySelector('.mobile-nav-backdrop')?.remove();

    const sidebar = document.createElement('div');
    sidebar.className = 'mobile-nav-sidebar';

    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-nav-backdrop';

    const brandHeader = `
        <div class="mobile-nav-header">
             <a class="brand" href="/">
                <div class="brand-badge">
                    <img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom">
                </div>
                <div>
                    <div class="brand-title">MCHUB</div>
                    <div class="tiny">Minecraft • Community Hub</div>
                </div>
            </a>
        </div>`;

    let userHeader = '';
    let mainLinks = '';
    let footerLinks = '';
    const currentPath = window.location.pathname.replace('/index.html', '/');

    const isHome = ['/', '/index.html'].includes(currentPath);
    const isTexturePacks = ['/texturepacks.html', '/texturepacks', '/packs.html', '/packs'].includes(currentPath);
    const isNews = ['/news.html', '/news'].includes(currentPath);
    const isSkinEditor = ['/skineditor.html', '/skineditor'].includes(currentPath);
    const isCapeEditor = ['/capeeditor.html', '/capeeditor'].includes(currentPath);
    
    let isProfile = false;
    if (profile) {
        const urlParams = new URLSearchParams(window.location.search);
        isProfile = ['/profile.html', '/profile'].includes(currentPath) && urlParams.get('user') === profile.username;
    }

    const isAnyTool = isSkinEditor || isCapeEditor;
    const toolsDropdownHTML = `
        <div class="mobile-nav-collapsible ${isAnyTool ? 'open' : ''}">
            <a href="#" class="collapsible-trigger">
                <span style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fa-solid fa-wrench" style="width: 24px; text-align: center; font-size: 1.1rem;"></i>
                    <span>Tools</span>
                </span>
                <i class="fa-solid fa-chevron-down arrow"></i>
            </a>
            <div class="collapsible-content" style="${isAnyTool ? 'max-height: 200px;' : ''}">
                <a href="/skineditor.html" class="sub-link ${isSkinEditor ? 'active-mobile-link' : ''}" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem;">
                    <i class="fa-solid fa-paint-brush" style="width: 24px; text-align: center; font-size: 1.1rem;"></i>
                    <span>Skin Editor</span>
                </a>
                <a href="/capeeditor.html" class="sub-link ${isCapeEditor ? 'active-mobile-link' : ''}" style="display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1rem;">
                    <i class="fa-solid fa-user-tie" style="width: 24px; text-align: center; font-size: 1.1rem;"></i>
                    <span>Cape Editor</span>
                </a>
            </div>
        </div>
    `;

    const sharedLinks = `
        <a href="/" class="${isHome ? 'active-mobile-link' : ''}"><i class="fa-solid fa-house" style="width: 24px; text-align: center; font-size: 1.1rem;"></i><span>Home</span></a>
        <a href="/texturepacks.html" class="${isTexturePacks ? 'active-mobile-link' : ''}"><i class="fa-solid fa-palette" style="width: 24px; text-align: center; font-size: 1.1rem;"></i><span>Texture Packs</span></a>
        <a href="/news.html" class="${isNews ? 'active-mobile-link' : ''}"><i class="fa-solid fa-newspaper" style="width: 24px; text-align: center; font-size: 1.1rem;"></i><span>News</span></a>
        ${toolsDropdownHTML}
    `;

    if (profile && user) {
        const avatarSrc = profile.avatar_url || `https://placehold.co/50x50/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        userHeader = `
        <div class="mobile-nav-user-header">
            <img src="${avatarSrc}" alt="Avatar" class="mobile-nav-avatar">
            <div class="mobile-nav-user-info">
                <span class="mobile-nav-username">${profile.username}</span>
                <span class="mobile-nav-email">${user.email}</span>
            </div>
        </div>`;
        mainLinks = `
            ${sharedLinks}
            <a href="/profile.html?user=${profile.username}" class="${isProfile ? 'active-mobile-link' : ''}"><i class="fa-solid fa-user" style="width: 24px; text-align: center; font-size: 1.1rem;"></i><span>My Profile</span></a>
        `;
        // Logout is now handled in mobile-user-menu.js, so footerLinks is empty
        footerLinks = ``;
    } else {
        userHeader = ''; // No user header when logged out
        mainLinks = sharedLinks;
        // Login/Signup are now handled in mobile-user-menu.js
        footerLinks = ``;
    }

    sidebar.innerHTML = `
        <button class="mobile-nav-close" aria-label="Close navigation menu"><i class="fa-solid fa-xmark"></i></button>
        ${brandHeader}
        ${userHeader}
        <nav class="mobile-nav-main-links">${mainLinks}</nav>
        <nav class="mobile-nav-footer-links">${footerLinks}</nav>
    `;

    document.body.appendChild(sidebar);
    document.body.appendChild(backdrop);
    const hamburgerBtn = document.querySelector('.mobile-nav-toggle');

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

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMenu);
    sidebar.querySelector('.mobile-nav-close').addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);
    
    const toolsCollapsible = sidebar.querySelector('.mobile-nav-collapsible');
    if (toolsCollapsible) {
        toolsCollapsible.querySelector('.collapsible-trigger').addEventListener('click', (e) => {
            e.preventDefault();
            const content = toolsCollapsible.querySelector('.collapsible-content');
            toolsCollapsible.classList.toggle('open');
            content.style.maxHeight = toolsCollapsible.classList.contains('open') ? content.scrollHeight + 'px' : '0';
        });
    }
}

/**
 * Renders the navigation bar for desktop state.
 * @param {boolean} isLoggedIn - Whether the user is logged in.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function renderDesktopNav(isLoggedIn, profile = null, user = null) {
    console.log('[DESKTOP NAV] renderDesktopNav called:', { isLoggedIn, profile: !!profile, user: !!user });
    
    // Find the elements injected by components.js
    const desktopNavLinks = document.getElementById('desktop-nav-links');
    const desktopAuth = document.getElementById('desktop-auth-actions');
    const mobileAuth = document.getElementById('mobile-auth-actions'); // For mobile notification icon

    console.log('[DESKTOP NAV] Elements found:', {
        desktopNavLinks: !!desktopNavLinks,
        desktopAuth: !!desktopAuth,
        mobileAuth: !!mobileAuth
    });

    if (!desktopNavLinks || !desktopAuth) {
        // This can happen if auth.js runs before components.js.
        // The new load-guard (tryInitAuth) should prevent this.
        console.error('[DESKTOP NAV] Missing required elements! Cannot render.');
        return;
    }

    // --- 1. Populate Main Navigation Links ---
    const currentPath = window.location.pathname.replace('/index.html', '/');
    const normalizedPath = currentPath.replace(/\/$/, ''); // Remove trailing slash
    const links = [
        { href: '/', icon: 'fa-house', text: 'Home', paths: ['/', '/index.html', ''] },
        { href: '/texturepacks.html', icon: 'fa-palette', text: 'Texture Packs', paths: ['/texturepacks.html', '/texturepacks', '/packs.html', '/packs'] },
        { href: '/news.html', icon: 'fa-newspaper', text: 'News', paths: ['/news.html', '/news'] }
    ];

    // Check if current page is a tool page
    const isToolPage = ['/skineditor.html', '/skineditor', '/capeeditor.html', '/capeeditor'].includes(currentPath);
    const toolsDropdown = `
        <div class="tools-dropdown-container">
            <button id="tools-btn" class="nav-link ${isToolPage ? 'active' : ''}">
                <i class="fa-solid fa-wrench"></i> Tools <i class="fa-solid fa-chevron-down"></i>
            </button>
            <div id="tools-menu">
                <a href="/skineditor.html"><i class="fa-solid fa-paint-brush"></i> Skin Editor</a>
                <a href="/capeeditor.html"><i class="fa-solid fa-user-tie"></i> Cape Editor</a>
            </div>
        </div>`;

    const navLinksHTML = links.map(l => {
        // Check against both normalized path and original path
        const isActive = l.paths.includes(currentPath) || l.paths.includes(normalizedPath);
        return `
            <a href="${l.href}" class="nav-link ${isActive ? 'active' : ''}">
                <i class="fa-solid ${l.icon}"></i>${l.text}
            </a>`;
    }).join('') + toolsDropdown;
    
    desktopNavLinks.innerHTML = navLinksHTML;
    console.log('[DESKTOP NAV] Links rendered, HTML length:', navLinksHTML.length);

    // --- 2. Populate Auth & User Section ---
    if (isLoggedIn && profile && user) {
        // --- LOGGED IN STATE ---
        const avatarSrc = profile.avatar_url || `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        const dropdownAvatarSrc = profile.avatar_url || `https://placehold.co/40x40/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        desktopAuth.innerHTML = `
            <button class="notification-btn-desktop notification-toggle-btn">
                <i class="fa-solid fa-bell"></i>
                <span id="notification-badge" class="notification-badge" style="display:none;"></span>
            </button>
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                    <img src="${avatarSrc}" alt="User Avatar" class="nav-avatar-img">
                    <span>${profile.username}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <div class="dropdown-header">
                       <img src="${dropdownAvatarSrc}" alt="User Avatar" class="dropdown-avatar">
                       <div class="dropdown-user-info">
                           <span class="dropdown-username">${profile.username}</span>
                           <span class="dropdown-email">${user.email}</span>
                       </div>
                    </div>
                    <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                    <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                    <div class="dropdown-support-group">
                        <a href="#" class="dropdown-support-toggle"><i class="fa-solid fa-headset"></i> Support <i class="fa-solid fa-chevron-down dropdown-chevron"></i></a>
                        <div class="dropdown-support-submenu">
                            <a href="/report.html"><i class="fa-solid fa-flag"></i> Reports</a>
                            <a href="/contact.html"><i class="fa-solid fa-envelope"></i> Contact</a>
                            <a href="/faq.html"><i class="fa-solid fa-circle-question"></i> FAQ</a>
                        </div>
                    </div>
                    <a href="#" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>`;
        
        if (mobileAuth) {
            mobileAuth.innerHTML = `
                 <button class="mobile-nav-btn notification-toggle-btn">
                    <i class="fa-solid fa-bell"></i>
                    <span id="notification-badge-mobile" class="notification-badge" style="display:none;"></span>
                </button>`;
        }
        
    } else {
        // --- LOGGED OUT STATE ---
        desktopAuth.innerHTML = `
            <a href="/login.html" class="login-btn"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
            <a href="/signup.html" class="signup-btn"><i class="fa-solid fa-user-plus"></i> Sign Up</a>`;
        if (mobileAuth) {
            mobileAuth.innerHTML = ''; // No notification button when logged out
        }
    }
    
    // --- 3. Add Event Listeners for new dynamic elements ---
    const userDropdown = desktopAuth.querySelector('.user-dropdown');
    if(userDropdown) {
        userDropdown.querySelector('.user-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const content = userDropdown.querySelector('.dropdown-content');
            content.classList.toggle('show');
        });
        userDropdown.querySelector('.logout-link').addEventListener('click', async (e) => {
            e.preventDefault();
            // Dispatch an event that other scripts (like settings.html) can listen to
            document.dispatchEvent(new CustomEvent('logout-request'));
            await supabase.auth.signOut();
        });
        
        // Support submenu toggle
        const supportToggle = userDropdown.querySelector('.dropdown-support-toggle');
        if (supportToggle) {
            supportToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const supportGroup = userDropdown.querySelector('.dropdown-support-group');
                if (supportGroup) {
                    supportGroup.classList.toggle('open');
                }
            });
        }
    }

    const toolsContainer = desktopNavLinks.querySelector('.tools-dropdown-container');
    if (toolsContainer) {
        toolsContainer.querySelector('#tools-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            toolsContainer.classList.toggle('open');
        });
    }

    // Close dropdowns when clicking outside
    window.addEventListener('click', (e) => {
        if (userDropdown && !e.target.closest('.user-dropdown')) {
            const content = userDropdown.querySelector('.dropdown-content');
            if(content) content.classList.remove('show');
        }
        if (toolsContainer && !e.target.closest('.tools-dropdown-container')) {
            toolsContainer.classList.remove('open');
        }
    });
}

/**
 * Main function to check auth state and update the UI.
 * This is the single source of truth for auth changes.
 */
async function handleAuthStateChange() {
    let user = null;
    let profile = null;
    let authError = null;
    
    console.log('[AUTH] handleAuthStateChange checking session...');

    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session?.user) {
            user = session.user;
            currentUserId = user.id;

            // Fetch profile
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 0 rows
                console.error('[AUTH] Profile fetch error:', profileError);
                throw profileError;
            }
            
            if (profileData?.username) {
                // --- USER IS LOGGED IN AND HAS A PROFILE ---
                profile = profileData;
                
                // Set theme *before* rendering nav to prevent FOUC
                const dbTheme = profile.theme || 'red';
                if (window.setMCHubTheme) {
                    window.setMCHubTheme(dbTheme, true);
                }

                // Redirect logged-in, profiled users away from auth pages
                const authPagePaths = ['/login.html', '/signup.html', '/verify.html', '/complete-profile.html', '/login', '/signup', '/verify', '/complete-profile'];
                if (authPagePaths.includes(window.location.pathname)) {
                    const overlay = document.getElementById('auth-redirect-overlay');
                    if (overlay) {
                        overlay.style.display = 'flex';
                        setTimeout(() => window.location.replace('/'), 1200);
                    } else {
                        window.location.replace('/');
                    }
                    return; // Stop further execution
                }
                
                // Render the "logged in" nav state
                renderDesktopNav(true, profile, user);

            } else {
                // --- USER IS LOGGED IN BUT HAS NO PROFILE ---
                // This user is stuck in the signup process.
                
                // Set default theme
                if (window.setMCHubTheme) window.setMCHubTheme('red', true);
                
                // Force them to the correct step
                const allowedPaths = ['/complete-profile.html', '/verify.html', '/complete-profile', '/verify'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    // Check if they just verified
                    const urlParams = new URLSearchParams(window.location.hash.substring(1)); // Check for verification token
                    if (urlParams.has('access_token') && urlParams.get('type') === 'recovery') {
                         // This is a password reset, let them go to update-password
                         if(window.location.pathname !== '/update-password.html' && window.location.pathname !== '/update-password') {
                            window.location.replace('/update-password.html' + window.location.hash);
                         }
                         // else, they are on the right page, do nothing.
                    } else if (user.email_confirmed_at) {
                        // Email is confirmed, send to complete profile
                        window.location.replace('/complete-profile.html');
                    } else {
                        // Email not confirmed, send to verify
                        const email = user.email;
                        window.location.replace(`/verify.html?email=${encodeURIComponent(email)}`);
                    }
                    return; // Stop further execution
                }
                
                // Render the "logged out" nav state (as they have no profile)
                renderDesktopNav(false);
            }
        } else {
            // --- USER IS LOGGED OUT ---
            currentUserId = null;
            
            // **FIX:** Reset theme to default 'red' on logout
            if (window.setMCHubTheme) {
                window.setMCHubTheme('red', true);
            }
            
            // Render the "logged out" nav state
            renderDesktopNav(false);
        }
    } catch (error) {
        console.error("[AUTH] Critical state change error:", error);
        authError = error.message;
        currentUserId = null;
        if (window.setMCHubTheme) window.setMCHubTheme('red', true); // Reset theme on error
        renderDesktopNav(false); // Render logged-out state as a fallback
    } finally {
        // This runs regardless of login state or errors
        
        // Setup mobile nav (it can handle null profile/user)
        setupMobileNav(profile, user);
        
        // Show the nav bar now that it's correctly styled
        if (header) {
            header.classList.add('auth-loaded');
        }
        
        // **CRITICAL FIX:** Dispatch auth-ready *after* all logic is complete.
        // All other page scripts (like settings.html) depend on this.
        console.log('[AUTH] Dispatching auth-ready event.');
        document.dispatchEvent(new CustomEvent('auth-ready', {
            detail: { user, profile, error: authError }
        }));
    }
}

// --- Event Listeners ---

// This is the main Supabase listener. It triggers on login, logout, etc.
supabase.auth.onAuthStateChange((event, session) => {
    console.log('[AUTH] onAuthStateChange event fired:', event);
    // Only run if auth has *already* been initialized once.
    // This prevents it from running on the initial page load,
    // which is now handled by tryInitAuth().
    if (authInitialized) {
        handleAuthStateChange();
    }
});

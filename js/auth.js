import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let header = null;
let authInitialized = false;
let currentUserId = null;
let componentsReady = false;

/**
 * Creates and manages the mobile navigation menu sidebar.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function setupMobileNav(profile, user) {
    if (!header) return;
    
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
    const isProfile = profile && ['/profile.html', '/profile'].includes(currentPath) && new URLSearchParams(window.location.search).get('user') === profile.username;

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
        const avatarSrc = profile.avatar_url ? profile.avatar_url : `https://placehold.co/50x50/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        userHeader = `
        <div class="mobile-nav-user-header">
            <img src="${avatarSrc}" alt="Avatar" class="mobile-nav-avatar">
            <div class="mobile-nav-user-info">
                <span class="mobile-nav-username">${profile.username}</span>
                <span class="mobile-nav-email">${user.email}</span>
            </div>
        </div>`;

        mainLinks = `${sharedLinks}`;
        footerLinks = ``; // Removed My Profile, Settings, Logout - now in mobile user dropdown
    } else {
        mainLinks = sharedLinks;
        footerLinks = ``; // Removed Login/Signup - now in mobile user dropdown
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

    // Logout is now handled in mobile-user-menu.js dropdown
}

function renderDesktopNav(isLoggedIn, profile = null, user = null) {
    console.log('[DESKTOP NAV] renderDesktopNav called:', { isLoggedIn, profile: !!profile, user: !!user });
    
    const desktopNavLinks = document.getElementById('desktop-nav-links');
    const desktopAuth = document.getElementById('desktop-auth-actions');
    const mobileAuth = document.getElementById('mobile-auth-actions'); // Optional - for mobile notification icon

    console.log('[DESKTOP NAV] Elements found:', {
        desktopNavLinks: !!desktopNavLinks,
        desktopAuth: !!desktopAuth,
        mobileAuth: !!mobileAuth
    });

    if (!desktopNavLinks || !desktopAuth) {
        console.error('[DESKTOP NAV] Missing required elements! Cannot render.');
        return;
    }

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
        const isActive = l.paths.includes(currentPath) || l.paths.includes(normalizedPath);
        return `
            <a href="${l.href}" class="nav-link ${isActive ? 'active' : ''}">
                <i class="fa-solid ${l.icon}"></i>${l.text}
            </a>`;
    }).join('') + toolsDropdown;
    
    desktopNavLinks.innerHTML = navLinksHTML;
    console.log('[DESKTOP NAV] Links rendered, HTML length:', navLinksHTML.length);

    if (isLoggedIn && profile && user) {
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
        desktopAuth.innerHTML = `
            <a href="/login.html" class="login-btn"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
            <a href="/signup.html" class="signup-btn"><i class="fa-solid fa-user-plus"></i> Sign Up</a>`;
        if (mobileAuth) {
            mobileAuth.innerHTML = '';
        }
    }
    
    // Add event listeners for dynamic elements
    const userDropdown = desktopAuth.querySelector('.user-dropdown');
    if(userDropdown) {
        userDropdown.querySelector('.user-menu-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const content = userDropdown.querySelector('.dropdown-content');
            content.classList.toggle('show');
        });
        userDropdown.querySelector('.logout-link').addEventListener('click', async (e) => {
            e.preventDefault();
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

async function handleAuthStateChange() {
    let user = null;
    let profile = null;
    let authError = null;
    
    console.log('[AUTH] handleAuthStateChange called, componentsReady:', componentsReady);

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
                const dbTheme = profile.theme || 'red';
                if (window.setMCHubTheme) window.setMCHubTheme(dbTheme, true);
                // Redirect logged-in users away from auth pages
                const authPagePaths = ['/login.html', '/signup.html', '/login', '/signup'];
                if (authPagePaths.includes(window.location.pathname)) {
                    // Show friendly message before redirect
                    const overlay = document.getElementById('auth-redirect-overlay');
                    if (overlay) {
                        overlay.style.display = 'flex';
                        setTimeout(() => {
                            window.location.replace('/');
                        }, 1200);
                    } else {
                        window.location.replace('/');
                    }
                    return;
                }
                renderDesktopNav(true, profile, user);
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return;
                }
                 renderDesktopNav(false);
            }
        } else {
            // User logged out - don't reset theme, keep current selection
            currentUserId = null;
            renderDesktopNav(false);
        }
    } catch (error) {
        console.error("Authentication state error:", error);
        authError = error.message;
        currentUserId = null;
        renderDesktopNav(false);
    } finally {
        setupMobileNav(profile, user); // Always setup mobile nav
        
        // Show nav after everything is loaded
        if (header) {
            header.classList.add('auth-loaded');
        }
        
        if (!authInitialized) {
            document.dispatchEvent(new CustomEvent('auth-ready', {
                detail: { user, profile, error: authError }
            }));
            authInitialized = true;
        }
    }
}

// --- Event Listeners ---
// Wait for components to load before initializing auth
document.addEventListener('components-loaded', () => {
    componentsReady = true;
    header = document.querySelector('header');
    handleAuthStateChange();
});

// Fallback: if components.js is not being used, initialize normally
setTimeout(() => {
    if (!componentsReady) {
        header = document.querySelector('header');
        handleAuthStateChange();
    }
}, 100);

supabase.auth.onAuthStateChange((event, session) => {
    if (componentsReady) {
        handleAuthStateChange();
    }
});

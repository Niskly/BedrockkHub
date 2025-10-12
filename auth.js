import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');
const header = document.querySelector('header');
let authInitialized = false;
let currentUserId = null;

/**
 * Creates and manages the mobile navigation menu sidebar.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function setupMobileNav(profile, user) {
    if (!header) return;
    const navContainer = header.querySelector('.nav');
    if (!navContainer) return;

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
    const currentPath = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html') 
        ? '/' 
        : window.location.pathname;

    const isHome = currentPath === '/';
    const isTexturePacks = currentPath === '/texturepacks.html';
    const isNews = currentPath === '/news.html';
    const isProfile = profile && currentPath === `/profile.html` && new URLSearchParams(window.location.search).get('user') === profile.username;

    const toolsDropdownHTML = `
        <div class="mobile-nav-collapsible">
            <a href="#" class="collapsible-trigger">
                <span class="collapsible-trigger-content">
                    <i class="fa-solid fa-wrench"></i>
                    <span>Tools</span>
                </span>
                <i class="fa-solid fa-chevron-down arrow"></i>
            </a>
            <div class="collapsible-content">
                <a href="/skineditor.html" class="sub-link">
                    <i class="fa-solid fa-paint-brush"></i>
                    <span>Skin Editor</span>
                </a>
            </div>
        </div>
    `;

    const sharedLinks = `
        <a href="/" class="${isHome ? 'active-mobile-link' : ''}"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a href="/texturepacks.html" class="${isTexturePacks ? 'active-mobile-link' : ''}"><i class="fa-solid fa-palette"></i><span>Texture Packs</span></a>
        <a href="/news.html" class="${isNews ? 'active-mobile-link' : ''}"><i class="fa-solid fa-newspaper"></i><span>News</span></a>
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

        mainLinks = `
            ${sharedLinks}
            <a href="/profile.html?user=${profile.username}" class="${isProfile ? 'active-mobile-link' : ''}"><i class="fa-solid fa-user"></i><span>My Profile</span></a>`;
        footerLinks = `
            <a href="/settings.html"><i class="fa-solid fa-cog"></i><span>Settings</span></a>
            <a href="#" id="mobile-logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>`;
    } else {
        mainLinks = sharedLinks;
        footerLinks = `
            <a href="/login.html" class="login-mobile-link"><i class="fa-solid fa-right-to-bracket"></i><span>Login</span></a>
            <a href="/signup.html" class="primary-mobile-link"><i class="fa-solid fa-user-plus"></i><span>Sign Up</span></a>`;
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
    const hamburgerBtn = navContainer.querySelector('.mobile-nav-toggle');

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
    
    // Add event listener for the new collapsible tools menu
    const toolsCollapsible = sidebar.querySelector('.mobile-nav-collapsible');
    if (toolsCollapsible) {
        toolsCollapsible.querySelector('.collapsible-trigger').addEventListener('click', (e) => {
            e.preventDefault();
            const content = toolsCollapsible.querySelector('.collapsible-content');
            toolsCollapsible.classList.toggle('open');
            if (toolsCollapsible.classList.contains('open')) {
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = '0';
            }
        });
    }

    if (profile) {
        sidebar.querySelector('#mobile-logout-btn')?.addEventListener('click', async (e) => {
            e.preventDefault();
            closeMenu();
            await supabase.auth.signOut();
        });
    }
}

function renderUserDropdown(profile, user) {
    const avatarSrc = profile.avatar_url ? profile.avatar_url : `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
    const dropdownAvatarSrc = profile.avatar_url ? profile.avatar_url : `https://placehold.co/40x40/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;

    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost nav-link-item" href="/"><i class="fa-solid fa-house"></i>Home</a>
            <a class="btn ghost nav-link-item" href="/texturepacks.html"><i class="fa-solid fa-palette"></i>Texture Packs</a>
            
            <div class="tools-dropdown-container nav-link-item">
                <button id="tools-btn" class="nav-link">
                    <i class="fa-solid fa-wrench"></i> Tools <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 4px;"></i>
                </button>
                <div id="tools-menu">
                    <a href="/skineditor.html"><i class="fa-solid fa-paint-brush"></i> Skin Editor</a>
                </div>
            </div>
            
            <a class="btn ghost nav-link-item" href="/news.html"><i class="fa-solid fa-newspaper"></i>News</a>
            
            <button id="notification-btn" class="notification-btn-desktop notification-toggle-btn">
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
                    <a href="#" id="logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>`;

        const userDropdown = navActions.querySelector('.user-dropdown');
        if(userDropdown) {
            const btn = userDropdown.querySelector('.user-menu-btn');
            const content = userDropdown.querySelector('.dropdown-content');

            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isExpanded = content.classList.toggle('show');
                btn.setAttribute('aria-expanded', isExpanded);
            });

            userDropdown.querySelector('#logout-btn').addEventListener('click', async (e) => {
                e.preventDefault();
                await supabase.auth.signOut();
            });
        }
        
        const toolsDropdown = navActions.querySelector('.tools-dropdown-container');
        if(toolsDropdown) {
             const btn = toolsDropdown.querySelector('#tools-btn');
             btn.addEventListener('click', (e) => {
                 e.stopPropagation();
                 toolsDropdown.classList.toggle('open');
             });
        }
        
        const mobileAuthActions = document.getElementById('mobile-auth-actions');
        if(mobileAuthActions){
            mobileAuthActions.innerHTML = `
                <button class="mobile-nav-btn notification-toggle-btn" style="color: white; font-size: 1.2rem;">
                    <i class="fa-solid fa-bell"></i>
                    <span id="notification-badge-mobile" class="notification-badge" style="display:none;"></span>
                </button>
            `;
        }
    }

    setupMobileNav(profile, user);
}

function renderLoginButtons() {
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost nav-link-item" href="/"><i class="fa-solid fa-house"></i>Home</a>
            <a class="btn ghost nav-link-item" href="/texturepacks.html"><i class="fa-solid fa-palette"></i>Texture Packs</a>
            <div class="tools-dropdown-container nav-link-item">
                <button id="tools-btn" class="nav-link">
                    <i class="fa-solid fa-wrench"></i> Tools <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 4px;"></i>
                </button>
                <div id="tools-menu">
                    <a href="/skineditor.html"><i class="fa-solid fa-paint-brush"></i> Skin Editor</a>
                </div>
            </div>
            <a class="btn ghost nav-link-item" href="/news.html"><i class="fa-solid fa-newspaper"></i>News</a>
            <a class="login-btn-item" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>
            <a class="signup-btn-item" href="/signup.html"><i class="fa-solid fa-user-plus"></i> Sign Up</a>`;
             
        const toolsDropdown = navActions.querySelector('.tools-dropdown-container');
        if(toolsDropdown) {
             const btn = toolsDropdown.querySelector('#tools-btn');
             btn.addEventListener('click', (e) => {
                 e.stopPropagation();
                 toolsDropdown.classList.toggle('open');
             });
        }
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
                const dbTheme = profile.theme || 'red';
                const cachedTheme = localStorage.getItem('mchub-theme');
                
                if (dbTheme !== cachedTheme) {
                    if (window.setMCHubTheme) window.setMCHubTheme(dbTheme, true);
                }
                
                renderUserDropdown(profile, user);
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return;
                }
                 renderLoginButtons();
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
    document.addEventListener('DOMContentLoaded', handleAuthStateChange);
} else {
    handleAuthStateChange();
}

supabase.auth.onAuthStateChange((event, session) => {
    const newUserId = session?.user?.id || null;
    if (newUserId !== currentUserId) {
        if (event === 'SIGNED_OUT') {
            try { localStorage.removeItem('mchub-theme'); } catch(e) {}
            window.location.href = '/login.html';
        } else {
            handleAuthStateChange();
        }
    }
});

window.addEventListener('click', (event) => {
    const userDropdown = document.querySelector('.user-dropdown');
    if (userDropdown && !event.target.closest('.user-dropdown')) {
        const content = userDropdown.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
            const btn = userDropdown.querySelector('.user-menu-btn');
            if (btn) btn.setAttribute('aria-expanded', 'false');
        }
    }
    
    const toolsDropdown = document.querySelector('.tools-dropdown-container');
    if (toolsDropdown && !event.target.closest('.tools-dropdown-container')) {
        toolsDropdown.classList.remove('open');
    }
});


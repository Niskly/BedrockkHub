import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const mainHeader = document.querySelector('header'); // Use querySelector for broader compatibility
let authInitialized = false;
let currentUserId = null;

/**
 * Creates the HTML for the main navigation actions based on user login state.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function renderNavActions(profile, user) {
    const navActionsContainer = document.getElementById('nav-actions');
    if (!navActionsContainer) return;

    // Normalize path to work with both / and /index.html
    let currentPath = window.location.pathname;
    if (currentPath.endsWith('/index.html')) {
        currentPath = '/';
    } else {
        currentPath = currentPath.replace('.html', '');
    }

    
    let navLinks = `
        <a class="btn ghost nav-link-item ${currentPath === '/' ? 'active' : ''}" href="/"><i class="fa-solid fa-house"></i>Home</a>
        <a class="btn ghost nav-link-item ${currentPath === '/texturepacks' ? 'active' : ''}" href="/texturepacks.html"><i class="fa-solid fa-palette"></i>Packs</a>
        <a class="btn ghost nav-link-item ${currentPath === '/news' ? 'active' : ''}" href="/news.html"><i class="fa-solid fa-newspaper"></i>News</a>
    `;

    if (user && profile) {
        // Logged-in user view
        const avatarSrc = profile.avatar_url ? profile.avatar_url : `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
        navActionsContainer.innerHTML = `
            ${navLinks}
            <!-- Tools Dropdown -->
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                    <i class="fa-solid fa-wrench"></i>
                    <span>Tools</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <a href="/skineditor.html">🎨 Skin Editor</a>
                </div>
            </div>

            <!-- Notifications Dropdown -->
            <div class="user-dropdown" id="notifications-dropdown">
                 <button class="user-menu-btn notification-btn" aria-haspopup="true" aria-expanded="false">
                    <i class="fa-solid fa-bell"></i>
                    <span id="notification-badge" class="notification-badge" style="display:none;"></span>
                </button>
                <div class="dropdown-content notifications-panel">
                    <div class="notifications-header">
                        <h3>Notifications</h3>
                        <button id="mark-all-read-btn" class="mark-all-read-btn">Mark all as read</button>
                    </div>
                    <div id="notifications-list" class="notifications-list">
                        <!-- Notifications will be loaded here -->
                    </div>
                </div>
            </div>

            <!-- User Profile Dropdown -->
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                    <img src="${avatarSrc}" alt="User Avatar" class="nav-avatar-img">
                    <span>${profile.username}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                    <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                    <a href="#" id="logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>
        `;
        setupDropdowns();
        loadNotifications(user.id);
        
    } else {
        // Logged-out user view
        navActionsContainer.innerHTML = `
            ${navLinks}
            <a class="btn primary" href="/login.html">Login</a>
        `;
    }

    setupMobileNav(profile, user);
}


/**
 * Creates and manages the mobile navigation menu sidebar.
 * @param {object|null} profile - The user's profile data.
 * @param {object|null} user - The user's auth data.
 */
function setupMobileNav(profile, user) {
    if (!mainHeader) return;
    const navContainer = mainHeader.querySelector('.nav');
    if (!navContainer) return;

    // Clean up any existing mobile nav elements
    document.querySelector('.mobile-nav-sidebar')?.remove();
    document.querySelector('.mobile-nav-backdrop')?.remove();
    navContainer.querySelector('.mobile-nav-toggle')?.remove();

    const hamburgerBtn = document.createElement('button');
    hamburgerBtn.className = 'mobile-nav-toggle';
    hamburgerBtn.innerHTML = '<i class="fa-solid fa-bars"></i>';
    navContainer.appendChild(hamburgerBtn);

    const sidebar = document.createElement('div');
    sidebar.className = 'mobile-nav-sidebar';

    const backdrop = document.createElement('div');
    backdrop.className = 'mobile-nav-backdrop';

    let userHeader = '';
    if (user && profile) {
        const avatarSrc = profile.avatar_url || `https://placehold.co/50x50/1c1c1c/de212a?text=${profile.username.charAt(0).toUpperCase()}`;
        userHeader = `
        <div class="mobile-nav-header user-info-header">
            <img src="${avatarSrc}" alt="Avatar" class="mobile-nav-avatar">
            <div class="mobile-nav-user-info">
                <span class="mobile-nav-username">${profile.username}</span>
                <span class="mobile-nav-email">${user.email}</span>
            </div>
        </div>`;
    } else {
        userHeader = `
        <div class="mobile-nav-header">
             <a class="brand" href="/">
                <div class="brand-badge"><img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom"></div>
                <div><div class="brand-title">MCHUB</div><div class="tiny">Minecraft • Community</div></div>
            </a>
        </div>`;
    }

    let mainLinks = `
        <a href="/"><i class="fa-solid fa-house"></i><span>Home</span></a>
        <a href="/texturepacks.html"><i class="fa-solid fa-palette"></i><span>Packs</span></a>
        <a href="/news.html"><i class="fa-solid fa-newspaper"></i><span>News</span></a>
        <a href="/skineditor.html"><i class="fa-solid fa-wrench"></i><span>Skin Editor</span></a>
    `;

    let footerLinks = '';
    if (user && profile) {
        mainLinks += `<a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i><span>My Profile</span></a>`;
        footerLinks = `
            <a href="/settings.html"><i class="fa-solid fa-cog"></i><span>Settings</span></a>
            <a href="#" id="mobile-logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>`;
    } else {
        footerLinks = `
            <a href="/login.html" class="login-mobile-link"><i class="fa-solid fa-right-to-bracket"></i><span>Login</span></a>
            <a href="/signup.html" class="primary-mobile-link"><i class="fa-solid fa-user-plus"></i><span>Sign Up</span></a>`;
    }

    sidebar.innerHTML = `
        <button class="mobile-nav-close" aria-label="Close menu"><i class="fa-solid fa-xmark"></i></button>
        ${userHeader}
        <nav class="mobile-nav-main-links">${mainLinks}</nav>
        <nav class="mobile-nav-footer-links">${footerLinks}</nav>
    `;

    document.body.appendChild(sidebar);
    document.body.appendChild(backdrop);

    const openMenu = () => { sidebar.classList.add('show'); backdrop.classList.add('show'); };
    const closeMenu = () => { sidebar.classList.remove('show'); backdrop.classList.remove('show'); };

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
 * Sets up event listeners for all dropdown menus in the navbar.
 */
function setupDropdowns() {
    document.querySelectorAll('.user-dropdown').forEach(dropdown => {
        const btn = dropdown.querySelector('.user-menu-btn');
        const content = dropdown.querySelector('.dropdown-content');
        if (btn && content) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Close other dropdowns before opening a new one
                document.querySelectorAll('.dropdown-content.show').forEach(openDropdown => {
                    if (openDropdown !== content) {
                        openDropdown.classList.remove('show');
                        openDropdown.previousElementSibling.setAttribute('aria-expanded', 'false');
                    }
                });
                const isExpanded = content.classList.toggle('show');
                btn.setAttribute('aria-expanded', isExpanded);
            });
        }
    });

    document.querySelector('#logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
    });
}


/**
 * Fetches and displays notifications for the logged-in user.
 * @param {string} userId - The ID of the current user.
 */
async function loadNotifications(userId) {
    const list = document.getElementById('notifications-list');
    const badge = document.getElementById('notification-badge');
    if (!list || !badge) return;

    list.innerHTML = '<li><span class="tiny">Loading...</span></li>';
    
    const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        list.innerHTML = '<li><span class="tiny error">Could not load notifications.</span></li>';
        return;
    }
    
    const unreadCount = data.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }

    if (data.length === 0) {
        list.innerHTML = '<li><span class="tiny">You have no new notifications.</span></li>';
    } else {
        list.innerHTML = data.map(n => `
            <li class="${n.is_read ? 'read' : 'unread'}">
                <a href="${n.link_url || '#'}">
                    <div class="notification-content">
                        <span class="notification-type">${n.type.replace('_', ' ')}</span>
                        <p>${n.content}</p>
                    </div>
                </a>
                <button class="delete-notification-btn" data-id="${n.id}">&times;</button>
            </li>
        `).join('');
    }
    
    // Add event listeners for new buttons
    document.getElementById('mark-all-read-btn').onclick = () => markAllAsRead(userId);
    document.querySelectorAll('.delete-notification-btn').forEach(btn => {
        btn.onclick = () => deleteNotification(btn.dataset.id);
    });
}

async function markAllAsRead(userId) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    
    if (!error) {
        document.getElementById('notification-badge').style.display = 'none';
        document.querySelectorAll('#notifications-list li.unread').forEach(li => li.classList.remove('unread'));
    }
}

async function deleteNotification(notificationId) {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    
    if (!error) {
        document.querySelector(`.delete-notification-btn[data-id="${notificationId}"]`)?.closest('li').remove();
    }
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
                
                if (window.setMCHubTheme && dbTheme !== cachedTheme) {
                    window.setMCHubTheme(dbTheme, true);
                }
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                    return;
                }
            }
        } else {
            currentUserId = null;
        }

    } catch (error) {
        console.error("Authentication state error:", error);
        authError = error.message;
        currentUserId = null;
    } finally {
        renderNavActions(profile, user);
        if (!authInitialized) {
            document.dispatchEvent(new CustomEvent('auth-ready', {
                detail: { user, profile, error: authError }
            }));
            authInitialized = true;
        }
    }
}

// --- Event Listeners & Initialization ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthStateChange);
} else {
    handleAuthStateChange();
}

supabase.auth.onAuthStateChange((event, session) => {
    const newUserId = session?.user?.id || null;
    if (newUserId !== currentUserId || event === 'SIGNED_OUT') {
        if (event === 'SIGNED_OUT') {
            try { localStorage.removeItem('mchub-theme'); } catch(e) {}
            window.location.href = '/login.html';
        } else {
            handleAuthStateChange();
        }
    }
});

window.addEventListener('click', (event) => {
    document.querySelectorAll('.user-dropdown').forEach(dropdown => {
        if (!event.target.closest('.user-dropdown')) {
            const content = dropdown.querySelector('.dropdown-content.show');
            if (content) {
                content.classList.remove('show');
                const btn = dropdown.querySelector('.user-menu-btn');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        }
    });
});

// Add CSS for new elements dynamically
document.head.insertAdjacentHTML('beforeend', `
<style>
    .logout-link { color: var(--danger) !important; }
    .logout-link:hover { background: rgba(239, 68, 68, .15) !important; color: #ff525a !important; }
    .user-dropdown .fa-chevron-down { font-size: 0.8em; transition: transform 0.2s; }
    .user-menu-btn[aria-expanded="true"] .fa-chevron-down { transform: rotate(180deg); }
    .notification-btn { position: relative; }
    .notification-badge {
        position: absolute; top: 4px; right: 8px;
        background-color: var(--brand-1); color: white;
        font-size: 10px; font-weight: 700;
        width: 16px; height: 16px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid var(--bg-2);
    }
    .notifications-panel { min-width: 320px; padding: 0; }
    .notifications-header { display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border); }
    .notifications-header h3 { margin: 0; font-size: 1rem; }
    .mark-all-read-btn { background: none; border: none; color: var(--brand-1); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    .notifications-list { list-style: none; padding: 0; margin: 0; max-height: 400px; overflow-y: auto; }
    .notifications-list li { display: flex; align-items: center; justify-content: space-between; }
    .notifications-list li a { flex-grow: 1; padding: 1rem; display: block; }
    .notifications-list li.unread a { background: rgba(var(--brand-1-rgb), 0.1); }
    .notifications-list li:not(:last-child) { border-bottom: 1px solid var(--border); }
    .notifications-list li:hover { background-color: var(--bg-2); }
    .notification-type { font-size: 0.8rem; font-weight: 700; text-transform: capitalize; color: var(--brand-1); }
    .notifications-list p { font-size: 0.9rem; margin: 0.25rem 0 0 0; color: var(--muted); }
    .delete-notification-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 1rem; font-size: 1.2rem; }
    .delete-notification-btn:hover { color: var(--danger); }
    .mobile-nav-header.user-info-header { padding: 1rem 1.5rem; display: flex; align-items: center; gap: 1rem; border-bottom: 1px solid var(--border); }
    .mobile-nav-toggle { display: none; }
    @media (max-width: 768px) {
        .nav-actions { display: none; }
        .mobile-nav-toggle { display: block; }
    }
</style>
`);


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

    let userHeader;
    if (profile && user) {
        const avatarSrc = profile.avatar_url ? profile.avatar_url : `https://placehold.co/50x50/1c1c1c/de212a?text=${profile.username.charAt(0).toUpperCase()}`;
        userHeader = `
        <div class="mobile-nav-header">
            <a class="brand" href="/">
                <div class="brand-badge"><img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom"></div>
            </a>
            <a href="/profile.html?user=${profile.username}" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
                <img src="${avatarSrc}" alt="Avatar" class="mobile-nav-avatar">
                <div class="mobile-nav-user-info">
                    <span class="mobile-nav-username">${profile.username}</span>
                    <span class="mobile-nav-email">${user.email}</span>
                </div>
            </a>
        </div>`;
    } else {
        userHeader = `
        <div class="mobile-nav-header">
             <a class="brand" href="/">
                <div class="brand-badge"><img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom"></div>
                <div><div class="brand-title">MCHUB</div><div class="tiny">Minecraft • Community Hub</div></div>
            </a>
        </div>`;
    }
    
    let mainLinks = '';
    let footerLinks = '';
    const currentPath = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html') 
        ? '/' 
        : window.location.pathname;

    const navItems = [
        { href: '/', icon: 'fa-house', text: 'Home' },
        { href: '/news.html', icon: 'fa-newspaper', text: 'News'},
        { href: '/texturepacks.html', icon: 'fa-palette', text: 'Texture Packs' }
    ];

    mainLinks = navItems.map(item => `
        <a href="${item.href}" class="${currentPath === item.href ? 'active-mobile-link' : ''}">
            <i class="fa-solid ${item.icon}"></i><span>${item.text}</span>
        </a>
    `).join('');

    if (profile && user) {
        const isProfile = currentPath === `/profile.html` && new URLSearchParams(window.location.search).get('user') === profile.username;
        mainLinks += `<a href="/profile.html?user=${profile.username}" class="${isProfile ? 'active-mobile-link' : ''}"><i class="fa-solid fa-user"></i><span>My Profile</span></a>`;
        footerLinks = `
            <a href="/settings.html"><i class="fa-solid fa-cog"></i><span>Settings</span></a>
            <a href="#" id="mobile-logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i><span>Logout</span></a>`;
    } else {
        footerLinks = `
            <a href="/login.html" class="login-mobile-link"><i class="fa-solid fa-right-to-bracket"></i><span>Login</span></a>
            <a href="/signup.html" class="primary-mobile-link"><i class="fa-solid fa-user-plus"></i><span>Sign Up</span></a>`;
    }

    sidebar.innerHTML = `
        <button class="mobile-nav-close" aria-label="Close navigation menu"><i class="fa-solid fa-xmark"></i></button>
        ${userHeader}
        <nav class="mobile-nav-main-links">${mainLinks}</nav>
        <div style="padding: 0 1rem;"><div style="font-weight: 600; color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); padding-bottom: 0.5rem; margin: 0.5rem 1rem;">Tools</div></div>
        <nav class="mobile-nav-main-links" style="padding-top: 0;">
            <a href="/skineditor.html">🎨 <span>Skin Editor</span></a>
        </nav>
        <nav class="mobile-nav-footer-links" style="margin-top: auto;">${footerLinks}</nav>
    `;

    document.body.appendChild(sidebar);
    document.body.appendChild(backdrop);
    const hamburgerBtn = navContainer.querySelector('.mobile-nav-toggle');

    const openMenu = () => { sidebar.classList.add('show'); backdrop.classList.add('show'); document.body.style.overflow = 'hidden'; };
    const closeMenu = () => { sidebar.classList.remove('show'); backdrop.classList.remove('show'); document.body.style.overflow = ''; };

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', openMenu);
    sidebar.querySelector('.mobile-nav-close').addEventListener('click', closeMenu);
    backdrop.addEventListener('click', closeMenu);

    if (profile) {
        sidebar.querySelector('#mobile-logout-btn')?.addEventListener('click', async (e) => { e.preventDefault(); closeMenu(); await supabase.auth.signOut(); });
    }
}


function renderUserDropdown(profile, user) {
    const avatarSrc = profile.avatar_url || `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
    const dropdownAvatarSrc = profile.avatar_url || `https://placehold.co/40x40/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
    
    // --- Create Desktop Nav Links ---
    const desktopNavLinksContainer = document.getElementById('desktop-nav-links');
    if(desktopNavLinksContainer) {
        desktopNavLinksContainer.innerHTML = `
            <a class="nav-link" href="/"><i class="fa-solid fa-house"></i>Home</a>
            <a class="nav-link" href="/news.html"><i class="fa-solid fa-newspaper"></i>News</a>
            <a class="nav-link" href="/texturepacks.html"><i class="fa-solid fa-palette"></i>Packs</a>
            <div class="user-dropdown" id="tools-dropdown">
                <button class="nav-link" aria-haspopup="true" aria-expanded="false" style="background: none; border: none;">
                    <i class="fa-solid fa-wrench"></i>Tools<i class="fa-solid fa-chevron-down" style="font-size: 0.7em; margin-left: 0.5rem;"></i>
                </button>
                <div class="dropdown-content">
                     <a href="/skineditor.html">🎨 Skin Editor</a>
                </div>
            </div>`;
        const currentPath = window.location.pathname.replace('.html', '');
        desktopNavLinksContainer.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href').includes(currentPath) && currentPath !== '/') {
                link.classList.add('active');
            } else if (currentPath === '/' || currentPath === '/index') {
                 if(link.getAttribute('href') === '/') link.classList.add('active');
            }
        });
    }

    // --- Create Desktop Auth Actions ---
    const desktopAuthContainer = document.getElementById('desktop-auth-actions');
    if (desktopAuthContainer) {
        desktopAuthContainer.innerHTML = `
            <div id="notification-wrapper"></div>
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                    <img src="${avatarSrc}" alt="User Avatar" class="nav-avatar-img">
                    <span>${profile.username}</span>
                </button>
                <div class="dropdown-content">
                    <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                    <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                    <a href="#" id="logout-btn" class="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>`;
        
        setupDropdown(desktopAuthContainer.querySelector('.user-dropdown'));
        desktopAuthContainer.querySelector('#logout-btn').addEventListener('click', async (e) => { e.preventDefault(); await supabase.auth.signOut(); });
        setupNotifications(user, profile, desktopAuthContainer.querySelector('#notification-wrapper'));
    }
     
    setupDropdown(document.getElementById('tools-dropdown'));
    setupMobileNav(profile, user);
}

function renderLoginButtons() {
    const desktopNavLinksContainer = document.getElementById('desktop-nav-links');
    if(desktopNavLinksContainer) {
        desktopNavLinksContainer.innerHTML = `
            <a class="nav-link" href="/"><i class="fa-solid fa-house"></i>Home</a>
            <a class="nav-link" href="/news.html"><i class="fa-solid fa-newspaper"></i>News</a>
            <a class="nav-link" href="/texturepacks.html"><i class="fa-solid fa-palette"></i>Packs</a>
            <a class="nav-link" href="/skineditor.html"><i class="fa-solid fa-wrench"></i>Tools</a>`;
        const currentPath = window.location.pathname.replace('.html', '');
        desktopNavLinksContainer.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href').includes(currentPath)) link.classList.add('active');
        });
    }

    const desktopAuthContainer = document.getElementById('desktop-auth-actions');
    if (desktopAuthContainer) {
        desktopAuthContainer.innerHTML = `
            <a class="login-btn" href="/login.html">Login</a>
            <a class="signup-btn" href="/signup.html">Sign Up</a>`;
    }
    setupMobileNav(null, null);
}


function setupDropdown(dropdownElement) {
    if (!dropdownElement) return;
    const btn = dropdownElement.querySelector('button');
    const content = dropdownElement.querySelector('.dropdown-content');
    if (!btn || !content) return;
    
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = content.classList.toggle('show');
        btn.setAttribute('aria-expanded', isExpanded);
    });
}

/**
 * Central function to handle auth state changes.
 */
async function handleAuthStateChange() {
    // ... (rest of the function is the same, just removed the old nav rendering)
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

            const { data: profileData, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (profileError && profileError.code !== 'PGRST116') throw profileError;
            
            if (profileData?.username) {
                profile = profileData;
                const dbTheme = profile.theme || 'red';
                const cachedTheme = localStorage.getItem('mchub-theme');
                if (dbTheme !== cachedTheme && window.setMCHubTheme) window.setMCHubTheme(dbTheme, true);
                renderUserDropdown(profile, user);
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) { window.location.replace('/complete-profile.html'); return; }
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
            document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user, profile, error: authError } }));
            authInitialized = true;
        }
    }
}

// --- NOTIFICATION SYSTEM ---
function setupNotifications(user, profile, wrapper) {
    if (!wrapper) return;
    
    wrapper.innerHTML = `
        <button class="mobile-nav-btn" id="notification-btn" aria-label="Toggle Notifications">
            <i class="fa-solid fa-bell"></i>
            <span id="notification-badge" style="display: none;"></span>
        </button>
        <div id="notification-panel">
            <div class="notification-header">
                <h3>Notifications</h3>
                <button id="mark-all-read-btn">Mark all as read</button>
            </div>
            <div id="notification-list">
                <div class="notification-empty">
                    <i class="fa-solid fa-inbox"></i>
                    <p>No new notifications</p>
                </div>
            </div>
        </div>
    `;

    const btn = wrapper.querySelector('#notification-btn');
    const panel = wrapper.querySelector('#notification-panel');

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = panel.classList.toggle('show');
        if (isVisible) {
            fetchAndRenderNotifications(user.id);
        }
    });
    
    wrapper.querySelector('#mark-all-read-btn').addEventListener('click', () => markAllAsRead(user.id));

    // Initial check
    updateNotificationBadge(user.id);
    setInterval(() => updateNotificationBadge(user.id), 60000); // Check for new notifications every minute
}

async function updateNotificationBadge(userId) {
     // This is a placeholder for your real logic
    const mockUnreadCount = 3; 
    const badge = document.getElementById('notification-badge');
    if (badge) {
        if (mockUnreadCount > 0) {
            badge.textContent = mockUnreadCount > 9 ? '9+' : mockUnreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

async function fetchAndRenderNotifications(userId) {
    const list = document.getElementById('notification-list');
    list.innerHTML = `<div class="notification-item-skeleton"></div><div class="notification-item-skeleton"></div>`;
    
    // MOCK DATA - Replace with your Supabase query
    const mockNotifications = [
        { id: 1, type: 'new_post', content: 'MCHub posted a new announcement.', created_at: new Date(), is_read: false, link: '/news.html' },
        { id: 2, type: 'new_comment_reply', content: 'Steve replied to your comment on "Crystal PvP Pack".', created_at: new Date(Date.now() - 3600000), is_read: false, link: '/packs.html?id=123' },
        { id: 3, type: 'new_pack', content: 'A new pack "Anime Overlay" was just uploaded!', created_at: new Date(Date.now() - 86400000), is_read: true, link: '/packs.html?id=456' }
    ];
    
    setTimeout(() => { // Simulate network delay
        if (mockNotifications.length === 0) {
            list.innerHTML = `<div class="notification-empty"><i class="fa-solid fa-inbox"></i><p>No new notifications</p></div>`;
            return;
        }
        list.innerHTML = mockNotifications.map(renderNotificationItem).join('');
        list.querySelectorAll('.dismiss-notification-btn').forEach(btn => {
            btn.addEventListener('click', (e) => dismissNotification(e, btn.dataset.id));
        });
    }, 1000);
}

function renderNotificationItem(notification) {
    const icons = {
        'new_post': 'fa-newspaper',
        'new_comment_reply': 'fa-comment-dots',
        'new_pack': 'fa-palette'
    };
    return `
    <div class="notification-item ${notification.is_read ? 'read' : ''}" data-id="${notification.id}">
        <a href="${notification.link}" class="notification-link">
            <div class="notification-icon"><i class="fa-solid ${icons[notification.type] || 'fa-info-circle'}"></i></div>
            <div class="notification-content">
                <p>${notification.content}</p>
                <span class="notification-timestamp">${new Date(notification.created_at).toLocaleString()}</span>
            </div>
        </a>
        <button class="dismiss-notification-btn" data-id="${notification.id}" title="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    </div>
    `;
}

async function markAllAsRead(userId) {
    // Placeholder for Supabase update query
    console.log(`Marking all as read for user ${userId}`);
    document.querySelectorAll('.notification-item').forEach(item => item.classList.add('read'));
    document.getElementById('notification-badge').style.display = 'none';
}

async function dismissNotification(event, notificationId) {
    event.preventDefault();
    event.stopPropagation();
     // Placeholder for Supabase delete/update query
    console.log(`Dismissing notification ${notificationId}`);
    const item = document.querySelector(`.notification-item[data-id="${notificationId}"]`);
    if(item) item.remove();
    // After removing, update the badge count
}

// --- Inject Notification CSS ---
const notificationStyles = `
    #notification-wrapper { position: relative; }
    #notification-btn { position: relative; }
    #notification-badge { position: absolute; top: 0; right: 0; background: var(--brand-1); color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; border: 2px solid var(--bg-1); }
    #notification-panel { display: none; position: absolute; top: calc(100% + .5rem); right: 0; width: 380px; background: var(--bg-1); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.4); z-index: 10; overflow: hidden; max-height: 80vh; display: none; flex-direction: column; }
    #notification-panel.show { display: flex; }
    .notification-header { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); }
    .notification-header h3 { margin: 0; font-size: 1rem; }
    #mark-all-read-btn { background: none; border: none; color: var(--muted); font-size: 0.8rem; font-weight: 600; cursor: pointer; }
    #notification-list { overflow-y: auto; }
    .notification-item { display: flex; align-items: stretch; gap: 0.5rem; border-bottom: 1px solid var(--border); background: rgba(var(--brand-1-rgb), 0.1); }
    .notification-item.read { background: transparent; }
    .notification-link { flex-grow: 1; display: flex; gap: 1rem; padding: 1rem; text-decoration: none; }
    .notification-icon { font-size: 1.2rem; color: var(--muted); padding-top: 0.2rem; }
    .notification-content p { margin: 0 0 0.25rem; color: var(--text); line-height: 1.4; }
    .notification-content .notification-timestamp { font-size: 0.75rem; color: var(--muted); }
    .dismiss-notification-btn { background: none; border: none; color: var(--muted); cursor: pointer; padding: 0 1rem; }
    .notification-item:hover .dismiss-notification-btn { color: var(--text); }
    .notification-empty { text-align: center; padding: 2rem; color: var(--muted); }
    .notification-item-skeleton { height: 80px; background: var(--bg-2); margin: 0.5rem 1rem; border-radius: 8px; opacity: 0.5; }
`;
const styleSheet = document.createElement("style");
styleSheet.innerText = notificationStyles;
document.head.appendChild(styleSheet);


// --- Event Listeners ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthStateChange);
} else {
    handleAuthStateChange();
}

supabase.auth.onAuthStateChange((event, session) => {
    const newUserId = session?.user?.id || null;
    if (newUserId !== currentUserId || event === 'SIGNED_IN') {
        if (event === 'SIGNED_OUT') {
            try { localStorage.removeItem('mchub-theme'); } catch(e) {}
            window.location.href = '/login.html';
        } else {
            // Use a small delay to ensure the DOM has updated if the page reloads
            setTimeout(handleAuthStateChange, 50);
        }
    }
});

window.addEventListener('click', (event) => {
    document.querySelectorAll('.user-dropdown, #tools-dropdown').forEach(dropdown => {
        if (dropdown && !event.target.closest(`#${dropdown.id}`)) {
            const content = dropdown.querySelector('.dropdown-content.show');
            if (content) {
                content.classList.remove('show');
                const btn = dropdown.querySelector('button');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }
        }
    });

    const notifPanel = document.getElementById('notification-panel');
    if (notifPanel && !event.target.closest('#notification-wrapper')) {
        notifPanel.classList.remove('show');
    }
});

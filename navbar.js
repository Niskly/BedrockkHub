// navbar.js - Complete navigation system for all pages
// Includes: Navbar, Mobile Sidebar, Search Modal, Notifications, Footer

export function initNavbar() {
    injectNavbar();
    injectMobileSidebar();
    injectSearchModal();
    injectNotificationPanel();
    injectFooter();
    
    setupEventListeners();
}

function injectNavbar() {
    const navbarHTML = `
        <div class="nav">
            <div class="nav-left-desktop">
                <a class="brand" href="/">
                    <div class="brand-badge">
                        <img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom">
                    </div>
                    <div>
                        <div class="brand-title">MCHUB</div>
                        <div class="tiny">Minecraft • Community Hub</div>
                    </div>
                </a>
                <div class="desktop-nav-links" id="desktop-nav-links"></div>
            </div>
            <div class="desktop-nav-right">
                <div class="desktop-search-container">
                    <i class="fa-solid fa-magnifying-glass"></i>
                    <input type="text" placeholder="Search..." readonly>
                </div>
                <div id="desktop-auth-actions"></div>
            </div>
            <div class="nav-actions" id="nav-actions">
                <a href="/" class="nav-link-item">Home</a>
                <a href="/packs.html" class="nav-link-item">Packs</a>
                <a href="/texturepacks.html" class="nav-link-item">Texture Packs</a>
                <a href="/news.html" class="nav-link-item">News</a>
                <div class="tools-dropdown-container">
                    <button class="nav-link-item" id="tools-btn">Tools <i class="fa-solid fa-chevron-down"></i></button>
                    <div id="tools-menu">
                        <a href="/skineditor.html"><i class="fa-solid fa-paintbrush"></i> Skin Editor</a>
                        <a href="/armor-viewer.html"><i class="fa-solid fa-shield"></i> Armor Viewer</a>
                    </div>
                </div>
            </div>
            <div class="mobile-nav-controls">
                <button id="mobile-search-toggle" class="mobile-nav-btn"><i class="fa-solid fa-magnifying-glass"></i></button>
                <div id="mobile-auth-actions"></div>
                <button class="mobile-nav-btn mobile-nav-toggle"><i class="fa-solid fa-bars"></i></button>
            </div>
        </div>
    `;
    
    const header = document.querySelector('header');
    if (header) header.innerHTML = navbarHTML;
}

function injectMobileSidebar() {
    const sidebarHTML = `
        <div class="mobile-nav-backdrop"></div>
        <div class="mobile-nav-sidebar">
            <button class="mobile-nav-close">&times;</button>
            <div class="mobile-nav-header" id="mobile-nav-header-placeholder"></div>
            <div class="mobile-nav-main-links">
                <a href="/"><i class="fa-solid fa-house"></i> Home</a>
                <a href="/packs.html"><i class="fa-solid fa-box"></i> Packs</a>
                <a href="/texturepacks.html"><i class="fa-solid fa-palette"></i> Texture Packs</a>
                <a href="/news.html"><i class="fa-solid fa-newspaper"></i> News</a>
                <div class="mobile-nav-collapsible">
                    <a href="#" class="collapsible-trigger">
                        <span><i class="fa-solid fa-wrench"></i> Tools</span>
                        <i class="fa-solid fa-chevron-down arrow"></i>
                    </a>
                    <div class="collapsible-content">
                        <a href="/skineditor.html" class="sub-link"><i class="fa-solid fa-paintbrush"></i> Skin Editor</a>
                        <a href="/armor-viewer.html" class="sub-link"><i class="fa-solid fa-shield"></i> Armor Viewer</a>
                    </div>
                </div>
            </div>
            <div class="mobile-nav-footer-links" id="mobile-nav-footer-placeholder"></div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', sidebarHTML);
}

function injectSearchModal() {
    const searchHTML = `
        <div id="desktop-search-modal" class="desktop-search-modal-backdrop">
            <div class="desktop-search-modal-content">
                <button id="close-search-modal-btn" class="close-search-modal-btn"><i class="fa-solid fa-xmark"></i></button>
                <div class="search-hub-container" style="margin: 0; max-width: 100%;">
                    <div class="search-input-wrapper" style="display: flex; position: relative; background: var(--bg-2); border: 1px solid var(--border); border-radius: 16px; transition: border-color 0.2s;">
                        <div class="search-type-dropdown" id="modal-search-type-dropdown" style="position: relative;">
                            <button id="modal-search-type-btn" style="display: flex; align-items: center; gap: 0.5rem; height: 100%; padding: 0 1.2rem; background: var(--bg-1); border: none; color: var(--text); font-weight: 600; border-radius: 15px 0 0 15px; cursor: pointer; border-right: 1px solid var(--border); font-family: inherit;">
                                <i class="fa-solid fa-palette"></i>
                                <span>Packs</span>
                                <i class="fa-solid fa-chevron-down" style="font-size: 0.8em; margin-left: 0.5rem;"></i>
                            </button>
                            <div id="modal-search-type-menu" style="display: none; position: absolute; top: 110%; left: 0; z-index: 12; background: var(--bg-1); border: 1px solid var(--border); border-radius: 12px; min-width: 100%; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,0.3);">
                                <div class="search-type-option" data-type="packs" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s;"><i class="fa-solid fa-palette" style="width: 16px; color: var(--muted);"></i> Packs</div>
                                <div class="search-type-option" data-type="users" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s;"><i class="fa-solid fa-user" style="width: 16px; color: var(--muted);"></i> Users</div>
                                <div class="search-type-option" data-type="gamertags" style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; cursor: pointer; transition: background 0.2s;"><i class="fa-brands fa-xbox" style="width: 16px; color: var(--muted);"></i> Gamertags</div>
                            </div>
                        </div>
                        <input type="text" id="modal-universal-search" placeholder="Search for packs..." style="width: 100%; padding: 1rem 1.5rem; font-size: 1rem; background: transparent; border: none; color: var(--text); outline: none; font-family: inherit;">
                    </div>
                    <div id="modal-search-results" style="display: none; margin-top: 0.5rem; background: var(--bg-2); border: 1px solid var(--border); border-radius: 16px; max-height: 350px; overflow-y: auto;"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', searchHTML);
}

function injectNotificationPanel() {
    const notificationHTML = `
        <div id="notification-backdrop" class="notification-backdrop">
            <div id="notification-panel" class="notification-panel">
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <button id="close-notifications-btn">&times;</button>
                </div>
                <div id="notification-list" class="notification-list"></div>
                <div class="notification-footer">
                    <button id="mark-all-read-btn" class="notification-footer-btn">Mark all as read</button>
                    <button id="clear-all-btn" class="notification-footer-btn">Clear All</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', notificationHTML);
}

function injectFooter() {
    const footerHTML = `
        <footer>
            <div class="footer-container">
                <div class="footer-brand">
                    <a class="brand" href="/">
                        <div class="brand-badge">
                            <img src="https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bh2.png" alt="MCHub Icon" class="brand-icon-custom">
                        </div>
                        <div>
                            <div class="brand-title">MCHUB</div>
                            <div class="tiny">Minecraft • Community Hub</div>
                        </div>
                    </a>
                    <p>Your ultimate destination for exploring the world of Minecraft. Discover new packs, follow your favorites, and never miss an update.</p>
                    <div class="footer-socials">
                        <a href="#" aria-label="Facebook"><i class="fa-brands fa-facebook"></i></a>
                        <a href="#" aria-label="Twitter"><i class="fa-brands fa-twitter"></i></a>
                        <a href="https://discord.gg/KtafawJZxM" target="_blank" aria-label="Discord"><i class="fa-brands fa-discord"></i></a>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Explore</h4>
                    <div class="footer-links">
                        <a href="/">Home</a>
                        <a href="/texturepacks.html">Browse Packs</a>
                        <a href="/news.html">News</a>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Support</h4>
                    <div class="footer-links">
                        <a href="#">Contact Us</a>
                        <a href="#">Report Issue</a>
                        <a href="#">FAQ</a>
                    </div>
                </div>
                <div class="footer-column">
                    <h4>Stay Updated</h4>
                    <p style="color: var(--muted); font-size: 0.9rem; margin-bottom: 1rem;">Join our Discord server for the latest updates and news.</p>
                    <a href="https://discord.gg/KtafawJZxM" target="_blank" class="footer-discord">
                        <i class="fa-brands fa-discord"></i>
                        <span>Join Server</span>
                    </a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>© 2025 MCHub. All rights reserved.</p>
                <div class="footer-bottom-links">
                    <a href="#">Terms of Service</a>
                    <a href="#">Privacy Policy</a>
                    <a href="#">DMCA</a>
                </div>
            </div>
        </footer>
    `;
    
    document.body.insertAdjacentHTML('beforeend', footerHTML);
}

function setupEventListeners() {
    // Tools dropdown
    const toolsBtn = document.getElementById('tools-btn');
    const toolsContainer = document.querySelector('.tools-dropdown-container');
    if (toolsBtn && toolsContainer) {
        toolsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toolsContainer.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tools-dropdown-container')) {
                toolsContainer.classList.remove('open');
            }
        });
    }

    // Mobile nav
    const mobileToggle = document.querySelector('.mobile-nav-toggle');
    const mobileBackdrop = document.querySelector('.mobile-nav-backdrop');
    const mobileSidebar = document.querySelector('.mobile-nav-sidebar');
    const mobileClose = document.querySelector('.mobile-nav-close');
    
    const closeMobileNav = () => {
        mobileBackdrop?.classList.remove('show');
        mobileSidebar?.classList.remove('show');
    };
    
    mobileToggle?.addEventListener('click', () => {
        mobileBackdrop?.classList.add('show');
        mobileSidebar?.classList.add('show');
    });
    mobileBackdrop?.addEventListener('click', closeMobileNav);
    mobileClose?.addEventListener('click', closeMobileNav);

    // Mobile collapsible
    const collapsibleTrigger = document.querySelector('.collapsible-trigger');
    const collapsibleContent = document.querySelector('.collapsible-content');
    const collapsibleContainer = document.querySelector('.mobile-nav-collapsible');
    
    collapsibleTrigger?.addEventListener('click', (e) => {
        e.preventDefault();
        collapsibleContainer?.classList.toggle('open');
        if (collapsibleContainer?.classList.contains('open')) {
            collapsibleContent.style.maxHeight = collapsibleContent.scrollHeight + 'px';
        } else {
            collapsibleContent.style.maxHeight = '0';
        }
    });

    // Desktop navbar population
    document.addEventListener('auth-ready', () => {
        const isDesktop = window.innerWidth >= 1024;
        if (!isDesktop) return;

        const navActions = document.getElementById('nav-actions');
        const desktopNavLinks = document.getElementById('desktop-nav-links');
        const desktopAuth = document.getElementById('desktop-auth-actions');

        if (!navActions || !desktopNavLinks || !desktopAuth) return;

        navActions.querySelectorAll('.nav-link-item').forEach(linkOrContainer => {
            if (linkOrContainer.classList.contains('tools-dropdown-container')) {
                desktopNavLinks.appendChild(linkOrContainer);
            } else if (linkOrContainer.tagName.toLowerCase() === 'a') {
                desktopNavLinks.appendChild(linkOrContainer);
            }
        });

        desktopNavLinks.querySelectorAll('a, button.nav-link').forEach(link => {
            if (link.tagName.toLowerCase() === 'a') {
                link.className = 'nav-link';
                const linkPath = link.getAttribute('href');
                const currentPath = window.location.pathname;
                if (linkPath === currentPath || (currentPath === '/' && linkPath === '/')) {
                    link.classList.add('active');
                }
            }
        });

        const loginBtn = navActions.querySelector('.login-btn-item');
        const signupBtn = navActions.querySelector('.signup-btn-item');
        const userDropdown = navActions.querySelector('.user-dropdown');
        const notificationBtn = navActions.querySelector('.notification-toggle-btn');
        
        if (notificationBtn) desktopAuth.appendChild(notificationBtn);

        if (userDropdown) {
            desktopAuth.appendChild(userDropdown);
        } else {
            if (loginBtn) {
                loginBtn.className = 'login-btn';
                desktopAuth.appendChild(loginBtn);
            }
            if (signupBtn) {
                signupBtn.className = 'signup-btn';
                desktopAuth.appendChild(signupBtn);
            }
        }
    });

    // Search modal
    const desktopSearchInput = document.querySelector('.desktop-search-container input');
    const mobileSearchToggle = document.getElementById('mobile-search-toggle');
    const searchModal = document.getElementById('desktop-search-modal');
    const closeModalBtn = document.getElementById('close-search-modal-btn');
    
    const openSearchModal = () => {
        searchModal?.classList.add('show');
        document.body.style.overflow = 'hidden';
        setTimeout(() => document.getElementById('modal-universal-search')?.focus(), 100);
    };
    
    const closeSearchModal = () => {
        searchModal?.classList.remove('show');
        document.body.style.overflow = '';
    };
    
    desktopSearchInput?.addEventListener('click', (e) => { e.preventDefault(); openSearchModal(); });
    mobileSearchToggle?.addEventListener('click', openSearchModal);
    closeModalBtn?.addEventListener('click', closeSearchModal);
    searchModal?.addEventListener('click', (e) => { if (e.target === searchModal) closeSearchModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && searchModal?.classList.contains('show')) closeSearchModal(); });
}

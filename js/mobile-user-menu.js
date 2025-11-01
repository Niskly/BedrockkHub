// Mobile User Menu Handler
(function() {
    'use strict';
    
    // **FIX:** Wait for auth-ready before trying to populate the menu
    document.addEventListener('auth-ready', function(e) {
        console.log('[MOBILE MENU] auth-ready received. Populating menu.');
        updateMobileUserMenu(e.detail.user, e.detail.profile);
    });

    // **FIX:** Setup click listeners inside a DOMContentLoaded listener
    // to ensure elements exist.
    document.addEventListener('DOMContentLoaded', () => {
        document.addEventListener('click', function(e) {
            const userBtn = e.target.closest('#mobile-user-btn');
            const userDropdown = e.target.closest('#mobile-user-dropdown');
            const supportToggle = e.target.closest('#mobile-support-toggle');
            
            // Toggle user menu when clicking the button
            if (userBtn) {
                e.stopPropagation();
                e.preventDefault();
                const menu = document.getElementById('mobile-user-menu');
                if (menu) {
                    menu.classList.toggle('show');
                }
                return;
            }
            
            // Handle support submenu toggle
            if (supportToggle) {
                e.preventDefault();
                const submenu = document.getElementById('mobile-support-submenu');
                if (submenu) {
                    submenu.classList.toggle('show');
                    const icon = supportToggle.querySelector('.fa-chevron-down');
                    if (icon) {
                        icon.style.transform = submenu.classList.contains('show') ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }
                return;
            }
            
            // Close menu when clicking outside
            if (!userDropdown) {
                const menu = document.getElementById('mobile-user-menu');
                if (menu) {
                    menu.classList.remove('show');
                }
            }
        });
    });
    
    // Populate menu based on auth state
    function updateMobileUserMenu(user, profile) {
        const mobileUserBtn = document.getElementById('mobile-user-btn');
        const mobileUserMenu = document.getElementById('mobile-user-menu');
        if (!mobileUserBtn || !mobileUserMenu) {
            console.warn('[MOBILE MENU] Could not find menu elements.');
            return;
        }
        const mobileNotificationBtn = document.getElementById('mobile-notification-btn');
        
        if (user && profile) {
            // Show notification button when logged in
            if (mobileNotificationBtn) {
                mobileNotificationBtn.style.display = 'flex';
            }
            
            // Logged in - show avatar
            const avatarSrc = profile.avatar_url || `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
            mobileUserBtn.innerHTML = `<img src="${avatarSrc}" alt="Avatar" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">`;
            
            // Populate menu
            const dropdownAvatarSrc = profile.avatar_url || `https://placehold.co/48x48/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;
            mobileUserMenu.innerHTML = `
                <div class="mobile-user-menu-header">
                    <img src="${dropdownAvatarSrc}" alt="${profile.username}" class="mobile-user-menu-avatar">
                    <div class="mobile-user-menu-info">
                        <div class="mobile-user-menu-name">${profile.username}</div>
                        <div class="mobile-user-menu-email">${user.email}</div>
                    </div>
                </div>
                <div class="mobile-user-menu-links">
                    <a href="/profile.html?user=${profile.username}">
                        <i class="fa-solid fa-user"></i>
                        <span>My Profile</span>
                    </a>
                    <a href="/settings.html">
                        <i class="fa-solid fa-gear"></i>
                        <span>Settings</span>
                    </a>
                    <button id="mobile-support-toggle" type="button">
                        <i class="fa-solid fa-headset"></i>
                        <span>Support</span>
                        <i class="fa-solid fa-chevron-down" style="margin-left: auto; transition: transform 0.3s;"></i>
                    </button>
                    <div id="mobile-support-submenu" class="mobile-support-submenu">
                        <a href="/report.html">
                            <i class="fa-solid fa-flag"></i>
                            <span>Reports</span>
                        </a>
                        <a href="/contact.html">
                            <i class="fa-solid fa-envelope"></i>
                            <span>Contact</span>
                        </a>
                        <a href="/faq.html">
                            <i class="fa-solid fa-circle-question"></i>
                            <span>FAQ</span>
                        </a>
                    </div>
                    <button id="mobile-logout-btn" class="logout-btn" type="button">
                        <i class="fa-solid fa-arrow-right-from-bracket"></i>
                        <span>Logout</span>
                    </button>
                </div>
            `;

            // Handle logout
            const logoutBtn = document.getElementById('mobile-logout-btn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    // supabase is global now
                    if (window.supabase && window.supabase.auth) {
                        await window.supabase.auth.signOut();
                    }
                    // The onAuthStateChange listener in auth.js will handle the reload/UI update
                });
            }
        } else {
            // Hide notification button when logged out
            if (mobileNotificationBtn) {
                mobileNotificationBtn.style.display = 'none';
            }
            
            // Not logged in - show user icon
            mobileUserBtn.innerHTML = '<i class="fa-solid fa-user"></i>';
            
            // Show login/signup options
            mobileUserMenu.innerHTML = `
                <div class="mobile-user-menu-auth">
                    <a href="/login.html" class="login-link">Login</a>
                    <a href="/signup.html" class="signup-link">Sign Up</a>
                </div>
            `;
        }
    }
})();

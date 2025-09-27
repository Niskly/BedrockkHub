import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJI"JhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Element Selectors ---
// Get references to all the navigation elements that are now part of the HTML.
const navActions = document.getElementById('nav-actions');
const mobileNavLinks = document.getElementById('mobile-nav-links');
const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
const openMenuBtn = document.getElementById('mobile-nav-open-btn');
const closeMenuBtn = document.getElementById('mobile-nav-close-btn');

let authInitialized = false;
let currentUserId = null;

/**
 * Populates the desktop and mobile navigation links for a logged-in user.
 * @param {object} profile - The user's profile data.
 */
function renderLoggedInNav(profile) {
    const avatarUrl = profile.avatar_url || `https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}`;

    // Desktop navigation HTML
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <div class="user-dropdown">
                <button class="user-menu-btn" aria-haspopup="true" aria-expanded="false">
                    <img src="${avatarUrl}" alt="User Avatar" class="nav-avatar-img">
                    <span>${profile.username}</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </button>
                <div class="dropdown-content">
                    <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                    <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                    <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
                </div>
            </div>`;
        
        // Attach event listener for the new dropdown
        const dropdownBtn = navActions.querySelector('.user-menu-btn');
        const dropdownContent = navActions.querySelector('.dropdown-content');
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isExpanded = dropdownContent.classList.toggle('show');
            dropdownBtn.setAttribute('aria-expanded', isExpanded);
        });
        navActions.querySelector('#logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            supabase.auth.signOut();
        });
    }

    // Mobile navigation HTML
    if (mobileNavLinks) {
        mobileNavLinks.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/profile.html?user=${profile.username}">My Profile</a>
            <a class="btn ghost" href="/settings.html">Settings</a>
            <a href="#" id="mobile-logout-btn" class="btn" style="background: transparent; border-color: var(--danger); color: var(--danger);">Logout</a>`;

        // Attach event listener for mobile logout
        mobileNavLinks.querySelector('#mobile-logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            supabase.auth.signOut();
        });
    }
}

/**
 * Populates the desktop and mobile navigation links for a logged-out user.
 */
function renderLoggedOutNav() {
    // Desktop navigation HTML
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }
    // Mobile navigation HTML
    if (mobileNavLinks) {
        mobileNavLinks.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>
            <a class="btn ghost" href="/signup.html">Sign Up</a>`;
    }
}


/**
 * Central function to handle the authentication state of the user.
 */
async function handleAuthState() {
    if (authInitialized) return;
    authInitialized = true;

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            currentUserId = session.user.id;
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();

            if (profile && profile.username) {
                renderLoggedInNav(profile);
            } else {
                const allowedPaths = ['/complete-profile.html', '/verify.html'];
                if (!allowedPaths.includes(window.location.pathname)) {
                    window.location.replace('/complete-profile.html');
                } else {
                    renderLoggedOutNav(); 
                }
            }
        } else {
            currentUserId = null;
            renderLoggedOutNav();
        }
    } catch (error) {
        console.error("Auth state error:", error);
        renderLoggedOutNav(); // Fallback to logged-out state
    } finally {
         document.dispatchEvent(new CustomEvent('auth-ready', { detail: { userId: currentUserId } }));
    }
}

// --- Event Listeners and Initialization ---

// Setup hamburger menu functionality immediately.
if (openMenuBtn && closeMenuBtn && mobileNavOverlay) {
    openMenuBtn.addEventListener('click', () => mobileNavOverlay.classList.add('show'));
    closeMenuBtn.addEventListener('click', () => mobileNavOverlay.classList.remove('show'));
}

// Handle initial page load
document.addEventListener('DOMContentLoaded', handleAuthState);
if (document.readyState !== 'loading') {
    handleAuthState();
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = '/';
    } else if (event === 'SIGNED_IN' && session?.user?.id !== currentUserId) {
        window.location.reload(); // Reload to get fresh profile data
    }
});

// Global click listener to close the dropdown menu
window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
            navActions.querySelector('.user-menu-btn').setAttribute('aria-expanded', 'false');
        }
    }
});


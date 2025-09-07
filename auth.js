import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

/**
 * Renders the user dropdown menu in the navigation bar.
 * @param {object} profile - The user's profile data.
 */
function renderUserDropdown(profile) {
    // Use a placeholder image if no avatar is set.
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<img src="https://placehold.co/28x28/1c1c1c/de212a?text=${(profile.username || 'U').charAt(0).toUpperCase()}" class="nav-avatar-img">`;
    
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <div class="user-dropdown">
                <button class="user-menu-btn">
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

        // Attach event listeners for dropdown and logout functionality.
        const btn = navActions.querySelector('.user-menu-btn');
        const content = navActions.querySelector('.dropdown-content');

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            content.classList.toggle('show');
        });

        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await supabase.auth.signOut();
                window.location.href = '/'; // Redirect home after logout.
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

/**
 * Renders the login/signup buttons for unauthenticated users.
 */
function renderLoginButtons() {
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }
}

/**
 * Central function to handle the authentication state of the user.
 * It fetches the session, checks for a profile, and dispatches an 'auth-ready' event.
 */
async function handleAuthState() {
    let user = null;
    let profile = null;
    let authError = null;

    try {
        console.log('🔄 Checking auth state...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session && session.user) {
            console.log('✅ User is authenticated:', session.user.id);
            user = session.user;
            
            // Now, fetch the associated profile. This is a critical step.
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('username, avatar_url, bio, social_links, bedrock_gamertag')
                .eq('id', user.id)
                .single();

            if (profileError && profileError.code !== 'PGRST116') {
                // An actual error occurred, not just "not found".
                throw profileError;
            }

            if (profileData && profileData.username) {
                // Profile exists and is complete.
                console.log('✅ Profile loaded:', profileData.username);
                profile = profileData;
                renderUserDropdown(profile);
            } else {
                // User is authenticated but has no profile or an incomplete one.
                console.log('❌ Profile incomplete. Redirecting...');
                authError = 'Profile setup is not complete.';
                // Redirect to a dedicated page to complete profile setup.
                if (!window.location.pathname.endsWith('/complete-profile.html')) {
                    window.location.replace('/complete-profile.html');
                    return; // Stop further execution on this page.
                }
            }
        } else {
            // No user session found.
            console.log('❌ No authenticated user.');
            renderLoginButtons();
        }
    } catch (error) {
        console.error("❌ Critical error in handleAuthState:", error);
        authError = error.message;
        renderLoginButtons();
    } finally {
        // *** THE MOST IMPORTANT PART ***
        // Broadcast a custom event to let the rest of the page know that auth is ready.
        // The page's specific logic (like loading settings) will listen for this.
        console.log('🚀 Dispatching auth-ready event.');
        document.dispatchEvent(new CustomEvent('auth-ready', { 
            detail: { user, profile, error: authError } 
        }));
    }
}

// === INITIALIZATION ===
console.log('🔧 Auth module initializing...');

// Use DOMContentLoaded to ensure the DOM is ready before we try to manipulate it.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', handleAuthState);
} else {
    handleAuthState(); // DOM is already ready
}

// Listen for future auth changes (e.g., token refresh, sign out from another tab).
supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event);
    // If the user signs in or out, re-run the entire auth check.
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        handleAuthState();
    }
});

// Global listener to close the dropdown when clicking anywhere else on the page.
window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
        }
    }
});

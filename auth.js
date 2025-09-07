import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MVg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    
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
                window.location.href = '/';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    }
}

function renderLoginButtons() {
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/">Home</a>
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }
}

async function handleAuthState() {
    try {
        console.log('🔄 Checking auth state...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Session error:", sessionError);
            throw sessionError;
        }

        if (session && session.user) {
            console.log('✅ User authenticated:', session.user.id);
            
            // Fetch profile with retry logic
            let profile = null;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (!profile && retryCount < maxRetries) {
                console.log(`📦 Fetching profile (attempt ${retryCount + 1}/${maxRetries})...`);
                
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('username, avatar_url, bio, social_links, bedrock_gamertag')
                    .eq('id', session.user.id)
                    .single();

                if (profileError) {
                    console.error(`Profile fetch error (attempt ${retryCount + 1}):`, profileError);
                    
                    if (profileError.code === 'PGRST116') {
                        // No profile found - redirect to complete profile
                        console.log('❌ No profile found, redirecting to complete profile...');
                        if (!window.location.pathname.endsWith('/complete-profile.html')) {
                            window.location.replace('/complete-profile.html');
                            return;
                        }
                        break;
                    }
                    
                    retryCount++;
                    if (retryCount < maxRetries) {
                        // Wait before retry
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                        continue;
                    } else {
                        throw profileError;
                    }
                }
                
                if (profileData && profileData.username) {
                    profile = profileData;
                    console.log('✅ Profile loaded:', profile.username);
                } else {
                    console.log('❌ Profile incomplete, redirecting to complete profile...');
                    if (!window.location.pathname.endsWith('/complete-profile.html')) {
                        window.location.replace('/complete-profile.html');
                        return;
                    }
                    break;
                }
            }

            if (profile && profile.username) {
                renderUserDropdown(profile);
            } else if (!window.location.pathname.endsWith('/complete-profile.html')) {
                console.log('❌ Failed to load profile after retries');
                window.location.replace('/complete-profile.html');
                return;
            }
        } else {
            console.log('❌ No authenticated user');
            renderLoginButtons();
        }
        
        // Dispatch the auth-ready event
        document.dispatchEvent(new CustomEvent('auth-ready', { 
            detail: { 
                user: session?.user || null,
                profile: profile || null
            } 
        }));
        
        console.log('🚀 Auth state handled successfully');
        
    } catch (error) {
        console.error("❌ Critical error in handleAuthState:", error);
        renderLoginButtons();
        document.dispatchEvent(new CustomEvent('auth-ready', { 
            detail: { user: null, profile: null, error: error.message } 
        }));
    }
}

// === INITIALIZATION ===
console.log('🔧 Auth module initializing...');

// Initial check with delay to ensure DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(handleAuthState, 100);
    });
} else {
    setTimeout(handleAuthState, 100);
}

// Listen for future auth changes
supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔄 Auth state changed:', event);
    
    // Add small delay to ensure UI is ready
    setTimeout(() => {
        handleAuthState();
    }, 100);
});

// Global listener to close dropdown
window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
        }
    }
});

// Export for debugging
window.authDebug = {
    supabase,
    handleAuthState,
    renderUserDropdown,
    renderLoginButtons
};

console.log('✅ Auth module loaded successfully');

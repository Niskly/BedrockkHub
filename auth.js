import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    
    if (navActions) {
        navActions.innerHTML = `
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
            await supabase.auth.signOut();
            window.location.href = '/';
        });
    }
}

function renderLoginButtons() {
    if (navActions) {
        navActions.innerHTML = `
            <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
            <a class="btn primary" href="/login.html">Login</a>`;
    }
}

async function handleAuthState() {
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error getting session:", sessionError);
            renderLoginButtons();
            return;
        }

        if (session) {
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error("Error fetching profile:", profileError);
                // Even if profile fails, user is logged in, so maybe sign them out or show an error state
                await supabase.auth.signOut();
                renderLoginButtons();
                return;
            }

            if (profile && profile.username) {
                renderUserDropdown(profile);
                // **THIS IS THE FIX**: Send the signal that auth is ready
                document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: session.user } }));
            } else {
                 if (!window.location.pathname.endsWith('/complete-profile.html')) {
                    window.location.replace('/complete-profile.html');
                }
            }
        } else {
            renderLoginButtons();
            // **THIS IS THE FIX**: Also send the signal when not logged in, so pages can react
            document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
        }
    } catch (e) {
        console.error("Critical error in handleAuthState:", e);
        renderLoginButtons();
    }
}

// Initial check
handleAuthState();

// Listen for future changes
supabase.auth.onAuthStateChange((event, session) => {
    handleAuthState();
});

// Global listener to close dropdown when clicking outside
window.addEventListener('click', (event) => {
    if (navActions && !event.target.closest('.user-dropdown')) {
        const content = navActions.querySelector('.dropdown-content.show');
        if (content) {
            content.classList.remove('show');
        }
    }
});

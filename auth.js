import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url 
        ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` 
        : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">
                ${avatarContent}
                <span>${profile.username}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: .8em;"></i>
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

function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
}

async function handleAuthStateChange() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // User is logged in, check if their profile is complete
        const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();

        // THIS IS THE NEW REDIRECTION LOGIC
        if (profile && !profile.username) {
            // Profile exists but is incomplete (no username)
            if (!window.location.pathname.endsWith('/complete-profile.html')) {
                window.location.replace('/complete-profile.html');
            }
        } else if (profile) {
            // Profile is complete, render the normal user menu
            renderUserDropdown(profile);
        } else {
             // This case is unlikely if you have a trigger, but is a good fallback.
             if (!window.location.pathname.endsWith('/complete-profile.html')) {
                window.location.replace('/complete-profile.html');
            }
        }
    } else {
        // User is not logged in, show login button
        renderLoginButton();
    }
}


// --- INITIAL LOAD AND EVENT LISTENERS ---
handleAuthStateChange();
supabase.auth.onAuthStateChange((_event, session) => {
    handleAuthStateChange();
});

// Close dropdown if clicked outside
window.addEventListener('click', (event) => {
    if (!event.target.closest('.user-dropdown')) {
        document.querySelector('.dropdown-content.show')?.classList.remove('show');
    }
});

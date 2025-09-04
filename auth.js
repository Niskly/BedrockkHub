import { supabase } from './supabase-client.js';

const navActions = document.getElementById('nav-actions');

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn" style="display: flex; align-items: center; gap: 10px; background: none; border: none; color: inherit; cursor: pointer; font-size: 15px; font-weight: 600;">
                ${avatarContent}
                <span>${profile.username}</span>
                <i class="fa-solid fa-chevron-down" style="font-size: .8em;"></i>
            </button>
            <div class="dropdown-content" style="display: none; position: absolute; right: 0; background-color: var(--bg-1); min-width: 160px; box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2); z-index: 1; border-radius: 12px; overflow: hidden;">
                <a href="/profile.html?user=${profile.username}" style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; color: var(--muted);"><i class="fa-solid fa-user"></i> My Profile</a>
                <a href="/settings.html" style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; color: var(--muted);"><i class="fa-solid fa-cog"></i> Settings</a>
                <a href="#" id="logout-btn" style="display: flex; align-items: center; gap: 10px; padding: 12px 16px; color: var(--muted);"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        </div>`;

    const dropdown = navActions.querySelector('.user-dropdown');
    const btn = dropdown.querySelector('.user-menu-btn');
    const content = dropdown.querySelector('.dropdown-content');

    btn.addEventListener('click', () => {
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
    });

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });
}

function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/">Home</a>
        <a class="btn ghost" href="/texturepacks.html">Texture Packs</a>
        <a class="btn primary" href="/login.html">Login</a>`;
}

async function initializeAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        if (window.location.pathname.endsWith('/settings.html')) {
            window.location.replace('/login.html');
        } else {
            renderLoginButton();
        }
        document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
        return;
    }

    const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', session.user.id).single();
    if (profile) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: session.user } }));
}

initializeAuth();
supabase.auth.onAuthStateChange((_event, session) => {
    initializeAuth();
});

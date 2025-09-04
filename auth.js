import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const SUPABASE_URL = 'https://whxmfpdmnsungcwlffdx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoeG1mcGRtbnN1bmdjd2xmZmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzMDk3MzYsImV4cCI6MjA3MTg4NTczNn0.PED6DKwmfzUFLIvNbRGY2OQV5XXmc8WKS9E9Be6o8D8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const navActions = document.getElementById('nav-actions');

// This function is now globally available for other scripts to use
window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container') || document.body;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = (type === 'success' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-circle-exclamation"></i>') + ` ${message}`;
    container.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 4000);
}

function renderUserDropdown(profile) {
    const avatarContent = profile.avatar_url ? `<img src="${profile.avatar_url}" alt="User Avatar" class="nav-avatar-img">` : `<div class="nav-avatar-default"><i class="fa-solid fa-user"></i></div>`;
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <div class="user-dropdown">
            <button class="user-menu-btn">${avatarContent}<span>${profile.username}</span><i class="fa-solid fa-chevron-down"></i></button>
            <div class="dropdown-content">
                <a href="/profile.html?user=${profile.username}"><i class="fa-solid fa-user"></i> My Profile</a>
                <a href="/settings.html"><i class="fa-solid fa-cog"></i> Settings</a>
                <a href="#" id="logout-btn"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
            </div>
        </div>`;
    document.querySelector('.user-menu-btn').addEventListener('click', () => document.querySelector('.dropdown-content').classList.toggle('show'));
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        await supabase.auth.signOut();
        window.location.href = '/login.html';
    });
}

function renderLoginButton() {
    navActions.innerHTML = `
        <a class="btn ghost" href="/"><i class="fa-solid fa-house"></i> Home</a>
        <a class="btn ghost" href="/texturepacks.html"><i class="fa-solid fa-paint-roller"></i> Texture Packs</a>
        <a class="btn primary" href="/login.html"><i class="fa-solid fa-right-to-bracket"></i> Login</a>`;
}

// --- THIS IS THE NEW, UNIFIED AUTH LOGIC ---
supabase.auth.onAuthStateChange(async (event, session) => {
    // This listener is now the single source of truth.
    // It runs on initial page load and on every auth change.

    // First, handle the special case of returning from a Microsoft link
    if (event === 'SIGNED_IN' && session?.provider_token && session.user.app_metadata.provider === 'azure') {
        const mcLinkContainer = document.getElementById('minecraft-link-container');
        if (mcLinkContainer) {
            mcLinkContainer.innerHTML = `<p class="tiny">Finalizing link, please wait...</p>`;
        }
        try {
            const response = await fetch('/api/link-minecraft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ provider_token: session.provider_token })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.details || 'Failed to link account.');
            }
            window.showToast('Minecraft account linked successfully!');
        } catch (error) {
            window.showToast(error.message, 'error');
        } finally {
            // Clean the URL and let the rest of the script re-evaluate the user's state
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }

    // Now, run the master guard logic every time
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    
    const protectedPages = ['/settings.html', '/profile.html'];
    const publicAuthPages = ['/login.html', '/signup.html', '/verify.html', '/forgot-password.html', '/update-password.html', '/complete-profile.html'];
    const currentPath = window.location.pathname;

    const isProtectedPage = protectedPages.some(page => currentPath.endsWith(page));
    const isPublicAuthPage = publicAuthPages.some(page => currentPath.endsWith(page));

    if (!currentSession) {
        if (isProtectedPage) {
            window.location.replace('/login.html');
            return;
        }
        renderLoginButton();
        document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user: null } }));
        return;
    }

    const user = currentSession.user;
    const { data: profile } = await supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single();
    
    const isProfileComplete = profile && profile.username;

    if (isProfileComplete && isPublicAuthPage) {
        window.location.replace('/');
        return;
    }
    
    if (!isProfileComplete && !isPublicAuthPage) {
        window.location.replace('/complete-profile.html');
        return;
    }

    // If no redirect has happened, it's safe to render the UI.
    if (isProfileComplete) {
        renderUserDropdown(profile);
    } else {
        renderLoginButton();
    }
    
    document.dispatchEvent(new CustomEvent('auth-ready', { detail: { user } }));
});


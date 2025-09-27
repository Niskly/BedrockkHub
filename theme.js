// This script now handles the initial theme loading to prevent FOUC (Flash of Unstyled Content).
(function() {
    const themes = {
        red: {
            '--brand-1': '#de212a',
            '--brand-2': '#b21a22',
            '--shadow-brand': '0 12px 30px rgba(222, 33, 42, .22)',
            '--bg-image': 'url("https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bg2.jpeg")'
        },
        purple: {
            '--brand-1': '#8b5cf6',
            '--brand-2': '#6d28d9',
            '--shadow-brand': '0 12px 30px rgba(139, 92, 246, .22)',
            '--bg-image': 'url("https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/purplebg.png")'
        },
        green: {
            '--brand-1': '#22c55e',
            '--brand-2': '#15803d',
            '--shadow-brand': '0 12px 30px rgba(34, 197, 94, .22)',
            '--bg-image': 'url("https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/greenbg.png")'
        },
        blue: {
            '--brand-1': '#3b82f6',
            '--brand-2': '#2563eb',
            '--shadow-brand': '0 12px 30px rgba(59, 130, 246, .22)',
            '--bg-image': 'url("https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/bluebg.png")'
        },
        black: {
            '--brand-1': '#e5e7eb',
            '--brand-2': '#9ca3af',
            '--shadow-brand': '0 12px 30px rgba(229, 231, 235, .1)',
            '--bg-image': 'url("https://whxmfpdmnsungcwlffdx.supabase.co/storage/v1/object/public/assets/blackbg.jpeg")'
        }
    };

    function hexToRgb(hex) {
        if (!hex) return '222, 33, 42'; // Default red
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '222, 33, 42';
    }
    
    /**
     * Applies the theme and makes the body visible.
     * @param {string} themeName - The name of the theme to apply.
     */
    function applyThemeAndShowBody(themeName) {
        const theme = themes[themeName] || themes.red;
        const root = document.documentElement;
        
        root.setAttribute('data-theme', themeName);

        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }

        const brand1 = theme['--brand-1'];
        root.style.setProperty('--brand-1-rgb', hexToRgb(brand1));
        
        // This is the magic! Make the body visible *after* the theme is applied.
        if (document.body) {
            document.body.style.opacity = '1';
        } else {
            // If body is not ready yet (this script is in <head>), wait for DOMContentLoaded.
            document.addEventListener('DOMContentLoaded', () => {
                document.body.style.opacity = '1';
            });
        }
    }
    
    // This function will be called from settings.html to set and cache the theme,
    // and from auth.js to sync the theme from the database.
    window.setMCHubTheme = (themeName, shouldCache = false) => {
        if (shouldCache) {
            try {
                localStorage.setItem('mchub-theme', themeName);
            } catch (e) {
                console.error('Failed to cache theme in localStorage:', e);
            }
        }
        // Always apply the theme visually.
        applyThemeAndShowBody(themeName);
    };
    
    // --- INITIAL LOAD LOGIC ---
    // This self-invoking function runs immediately when the script is parsed.
    try {
        const cachedTheme = localStorage.getItem('mchub-theme');
        // Apply the cached theme immediately, or fallback to 'red' if no cache exists.
        applyThemeAndShowBody(cachedTheme || 'red');
    } catch (e) {
        console.error('Failed to apply initial theme from cache:', e);
        applyThemeAndShowBody('red'); // Fallback to default
    }
    
    // Let auth.js know that the setMCHubTheme function is now available globally.
    document.dispatchEvent(new Event('theme-script-ready'));

})();


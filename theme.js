// This script is designed to run immediately to prevent a "flash of unstyled content" (FOUC).
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

    /**
     * Converts a hex color string to an RGB string "r, g, b".
     * @param {string} hex - The hex color.
     * @returns {string|null} - The RGB string or null if invalid.
     */
    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
    }

    /**
     * Applies a theme by setting CSS variables on the root element.
     * @param {string} themeName - The name of the theme to apply.
     */
    const applyTheme = (themeName) => {
        const theme = themes[themeName] || themes.red;
        const root = document.documentElement;
        
        root.setAttribute('data-theme', themeName);

        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }

        // Set the RGB version of the brand color for use in rgba()
        const brand1 = theme['--brand-1'];
        if (brand1) {
            root.style.setProperty('--brand-1-rgb', hexToRgb(brand1));
        }
    };

    /**
     * Sets the theme and saves the preference to localStorage.
     * @param {string} themeName - The name of the theme to set.
     */
    const setTheme = (themeName) => {
        try {
            localStorage.setItem('mchub-theme', themeName);
        } catch (e) {
            console.error('Failed to save theme to localStorage:', e);
        }
        applyTheme(themeName);
    };

    // Make the setTheme function globally accessible so the settings page can call it.
    window.setMCHubTheme = setTheme;

    // Immediately apply the saved theme on script load.
    try {
        const savedTheme = localStorage.getItem('mchub-theme') || 'red';
        applyTheme(savedTheme);
    } catch (e) {
        console.error('Failed to apply initial theme:', e);
        applyTheme('red'); // Fallback to default
    }
})();

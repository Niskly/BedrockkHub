document.addEventListener('DOMContentLoaded', () => {
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

    const applyTheme = (themeName) => {
        const theme = themes[themeName];
        if (!theme) {
            console.warn(`Theme "${themeName}" not found. Defaulting to "red".`);
            return;
        }

        const root = document.documentElement;
        root.setAttribute('data-theme', themeName);
        
        for (const [key, value] of Object.entries(theme)) {
            root.style.setProperty(key, value);
        }
    };

    const setTheme = (themeName) => {
        try {
            localStorage.setItem('mchub-theme', themeName);
        } catch (e) {
            console.error('Failed to save theme to localStorage:', e);
        }
        applyTheme(themeName);
    };

    // Make setTheme globally accessible for buttons
    window.setMCHubTheme = setTheme;

    // Apply the saved theme on initial load
    const savedTheme = localStorage.getItem('mchub-theme') || 'red';
    applyTheme(savedTheme);
});

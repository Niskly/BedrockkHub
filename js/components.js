/**
 * MCHub Component Loader
 * Loads navigation and footer components dynamically into pages
 *
 * **NEW:** This is now the main entry point. It loads all other
 * shared component scripts (auth, search, mobile) in the correct order.
 */

(function() {
    'use strict';

    /**
     * Fetches HTML content from a component file
     * @param {string} componentPath - Path to the component file
     * @returns {Promise<string>} - The HTML content
     */
    async function loadComponent(componentPath) {
        try {
            const response = await fetch(componentPath);
            if (!response.ok) {
                throw new Error(`Failed to load ${componentPath}: ${response.status}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Component load error:', error);
            return '';
        }
    }

    /**
     * Injects a component's HTML into a target element
     * @param {string} targetId - ID of the target element
     * @param {string} componentPath - Path to the component file
     */
    async function injectComponent(targetId, componentPath) {
        const targetElement = document.getElementById(targetId);
        if (!targetElement) {
            // Don't warn for footer, as it's not on all pages (e.g., auth)
            if (targetId !== 'footer-component') {
                console.warn(`Target element #${targetId} not found`);
            }
            return;
        }

        const html = await loadComponent(componentPath);
        if (html) {
            targetElement.innerHTML = html;
        }
    }

    /**
     * Load and execute a JavaScript file
     * @param {string} src - Path to the script file
     * @param {boolean} isModule - Whether to load as a module
     */
    function loadScript(src, isModule = false) {
        const script = document.createElement('script');
        script.src = src;
        if (isModule) {
            script.type = 'module';
        }
        // Use defer to ensure they execute in order after DOM parsing
        script.defer = true;
        document.head.appendChild(script);
    }

    /**
     * Initialize all components when DOM is ready
     */
    async function initComponents() {
        console.log('[COMPONENTS] initComponents START');
        
        // --- 1. Load HTML Components ---
        // Load nav first (critical for auth.js dependency)
        await injectComponent('nav-component', '/components/nav.html');
        // Load footer
        await injectComponent('footer-component', '/components/footer.html');
        
        console.log('[COMPONENTS] HTML Injected.');

        // --- 2. Load Core JS Logic in Order ---
        // Load Supabase client first (makes window.supabase available)
        loadScript('/js/supabase-client.js', true);
        
        // Load theme handler (controls body opacity)
        loadScript('/js/theme.js', true);

        // Load auth system (waits for components-loaded)
        loadScript('/js/auth.js', true);
        
        // Load mobile user menu handler (waits for components-loaded and auth-ready)
        loadScript('/js/mobile-user-menu.js');
        
        // Load search handler (waits for components-loaded)
        loadScript('/js/search-handler.js');
        
        console.log('[COMPONENTS] All scripts queued for loading.');

        // --- 3. Dispatch Event ---
        // Dispatch custom event to signal components' HTML is loaded
        // This un-blocks auth.js
        document.dispatchEvent(new CustomEvent('components-loaded'));
        console.log('[COMPONENTS] components-loaded event dispatched.');
    }

    // Wait for DOM to be ready before loading components
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        // DOM is already ready
        initComponents();
    }
})();

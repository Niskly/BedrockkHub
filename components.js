/**
 * MCHub Component Loader
 * Loads navigation and footer components dynamically into pages
 * 
 * Usage in HTML:
 * 1. Add <div id="nav-component"></div> where you want the navigation
 * 2. Add <div id="footer-component"></div> where you want the footer
 * 3. Include this script: <script src="/components.js"></script>
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
            console.warn(`Target element #${targetId} not found`);
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
     */
    function loadScript(src) {
        const script = document.createElement('script');
        script.src = src;
        script.defer = true;
        document.head.appendChild(script);
    }

    /**
     * Initialize all components when DOM is ready
     */
    async function initComponents() {
        // Load navigation first (critical for auth.js dependency)
        await injectComponent('nav-component', '/components/nav.html');
        
        // Load footer
        await injectComponent('footer-component', '/components/footer.html');
        
        // Load mobile user menu handler
        loadScript('/mobile-user-menu.js');
        
        // Load search handler
        loadScript('/search-handler.js');
        
        // Dispatch custom event to signal components are loaded
        // This is useful for scripts that depend on the nav being present
        document.dispatchEvent(new CustomEvent('components-loaded'));
    }

    // Wait for DOM to be ready before loading components
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initComponents);
    } else {
        // DOM is already ready
        initComponents();
    }
})();

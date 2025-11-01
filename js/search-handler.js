// Search Modal Handler - Load Latest Packs
(function() {
    'use strict';
    
    // **FIX:** Wait for DOMContentLoaded AND components-loaded before running
    let domReady = false;
    let componentsReady = false;
    let supabaseReady = false;

    function checkAndInit() {
        // Wait for Supabase to be on the window object
        if (window.supabase) {
            supabaseReady = true;
        }

        if (domReady && componentsReady && supabaseReady) {
            console.log('[SEARCH] DOM, Components, and Supabase are ready. Initializing.');
            run();
        } else {
            console.log(`[SEARCH] Waiting... DOM: ${domReady}, Components: ${componentsReady}, Supabase: ${supabaseReady}`);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        domReady = true;
        checkAndInit();
    });

    document.addEventListener('components-loaded', () => {
        componentsReady = true;
        checkAndInit();
    });
    
    // Check for Supabase
    const supabaseCheck = setInterval(() => {
        if (window.supabase) {
            supabaseReady = true;
            clearInterval(supabaseCheck);
            checkAndInit();
        }
    }, 50);

    function run() {
        const searchChipsContainer = document.getElementById('search-suggestions-chips');
        if (!searchChipsContainer) {
            console.error('[SEARCH] Chips container not found!');
            return;
        }
        
        console.log('[SEARCH] Handler initialized');
        let packsLoaded = false;
        
        async function loadLatestPacks() {
            if (packsLoaded) return;
            
            console.log('[SEARCH] Loading latest packs...');
            searchChipsContainer.innerHTML = '<span style="color: var(--muted); font-size: 0.85rem;">Loading...</span>';
            
            if (!window.supabase) {
                console.warn('[SEARCH] Supabase not available');
                searchChipsContainer.innerHTML = '<span style="color: var(--muted); font-size: 0.85rem;">Browse packs to discover content</span>';
                return;
            }
            
            try {
                const { data, error } = await window.supabase
                    .from('packs')
                    .select('id, name, icon_url')
                    .order('created_at', { ascending: false })
                    .limit(3);
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    searchChipsContainer.innerHTML = data.map(pack => `
                        <a href="/packs.html?id=${pack.id}" class="search-pack-chip">
                            <img src="${pack.icon_url || 'https://placehold.co/32x32/1c1c1c/de212a?text=P'}" class="search-pack-chip-icon" alt="${pack.name}">
                            <span class="search-pack-chip-name">${pack.name}</span>
                        </a>
                    `).join('');
                    packsLoaded = true;
                    console.log('[SEARCH] Loaded', data.length, 'packs');
                } else {
                    searchChipsContainer.innerHTML = '<span style="color: var(--muted); font-size: 0.85rem;">No packs yet</span>';
                }
            } catch (err) {
                console.error('[SEARCH] Error:', err);
                searchChipsContainer.innerHTML = '<span style="color: var(--muted); font-size: 0.85rem;">Unable to load packs</span>';
            }
        }
        
        // Trigger on search modal open
        // We use event delegation on the document since the nav is dynamic
        document.addEventListener('click', (e) => {
            if (e.target.closest('#desktop-search-input') || e.target.closest('#mobile-search-toggle')) {
                setTimeout(loadLatestPacks, 200);
            }
        });
        
        // Auto-load after a short delay
        setTimeout(loadLatestPacks, 2000);
    }
})();

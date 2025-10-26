// Search Modal Handler - Load Latest Packs
(async function() {
    'use strict';
    
    // Wait for components to load
    await new Promise(resolve => {
        if (document.getElementById('search-suggestions-chips')) {
            resolve();
        } else {
            document.addEventListener('components-loaded', resolve, { once: true });
        }
    });
    
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
        
        // Wait for supabase (max 10 seconds)
        let attempts = 0;
        while (!window.supabase && attempts < 100) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        
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
    const desktopSearchInput = document.querySelector('#desktop-search-input');
    const mobileSearchToggle = document.getElementById('mobile-search-toggle');
    
    if (desktopSearchInput) {
        desktopSearchInput.addEventListener('click', () => setTimeout(loadLatestPacks, 200));
    }
    
    if (mobileSearchToggle) {
        mobileSearchToggle.addEventListener('click', () => setTimeout(loadLatestPacks, 200));
    }
    
    // Auto-load after page loads
    setTimeout(loadLatestPacks, 2000);
})();

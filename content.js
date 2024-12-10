// content.js  
// This script removes unnecessary items from the left banner on Twitter.

(function() {
    // Prevent multiple initializations
    if (window.twitterExtensionInitialized) return;
    window.twitterExtensionInitialized = true;

    // Global state and constants
    const state = {
        isInitialized: false,
        currentSettings: {},
        retryCount: 0,
        observer: null,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        EXCLUDED_ITEMS: [
            /^@/,           // Twitter handles
            /\n/,           // Items with newlines
            /^\s*$/,        // Empty items
            /^Post$/,       // Post button
            /^Home$/,       // Home button (usually want to keep this)
        ]
    };

    // Check if extension context is valid
    function isExtensionValid() {
        try {
            // Try to access chrome.runtime
            return chrome.runtime && chrome.runtime.id;
        } catch (e) {
            return false;
        }
    }

    // Function to notify background script that content script is ready
    async function notifyReady() {
        if (!isExtensionValid()) {
            console.warn('Extension context invalid during notifyReady');
            return false;
        }

        try {
            await chrome.runtime.sendMessage({ type: 'contentScriptReady' });
            return true;
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('Extension context invalidated during notifyReady');
                return false;
            }
            console.error('Error notifying ready status:', error);
            return false;
        }
    }

    // Function to get all sidebar items
    function getSidebarItems() {
        const items = new Set();
        try {
            const mainNav = document.querySelector('nav[role="navigation"]');
            if (!mainNav) return Array.from(items);

            // Add regular menu items
            mainNav.querySelectorAll('a[role="link"]').forEach(item => {
                const text = item.textContent.trim();
                const shouldExclude = state.EXCLUDED_ITEMS.some(pattern => pattern.test(text));
                
                if (text && !shouldExclude) {
                    items.add(text);
                }
            });

            // Specifically add the More menu
            const moreMenu = document.querySelector('[data-testid="AppTabBar_More_Menu"]');
            if (moreMenu) {
                items.add('More');
            }

        } catch (error) {
            console.error('Error getting sidebar items:', error);
        }
        return Array.from(items);
    }

    // Function to send sidebar items to popup with retry
    async function sendSidebarItems() {
        if (!isExtensionValid()) {
            console.warn('Extension context invalid during sendSidebarItems');
            return;
        }

        try {
            const items = getSidebarItems();
            if (items.length === 0) {
                if (state.retryCount < state.MAX_RETRIES) {
                    state.retryCount++;
                    console.log(`No items found, retrying (${state.retryCount}/${state.MAX_RETRIES})...`);
                    setTimeout(sendSidebarItems, state.RETRY_DELAY);
                }
                return;
            }

            await chrome.runtime.sendMessage({
                type: 'sidebarItems',
                items: items
            });
            state.retryCount = 0;
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('Extension context invalidated during sendSidebarItems');
                return;
            }
            console.error('Error sending sidebar items:', error);
            if (state.retryCount < state.MAX_RETRIES) {
                state.retryCount++;
                setTimeout(sendSidebarItems, state.RETRY_DELAY);
            }
        }
    }

    // Function to remove unnecessary items from Twitter's left sidebar
    function cleanTwitterSidebar(settings = {}) {
        const mainNav = document.querySelector('nav[role="navigation"]');
        if (!mainNav) return;

        // Handle regular menu items
        mainNav.querySelectorAll('a[role="link"]').forEach(item => {
            const text = item.textContent.trim();
            const listItem = item.closest('div[role="none"]') || item;
            
            // Skip excluded items
            if (state.EXCLUDED_ITEMS.some(pattern => pattern.test(text))) {
                return;
            }

            // Handle visibility based on settings
            if (settings[text] === true) {
                listItem.style.display = 'none';
            } else {
                listItem.style.display = '';
            }
        });

        // Handle More menu specifically
        const moreMenu = document.querySelector('[data-testid="AppTabBar_More_Menu"]');
        if (moreMenu && settings['More'] === true) {
            const moreMenuItem = moreMenu.closest('div[role="none"]') || moreMenu;
            moreMenuItem.style.display = 'none';
        } else if (moreMenu) {
            const moreMenuItem = moreMenu.closest('div[role="none"]') || moreMenu;
            moreMenuItem.style.display = '';
        }
    }

    // Initialize the observer
    function initializeObserver() {
        if (state.isInitialized) return;
        
        try {
            // Clean up existing observer if it exists
            if (state.observer) {
                state.observer.disconnect();
            }

            state.observer = new MutationObserver(() => {
                if (!isExtensionValid()) {
                    state.observer.disconnect();
                    return;
                }
                cleanTwitterSidebar(state.currentSettings);
                sendSidebarItems();
            });

            state.observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            state.isInitialized = true;
        } catch (error) {
            console.error('Error initializing observer:', error);
        }
    }

    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!isExtensionValid()) {
            console.warn('Extension context invalid during message handling');
            sendResponse({ success: false, error: 'Extension context invalid' });
            return true;
        }

        try {
            switch (message.type) {
                case 'settingsUpdated':
                    cleanTwitterSidebar(message.settings);
                    sendResponse({ success: true });
                    break;
                case 'getSidebarItems':
                    sendSidebarItems();
                    sendResponse({ success: true });
                    break;
                case 'ping':
                    sendResponse({ success: true });
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
        return true;
    });

    // Initialize function
    async function initialize() {
        if (!isExtensionValid()) {
            console.warn('Extension context invalid during initialization');
            return;
        }

        try {
            // Notify background script that we're ready
            if (!await notifyReady()) {
                if (state.retryCount < state.MAX_RETRIES) {
                    state.retryCount++;
                    setTimeout(initialize, state.RETRY_DELAY);
                }
                return;
            }

            // Load saved settings
            const settings = await chrome.storage.sync.get(null);
            state.currentSettings = settings || {};
            
            // Initialize the sidebar
            cleanTwitterSidebar(state.currentSettings);
            initializeObserver();
            sendSidebarItems();
            
            console.log('Extension initialized successfully');
        } catch (error) {
            if (error.message.includes('Extension context invalidated')) {
                console.warn('Extension context invalidated during initialization');
                return;
            }
            console.error('Error during initialization:', error);
            if (!state.isInitialized && state.retryCount < state.MAX_RETRIES) {
                state.retryCount++;
                setTimeout(initialize, state.RETRY_DELAY);
            }
        }
    }

    // Start initialization with a small delay to ensure the page is ready
    setTimeout(initialize, state.RETRY_DELAY);
})();

// Keep track of current items and settings
let currentItems = [];
let currentSettings = {};
let retryCount = 0;
const MAX_RETRIES = 3;

// Function to check if we can connect to the tab
async function canConnectToTab(tabId) {
    try {
        await chrome.tabs.sendMessage(tabId, { type: 'ping' });
        return true;
    } catch (error) {
        return false;
    }
}

// Function to create a toggle switch for an item
function createToggleSwitch(itemName, checked) {
    const option = document.createElement('div');
    option.className = 'option';
    
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = itemName;
    
    const switchLabel = document.createElement('label');
    switchLabel.className = 'switch';
    
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = itemName;
    input.checked = checked;
    
    // Add change listener to individual toggle
    input.addEventListener('change', () => {
        saveSettings({
            ...currentSettings,
            [itemName]: input.checked
        });
    });
    
    const slider = document.createElement('span');
    slider.className = 'slider';
    
    switchLabel.appendChild(input);
    switchLabel.appendChild(slider);
    
    option.appendChild(label);
    option.appendChild(switchLabel);
    
    return option;
}

// Function to update the popup with sidebar items
function updatePopup(items, savedSettings) {
    currentItems = items;
    currentSettings = savedSettings;
    
    const container = document.getElementById('options-container');
    container.innerHTML = ''; // Clear existing options
    
    if (items.length === 0) {
        container.innerHTML = '<div class="loading">Loading items... Please wait.</div>';
        return;
    }
    
    items.forEach(item => {
        const isChecked = savedSettings[item] || false;
        const toggle = createToggleSwitch(item, isChecked);
        container.appendChild(toggle);
    });
}

// Function to save settings with retry
async function saveSettings(settings) {
    try {
        currentSettings = settings;
        
        // Save to storage
        await chrome.storage.sync.set(settings);
        
        // Show save message
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.classList.add('visible');
        
        // Hide message after 2 seconds
        setTimeout(() => {
            saveMessage.classList.remove('visible');
        }, 2000);
        
        // Send message to content script to update
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (tabs[0]) {
            try {
                await chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'settingsUpdated',
                    settings: settings
                });
            } catch (error) {
                console.warn('Could not update content script, will apply on next page load:', error);
            }
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        // Show error message
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.textContent = 'Error saving settings';
        saveMessage.style.color = '#ff4444';
        saveMessage.classList.add('visible');
        
        setTimeout(() => {
            saveMessage.classList.remove('visible');
            saveMessage.textContent = 'Settings saved!';
            saveMessage.style.color = '';
        }, 2000);
    }
}

// Function to request sidebar items with retry
async function requestSidebarItems() {
    try {
        const tabs = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tabs[0]) {
            throw new Error('No active tab found');
        }

        const canConnect = await canConnectToTab(tabs[0].id);
        if (!canConnect) {
            throw new Error('Cannot connect to tab');
        }

        await chrome.tabs.sendMessage(tabs[0].id, {
            type: 'getSidebarItems'
        });
    } catch (error) {
        console.error('Error requesting sidebar items:', error);
        if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(requestSidebarItems, 1000);
        } else {
            const container = document.getElementById('options-container');
            container.innerHTML = '<div class="loading">Could not load items. Please refresh Twitter/X and try again.</div>';
        }
    }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get saved settings first
        const savedSettings = await chrome.storage.sync.get(null);
        currentSettings = savedSettings || {};
        
        // Request sidebar items from content script
        await requestSidebarItems();
    } catch (error) {
        console.error('Error initializing popup:', error);
        const container = document.getElementById('options-container');
        container.innerHTML = '<div class="loading">Error loading settings. Please try again.</div>';
    }
});

// Listen for sidebar items from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'sidebarItems') {
        updatePopup(message.items, currentSettings);
    }
});

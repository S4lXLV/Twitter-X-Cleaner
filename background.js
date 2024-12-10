// Keep track of content script status
let contentScriptStatus = new Map();

// Listen for connection status from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'contentScriptReady') {
        contentScriptStatus.set(sender.tab.id, true);
        sendResponse({ success: true });
    }
    return true;
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
        // Reset content script status for this tab
        contentScriptStatus.set(tabId, false);
        
        // Inject the content script
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
        }).catch(error => console.error('Error injecting content script:', error));
    }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    contentScriptStatus.delete(tabId);
});

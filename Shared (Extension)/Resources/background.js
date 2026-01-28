// Feedly Follower - Background Script
// Checks if visited websites match Feedly subscriptions

const FEEDLY_API_URL = 'https://api.feedly.com/v3/collections?withStats=true&ct=feedly.desktop&cv=31.0.2930';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

let subscriptionDomains = new Map(); // domain -> { feedTitle, collectionLabel, feedId }
let lastFetchTime = 0;

// Extract domain from URL
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        // Remove www. prefix for matching
        return urlObj.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
}

// Extract domain from feed website or feed ID
function extractFeedDomain(feed) {
    // Try website field first
    if (feed.website) {
        const domain = extractDomain(feed.website);
        if (domain) return domain;
    }

    if (feed.private) {
        return null
    }

    // Try to extract from feed ID (format: feed/http://example.com/feed)
    if (feed.id && feed.id.startsWith('feed/')) {
        const feedUrl = feed.id.substring(5);
        const domain = extractDomain(feedUrl);
        if (domain) return domain;
    }

    return null;
}

// Fetch collections from Feedly API
async function fetchCollections() {
    const { feedlyToken } = await browser.storage.local.get('feedlyToken');

    if (!feedlyToken) {
        console.log('Feedly token not set. Use the popup to configure.');
        return false;
    }

    try {
        const response = await fetch(FEEDLY_API_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${feedlyToken}`,
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            console.error('Feedly API error:', response.status);
            return false;
        }

        const collections = await response.json();

        // Build domain -> subscription map
        subscriptionDomains.clear();

        for (const collection of collections) {
            const collectionLabel = collection.label || 'Uncategorized';

            if (collection.feeds) {
                for (const feed of collection.feeds) {
                    const domain = extractFeedDomain(feed);
                    if (domain) {
                        subscriptionDomains.set(domain, {
                            feedTitle: feed.title || 'Unknown Feed',
                            collectionLabel: collectionLabel,
                            feedId: feed.id
                        });
                    }
                }
            }
        }

        lastFetchTime = Date.now();
        console.log(`Loaded ${subscriptionDomains.size} subscription domains`);
        return true;

    } catch (error) {
        console.error('Error fetching Feedly collections:', error);
        return false;
    }
}

// Check if we need to refresh the cache
async function ensureFreshData() {
    if (Date.now() - lastFetchTime > CACHE_DURATION_MS) {
        await fetchCollections();
    }
}

// Update popup state based on whether token is configured
async function updatePopupState() {
    const { feedlyToken } = await browser.storage.local.get('feedlyToken');
    if (feedlyToken) {
        // Disable popup so onClicked fires
        await browser.action.setPopup({ popup: '' });
    } else {
        // Enable popup for token configuration
        await browser.action.setPopup({ popup: 'popup.html' });
    }
}

// Check if a URL matches any subscription
function findSubscription(url) {
    const domain = extractDomain(url);
    if (!domain) return null;

    // Direct match
    if (subscriptionDomains.has(domain)) {
        return subscriptionDomains.get(domain);
    }

    // Check if any subscription domain is a suffix (e.g., blog.example.com matches example.com)
    for (const [subDomain, info] of subscriptionDomains) {
        if (domain === subDomain || domain.endsWith('.' + subDomain)) {
            return info;
        }
    }

    return null;
}

// Update the extension icon for a tab
async function updateIconForTab(tabId, url) {
    if (!url || url.startsWith('about:') || url.startsWith('chrome:') || url.startsWith('safari:')) {
        return;
    }

    await ensureFreshData();

    const subscription = findSubscription(url);

    if (subscription) {
        await browser.action.setIcon({
            tabId: tabId,
            path: 'images/checkmark.circle.green.svg'
        });
        await browser.action.setTitle({
            tabId: tabId,
            title: `Subscribed: ${subscription.feedTitle} (${subscription.collectionLabel})`
        });
    } else {
        await browser.action.setIcon({
            tabId: tabId,
            path: 'images/plus.circle.svg'
        });
        await browser.action.setTitle({
            tabId: tabId,
            title: 'Subscribe to this site'
        });
    }
}

// Handle toolbar icon click (only fires when popup is disabled)
browser.action.onClicked.addListener(async (tab) => {
    await ensureFreshData();
    const subscription = findSubscription(tab.url);
    const domain = extractDomain(tab.url);

    if (subscription) {
        // Open the feed in Feedly
        const encodedFeedId = encodeURIComponent(subscription.feedId);
        await browser.tabs.create({
            url: `https://feedly.com/i/subscription/${encodedFeedId}`
        });
    } else if (domain) {
        // Open discover page for this domain
        const encodedDomain = encodeURIComponent(`suggesto/https://${domain}`);
        await browser.tabs.create({
            url: `https://feedly.com/i/discover?query=${encodedDomain}`
        });
    }
});

// Listen for tab updates
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
        updateIconForTab(tabId, tab.url);
    }
});

// Listen for tab activation (switching tabs)
browser.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (tab.url) {
        updateIconForTab(tab.id, tab.url);
    }
});

// Handle messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'setToken') {
        browser.storage.local.set({ feedlyToken: request.token }).then(() => {
            lastFetchTime = 0; // Force refresh
            fetchCollections().then(success => {
                updatePopupState();
                return { success, count: subscriptionDomains.size };
            });
        });
        return Promise.resolve({ success: true });
    }

    if (request.action === 'getStatus') {
        return Promise.resolve({
            hasToken: lastFetchTime > 0 || subscriptionDomains.size > 0,
            subscriptionCount: subscriptionDomains.size,
            lastFetch: lastFetchTime
        });
    }

    if (request.action === 'refresh') {
        lastFetchTime = 0;
        return fetchCollections().then(success => ({
            success,
            count: subscriptionDomains.size
        }));
    }
});

// Initial load
fetchCollections().then(() => {
    updatePopupState();
});

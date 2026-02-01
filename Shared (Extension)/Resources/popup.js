async function init() {
    const statusText = document.getElementById('statusText');
    const subscriptionCount = document.getElementById('subscriptionCount');
    const tokenInput = document.getElementById('tokenInput');
    const saveTokenBtn = document.getElementById('saveToken');
    const refreshBtn = document.getElementById('refreshBtn');
    const siteStatusText = document.getElementById('siteStatusText');
    const actionBtn = document.getElementById('actionBtn');

    let currentSubscription = null;
    let currentDomain = null;

    // Check current tab's subscription status
    async function checkCurrentTab() {
        try {
            const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab || !tab.url || tab.url.startsWith('about:') || tab.url.startsWith('chrome:') || tab.url.startsWith('safari:')) {
                siteStatusText.textContent = 'No site to check';
                actionBtn.style.display = 'none';
                return;
            }

            const result = await browser.runtime.sendMessage({ action: 'checkSubscription', url: tab.url });
            currentDomain = result.domain;

            if (result.isSubscribed) {
                currentSubscription = result.subscription;
                siteStatusText.textContent = `Subscribed: ${result.subscription.feedTitle}`;
                siteStatusText.className = 'connected';
                actionBtn.textContent = 'View Subscription';
                actionBtn.className = 'view-btn';
            } else {
                currentSubscription = null;
                siteStatusText.textContent = currentDomain ? `Not subscribed to ${currentDomain}` : 'No site to check';
                siteStatusText.className = '';
                actionBtn.textContent = 'Subscribe';
                actionBtn.className = 'subscribe-btn';
            }
            actionBtn.style.display = currentDomain ? 'block' : 'none';
        } catch (error) {
            siteStatusText.textContent = 'Error checking site';
            siteStatusText.className = 'disconnected';
            actionBtn.style.display = 'none';
        }
    }

    // Handle action button click
    actionBtn.addEventListener('click', async () => {
        if (currentSubscription) {
            // View existing subscription
            const encodedFeedId = encodeURIComponent(currentSubscription.feedId);
            await browser.tabs.create({
                url: `https://feedly.com/i/subscription/${encodedFeedId}`
            });
        } else if (currentDomain) {
            // Subscribe to new site
            const encodedDomain = encodeURIComponent(`suggesto/https://${currentDomain}`);
            await browser.tabs.create({
                url: `https://feedly.com/i/discover?query=${encodedDomain}`
            });
        }
        window.close();
    });

    // Load current status
    async function updateStatus() {
        try {
            const status = await browser.runtime.sendMessage({ action: 'getStatus' });
            if (status.subscriptionCount > 0) {
                statusText.textContent = 'Connected';
                statusText.className = 'connected';
                subscriptionCount.textContent = `${status.subscriptionCount} subscriptions loaded`;
            } else if (status.hasToken) {
                statusText.textContent = 'Token set, loading...';
                statusText.className = '';
            } else {
                statusText.textContent = 'Not configured';
                statusText.className = 'disconnected';
                subscriptionCount.textContent = 'Enter your Feedly token below';
            }
        } catch (error) {
            statusText.textContent = 'Error';
            statusText.className = 'disconnected';
        }
    }

    // Load saved token
    const { feedlyToken } = await browser.storage.local.get('feedlyToken');
    if (feedlyToken) {
        tokenInput.value = feedlyToken.substring(0, 20) + '...';
    }

    // Save token handler
    saveTokenBtn.addEventListener('click', async () => {
        const token = tokenInput.value.trim();
        if (!token || token.endsWith('...')) {
            alert('Please enter a valid token');
            return;
        }

        saveTokenBtn.textContent = 'Saving...';
        saveTokenBtn.disabled = true;

        try {
            await browser.storage.local.set({ feedlyToken: token });
            await browser.runtime.sendMessage({ action: 'refresh' });
            tokenInput.value = token.substring(0, 20) + '...';
            await updateStatus();
            await checkCurrentTab();
        } catch (error) {
            alert('Error saving token: ' + error.message);
        } finally {
            saveTokenBtn.textContent = 'Save Token';
            saveTokenBtn.disabled = false;
        }
    });

    // Refresh handler
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.textContent = 'Refreshing...';
        refreshBtn.disabled = true;

        try {
            const result = await browser.runtime.sendMessage({ action: 'refresh' });
            if (result.success) {
                subscriptionCount.textContent = `${result.count} subscriptions loaded`;
            } else {
                subscriptionCount.textContent = 'Failed to refresh';
            }
            await updateStatus();
            await checkCurrentTab();
        } catch (error) {
            alert('Error refreshing: ' + error.message);
        } finally {
            refreshBtn.textContent = 'Refresh Subscriptions';
            refreshBtn.disabled = false;
        }
    });

    // Initial status update
    await updateStatus();
    await checkCurrentTab();
}

document.addEventListener('DOMContentLoaded', init);

// Feedly Follower - Background Script
// Checks if visited websites match Feedly subscriptions

// https://www.val.town/x/cdignam/feedlyFollowerApi/environment-variables
const API_SECRET = "8Jqa1Q1JZtHfJI45dvqlrfEMbv+e7WFn9faWKJnDy0s=";

/**
 * Call val.town API to check subscription status for a url.
 @return {{subscribed: boolean, subscription: string | null, subscriptionUrl: string | null}}
 */
async function fetchSubscription(url) {
  const apiUrl = new URL("https://cdignam-feedly-follower.val.run/v1/subscription");
  apiUrl.search = new URLSearchParams({ url }).toString();

  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${API_SECRET}` } });

  if (!response.ok) {
    console.error("API error:", response.status);
    return false;
  }
  //
  return await response.json();
}

// Check if a URL matches any subscription
async function findSubscription(url) {
  return await fetchSubscription(url);
}

// Update the extension icon for a tab
async function updateIconForTab(tabId, url) {
  if (!url || url.startsWith("about:") || url.startsWith("chrome:") || url.startsWith("safari:")) {
    return;
  }

  

  const subscription = await findSubscription(url);

  if (subscription) {
    await browser.action.setIcon({
      tabId: tabId,
      path: "images/checkmark.circle.green.svg",
    });
    await browser.action.setTitle({
      tabId: tabId,
      title: `Subscribed`,
    });
  } else {
    await browser.action.setIcon({
      tabId: tabId,
      path: "images/plus.circle.svg",
    });
    await browser.action.setTitle({
      tabId: tabId,
      title: "Subscribe to this site",
    });
  }
}

// Listen for tab updates
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
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
  
  if (request.action === "checkSubscription") {
    
      return findSubscription(request.url);
    
  }
});

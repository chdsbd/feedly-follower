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
    return {subscribed: false, error: true}
  }

  return await response.json();
}

// Handle messages from popup
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkSubscription") {
    return fetchSubscription(request.url);
  }
});

// https://www.val.town/x/cdignam/feedlyFollowerApi/environment-variables
const API_SECRET = "8Jqa1Q1JZtHfJI45dvqlrfEMbv+e7WFn9faWKJnDy0s=";

async function fetchSubscription(url) {
  const apiUrl = new URL("https://cdignam-feedly-follower.val.run/v1/subscription");
  apiUrl.search = new URLSearchParams({ url }).toString();

  const response = await fetch(apiUrl, { headers: { Authorization: `Bearer ${API_SECRET}` } });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return await response.json();
}

async function init() {
  const actionBtn = document.getElementById("actionBtn");

  let currentSubscription = null;

  async function checkCurrentTab() {
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (
        !tab ||
        !tab.url ||
        tab.url.startsWith("about:") ||
        tab.url.startsWith("chrome:") ||
        tab.url.startsWith("safari:")
      ) {
        actionBtn.disabled = true
        actionBtn.textContent = "No site to check";
        return;
      }

      currentSubscription = await fetchSubscription(tab.url);
      actionBtn.disabled = false

      if (currentSubscription?.subscribed) {
        actionBtn.textContent = "View Subscription";
        actionBtn.className = "view-btn";
      } else {
        actionBtn.textContent = "Subscribe on Feedly";
        actionBtn.className = "subscribe-btn";
      }
    } catch (error) {
      actionBtn.textContent = `Error: ${error.message}`;
      console.error(error);
    }
  }

  actionBtn.addEventListener("click", async () => {
    if (currentSubscription?.subscriptionUrl) {
      await browser.tabs.create({
        url: currentSubscription.subscriptionUrl,
      });
    } else {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const encodedDomain = encodeURIComponent(`suggesto/${tab.url}`);
      await browser.tabs.create({
        url: `https://feedly.com/i/discover?query=${encodedDomain}`,
      });
    }
    window.close();
  });

  actionBtn.style.minWidth = `${actionBtn.offsetWidth}px`;
  await checkCurrentTab();
}

document.addEventListener("DOMContentLoaded", init);

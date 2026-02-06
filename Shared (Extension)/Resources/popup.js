async function init() {
  const statusText = document.getElementById("statusText");
  const subscriptionCount = document.getElementById("subscriptionCount");
  const refreshBtn = document.getElementById("refreshBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const siteStatusText = document.getElementById("siteStatusText");
  const actionBtn = document.getElementById("actionBtn");

  let currentSubscription = null;
  let currentDomain = null;

  // Check current tab's subscription status
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
        siteStatusText.textContent = "No site to check";
        return;
      }

      currentSubscription = await browser.runtime.sendMessage({
        action: "checkSubscription",
        url: tab.url,
      });

      if (currentSubscription?.subscribed) {
        actionBtn.textContent = "View Subscription";
        actionBtn.className = "view-btn";
      } else {
        actionBtn.textContent = "Subscribe on Feedly";
        actionBtn.className = "subscribe-btn";
      }
      actionBtn.style.display = "block";
    } catch (error) {
      siteStatusText.textContent = `Error checking site ${error}`;
      siteStatusText.className = "disconnected";
      console.error(error)
    }
  }

  // Handle action button click
  actionBtn.addEventListener("click", async () => {
    if (currentSubscription?.subscriptionUrl) {
      // View existing subscription
      await browser.tabs.create({
        url: currentSubscription.subscriptionUrl,
      });
    } else {
      // Subscribe to new site
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      const encodedDomain = encodeURIComponent(`suggesto/${tab.url}`);
      await browser.tabs.create({
        url: `https://feedly.com/i/discover?query=${encodedDomain}`,
      });
    }
    window.close();
  });

  // Settings button handler
  // settingsBtn.addEventListener("click", () => {
  //   browser.runtime.openOptionsPage();
  // });


  await checkCurrentTab();
}

document.addEventListener("DOMContentLoaded", init);

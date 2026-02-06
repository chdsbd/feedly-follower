async function init() {
  const tokenInput = document.getElementById("tokenInput");
  const saveTokenBtn = document.getElementById("saveToken");
  const backBtn = document.getElementById("backBtn");

  // Load saved token
  const { feedlyToken } = await browser.storage.local.get("feedlyToken");
  if (feedlyToken) {
    tokenInput.value = feedlyToken.substring(0, 20) + "...";
  }

  // Save token handler
  saveTokenBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (!token || token.endsWith("...")) {
      alert("Please enter a valid token");
      return;
    }

    saveTokenBtn.textContent = "Saving...";
    saveTokenBtn.disabled = true;

    try {
      await browser.storage.local.set({ feedlyToken: token });
      await browser.runtime.sendMessage({ action: "refresh" });
      tokenInput.value = token.substring(0, 20) + "...";
      alert("Token saved successfully!");
    } catch (error) {
      alert("Error saving token: " + error.message);
    } finally {
      saveTokenBtn.textContent = "Save Token";
      saveTokenBtn.disabled = false;
    }
  });

  // Back button handler
  backBtn.addEventListener("click", () => {
    window.location.href = browser.runtime.getURL("popup.html");
  });
}

document.addEventListener("DOMContentLoaded", init);

// popup.js — partner selector + opens SpeakUp with context

// ✏️ Change this to your production URL when deploying
const APP_URL = "https://speakup-kappa.vercel.app";

let pageContext = "";
let selectedDisc = null;

// Load page context from the active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "GET_CONTEXT" }, (response) => {
    if (chrome.runtime.lastError || !response) {
      document.getElementById("page-title").textContent =
        "Could not read page — try refreshing first.";
      return;
    }

    const { title, excerpt } = response;
    document.getElementById("page-title").textContent =
      title || "(No title)";
    pageContext = excerpt || "";
  });
});

// Partner selection
document.querySelectorAll(".partner-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".partner-btn").forEach((b) =>
      b.classList.remove("selected")
    );
    btn.classList.add("selected");
    selectedDisc = btn.dataset.disc;
    updateOpenBtn();
  });
});

function updateOpenBtn() {
  const openBtn = document.getElementById("open-btn");
  if (selectedDisc) {
    openBtn.disabled = false;
    const names = { D: "Jordan", I: "Sam", S: "Alex", C: "Morgan" };
    openBtn.textContent = `Open with ${names[selectedDisc]} →`;
  } else {
    openBtn.disabled = true;
    openBtn.textContent = "Select a partner to start →";
  }
}

// Open SpeakUp with context + partner
document.getElementById("open-btn").addEventListener("click", () => {
  if (!selectedDisc) return;

  const params = new URLSearchParams({
    context: pageContext,
    partner: selectedDisc,
  });

  chrome.tabs.create({ url: `${APP_URL}?${params.toString()}` });
  window.close();
});

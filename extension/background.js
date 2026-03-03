// background.js — service worker (minimal)

chrome.runtime.onInstalled.addListener(() => {
  console.log("SpeakUp extension installed.");
});

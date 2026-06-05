/**
 * background.js — PageBrief service worker (Manifest V3)
 *
 * Responsibilities:
 *  - Handle the extension icon click (action) to open the popup.
 *  - Listen for messages from the popup that require elevated permissions
 *    (e.g. scripting injection on restricted pages) and respond gracefully.
 *  - Keep the extension badge clear by default.
 */

"use strict";

// ─── Extension install / update ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    console.log("[PageBrief] Extension installed.");
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    if (chrome.action && chrome.action.openPopup) {
      chrome.action.openPopup().catch(() => {
        // No-op: popup command may be unavailable in older Chromium builds.
      });
    }
  }
});

// ─── Message handler ──────────────────────────────────────────────────────────
/**
 * The popup sends a CHECK_TAB message to verify whether scripting injection
 * is permitted on the active tab (e.g. chrome:// pages block it).
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CHECK_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab) {
        sendResponse({ ok: false, reason: "No active tab." });
        return;
      }

      const url = tab.url || "";
      const restricted =
        url.startsWith("chrome://") ||
        url.startsWith("chrome-extension://") ||
        url.startsWith("about:") ||
        url.startsWith("edge://");

      sendResponse({ ok: !restricted, tabId: tab.id, url });
    });
    return true; // async response
  }
});

/**
 * content.js — PageBrief content script
 *
 * This script is injected into every page at document_idle.
 * It listens for a message from the popup (or background) requesting
 * page text extraction and responds with the cleaned text.
 *
 * The popup also uses chrome.scripting.executeScript to inject the
 * extractPageText function directly, so this content script acts as
 * a lightweight message bridge for environments where scripting injection
 * is not available (e.g. chrome:// pages).
 */

"use strict";

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_TEXT") {
    try {
      const data = extractPageText();
      sendResponse({ ok: true, data });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  }
  // Return true to keep the message channel open for async response
  return true;
});

/**
 * Walks the live DOM and returns cleaned visible text content.
 * Skips non-content elements (scripts, styles, media, etc.).
 */
function extractPageText() {
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "IFRAME",
    "SVG", "CANVAS", "IMG", "VIDEO", "AUDIO",
    "HEAD", "META", "LINK",
  ]);

  function walk(node) {
    if (!node) return "";
    if (SKIP_TAGS.has(node.nodeName)) return "";
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent.trim();
    }
    const parts = [];
    for (const child of node.childNodes) {
      const t = walk(child);
      if (t) parts.push(t);
    }
    return parts.join(" ");
  }

  const rawText = walk(document.body || document.documentElement);
  const cleaned = rawText.replace(/\s+/g, " ").trim();

  // Limit to ~6 000 words to stay within the OpenAI token budget
  const words = cleaned.split(" ");
  const text  = words.slice(0, 6000).join(" ");

  return { text, title: document.title, url: location.href };
}

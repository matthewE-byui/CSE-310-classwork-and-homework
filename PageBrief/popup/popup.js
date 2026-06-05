"use strict";

const PROVIDERS = {
  openai: {
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o"],
    validateKey: (key) => key.startsWith("sk-"),
  },
  anthropic: {
    label: "Anthropic",
    models: ["claude-3-5-haiku-latest", "claude-3-7-sonnet-latest"],
    validateKey: (key) => key.startsWith("sk-ant-"),
  },
  gemini: {
    label: "Google Gemini",
    models: ["gemini-1.5-flash", "gemini-1.5-pro"],
    validateKey: (key) => key.length > 20,
  },
};

const MAX_HISTORY = 20;
const PLAN_LIMITS = { free: 15, pro: 500, team: 5000, enterprise: 100000 };

const btnSummarize = document.getElementById("btn-summarize");
const btnResummarize = document.getElementById("btn-resummarize");
const btnHighlight = document.getElementById("btn-highlight");
const btnHistory = document.getElementById("btn-history");
const btnSettings = document.getElementById("btn-settings");
const btnBack = document.getElementById("btn-back");
const btnSettingsBack = document.getElementById("btn-settings-back");
const btnClearHistory = document.getElementById("btn-clear-history");
const btnCopy = document.getElementById("btn-copy");
const btnCopyMd = document.getElementById("btn-copy-md");
const btnSaveKey = document.getElementById("btn-save-key");
const btnSaveKeySettings = document.getElementById("btn-save-key-settings");
const btnOnboardingSave = document.getElementById("btn-onboarding-save");
const btnAccountLogin = document.getElementById("btn-account-login");
const btnAccountLogout = document.getElementById("btn-account-logout");
const btnUpgrade = document.getElementById("btn-upgrade");
const btnOpenPrivacy = document.getElementById("btn-open-privacy");
const btnOpenTerms = document.getElementById("btn-open-terms");
const btnChatSend = document.getElementById("btn-chat-send");
const btnChatClear = document.getElementById("btn-chat-clear");

const providerSelect = document.getElementById("provider-select");
const modelSelect = document.getElementById("model-select");
const darkModeToggle = document.getElementById("dark-mode-toggle");
const autoHighlightToggle = document.getElementById("auto-highlight-toggle");
const nicheSelect = document.getElementById("niche-select");
const nicheSelectSettings = document.getElementById("niche-select-settings");
const backendUrlInput = document.getElementById("backend-url-input");
const accountEmailInput = document.getElementById("account-email-input");
const chatInput = document.getElementById("chat-input");

const apiKeySection = document.getElementById("api-key-section");
const apiKeyInput = document.getElementById("api-key-input");
const apiKeyInputSettings = document.getElementById("api-key-input-settings");

const viewMain = document.getElementById("view-main");
const viewHistory = document.getElementById("view-history");
const viewSettings = document.getElementById("view-settings");
const statusEl = document.getElementById("status");
const contentMetrics = document.getElementById("content-metrics");
const pageChangeMsg = document.getElementById("page-change-msg");
const upgradeBanner = document.getElementById("upgrade-banner");
const onboardingCard = document.getElementById("onboarding-card");
const accountStatus = document.getElementById("account-status");
const usageStatus = document.getElementById("usage-status");
const resultArea = document.getElementById("result-area");
const resultTitle = document.getElementById("result-title");
const summaryContent = document.getElementById("summary-content");
const historyList = document.getElementById("history-list");
const historyEmpty = document.getElementById("history-empty");
const chatMessages = document.getElementById("chat-messages");
const pills = document.querySelectorAll(".pill");

let currentStyle = "bullet";
let currentProvider = "openai";
let currentModel = "gpt-4o-mini";
let currentNiche = "academic";
let apiKeys = {};
let settings = {
  forceDarkMode: false,
  autoHighlight: false,
};
let account = {
  backendUrl: "http://localhost:8787",
  token: "",
  email: "",
  plan: "free",
  usage: { count: 0, dailyLimit: PLAN_LIMITS.free },
};
let onboardingDone = false;
let lastExtracted = null;
let lastSummary = null;
let highlightsActive = false;
let currentPageUrl = "";
let currentChatSession = [];

(async function init() {
  const stored = await storageGet([
    "apiKey",
    "apiKeys",
    "provider",
    "model",
    "settings",
    "lastSummarizedUrl",
    "onboardingDone",
    "niche",
    "account",
    "localUsage"
  ]);

  apiKeys = stored.apiKeys || {};
  if (stored.apiKey && !apiKeys.openai) apiKeys.openai = stored.apiKey;

  currentProvider = stored.provider && PROVIDERS[stored.provider] ? stored.provider : "openai";
  currentNiche = stored.niche || "academic";
  onboardingDone = Boolean(stored.onboardingDone);
  settings = { ...settings, ...(stored.settings || {}) };
  account = { ...account, ...(stored.account || {}) };

  darkModeToggle.checked = Boolean(settings.forceDarkMode);
  autoHighlightToggle.checked = Boolean(settings.autoHighlight);
  if (settings.forceDarkMode) document.body.classList.add("force-dark");

  providerSelect.value = currentProvider;
  populateModelSelect();

  const preferredModel = stored.model;
  if (preferredModel && PROVIDERS[currentProvider].models.includes(preferredModel)) {
    currentModel = preferredModel;
  } else {
    currentModel = PROVIDERS[currentProvider].models[0];
  }
  modelSelect.value = currentModel;

  nicheSelect.value = currentNiche;
  if (nicheSelectSettings) nicheSelectSettings.value = currentNiche;
  backendUrlInput.value = account.backendUrl || "http://localhost:8787";
  accountEmailInput.value = account.email || "";

  syncKeyUI();
  refreshOnboarding();
  await refreshAccountStatus();

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && stored.lastSummarizedUrl && tab.url !== stored.lastSummarizedUrl) {
    pageChangeMsg.textContent = "New page detected. Click Summarize to refresh your brief.";
    pageChangeMsg.classList.remove("hidden");
  }
})();

pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    pills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    currentStyle = pill.dataset.style;
  });
});

providerSelect.addEventListener("change", async () => {
  currentProvider = providerSelect.value;
  populateModelSelect();
  currentModel = modelSelect.value;
  syncKeyUI();
  await storageSet({ provider: currentProvider, model: currentModel });
});

modelSelect.addEventListener("change", async () => {
  currentModel = modelSelect.value;
  await storageSet({ model: currentModel });
});

nicheSelect.addEventListener("change", async () => {
  currentNiche = nicheSelect.value;
  if (nicheSelectSettings) nicheSelectSettings.value = currentNiche;
  await storageSet({ niche: currentNiche });
});

if (nicheSelectSettings) {
  nicheSelectSettings.addEventListener("change", async () => {
    currentNiche = nicheSelectSettings.value;
    nicheSelect.value = currentNiche;
    await storageSet({ niche: currentNiche });
    showStatus(`Primary workflow updated to ${nicheLabel(currentNiche)}.`, false);
    setTimeout(hideStatus, 1200);
  });
}

darkModeToggle.addEventListener("change", async () => {
  settings.forceDarkMode = darkModeToggle.checked;
  document.body.classList.toggle("force-dark", settings.forceDarkMode);
  await storageSet({ settings });
});

autoHighlightToggle.addEventListener("change", async () => {
  settings.autoHighlight = autoHighlightToggle.checked;
  await storageSet({ settings });
});

btnSaveKey.addEventListener("click", saveCurrentProviderKeyFromInline);
btnSaveKeySettings.addEventListener("click", saveCurrentProviderKeyFromSettings);
btnOnboardingSave.addEventListener("click", completeOnboarding);
btnHistory.addEventListener("click", async () => {
  showView("history");
  await renderHistory();
  await loadCurrentPageChatSession();
});
btnSettings.addEventListener("click", () => showView("settings"));
btnBack.addEventListener("click", () => showView("main"));
btnSettingsBack.addEventListener("click", () => showView("main"));

btnAccountLogin.addEventListener("click", loginAccount);
btnAccountLogout.addEventListener("click", logoutAccount);
btnUpgrade.addEventListener("click", startUpgradeFlow);
btnOpenPrivacy.addEventListener("click", () => openLegal("legal/privacy.html"));
btnOpenTerms.addEventListener("click", () => openLegal("legal/terms.html"));
  btnChatSend.addEventListener("click", () => handleSendChatQuestion());
  btnChatClear.addEventListener("click", () => clearCurrentPageChatSession());
  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendChatQuestion();
    }
  });

backendUrlInput.addEventListener("change", async () => {
  account.backendUrl = backendUrlInput.value.trim() || "http://localhost:8787";
  await persistAccount();
  await refreshAccountStatus();
});

btnClearHistory.addEventListener("click", async () => {
  if (!confirm("Clear all saved summaries?")) return;
  await storageSet({ history: [] });
  await renderHistory();
});

btnSummarize.addEventListener("click", async () => {
  await summarizeActivePage();
});

btnResummarize.addEventListener("click", async () => {
  if (!lastExtracted || !lastExtracted.text) return;
  await summarizeFromText(lastExtracted, true);
});

btnHighlight.addEventListener("click", async () => {
  if (!lastSummary || !lastSummary.url) return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (highlightsActive) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: clearPageBriefHighlights,
    });
    highlightsActive = false;
    btnHighlight.textContent = "Highlight Source";
    return;
  }

  const [{ result: highlightCount = 0 } = {}] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: highlightSummaryEvidence,
    args: [lastSummary.summary],
  });
  if (highlightCount > 0) {
    highlightsActive = true;
    btnHighlight.textContent = "Clear Highlight";
  } else {
    showStatus("No matching text found to highlight on this page.", true);
  }
});

btnCopy.addEventListener("click", async () => {
  const text = summaryContent.innerText || summaryContent.textContent;
  await navigator.clipboard.writeText(text || "");
  flashControl(btnCopy, "Copied");
});

btnCopyMd.addEventListener("click", async () => {
  if (!lastSummary) return;
  const markdown = buildMarkdownSummary(lastSummary);
  await navigator.clipboard.writeText(markdown);
  flashControl(btnCopyMd, "Done");
});

async function completeOnboarding() {
  onboardingDone = true;
  currentNiche = nicheSelect.value;
  if (nicheSelectSettings) nicheSelectSettings.value = currentNiche;
  await storageSet({ onboardingDone: true, niche: currentNiche });
  refreshOnboarding();
  showStatus(`Niche set to ${nicheLabel(currentNiche)}.`, false);
  setTimeout(hideStatus, 1200);
}

function refreshOnboarding() {
  onboardingCard.classList.toggle("hidden", onboardingDone);
}

async function saveCurrentProviderKeyFromInline() {
  apiKeyInputSettings.value = apiKeyInput.value;
  await saveCurrentProviderKey(apiKeyInput.value.trim());
}

async function saveCurrentProviderKeyFromSettings() {
  apiKeyInput.value = apiKeyInputSettings.value;
  await saveCurrentProviderKey(apiKeyInputSettings.value.trim());
}

async function saveCurrentProviderKey(key) {
  if (!PROVIDERS[currentProvider].validateKey(key)) {
    showStatus(`Invalid ${PROVIDERS[currentProvider].label} API key format.`, true);
    return;
  }
  apiKeys[currentProvider] = key;
  await storageSet({ apiKeys, provider: currentProvider });
  apiKeySection.classList.add("hidden");
  showStatus(`${PROVIDERS[currentProvider].label} API key saved.`, false);
  setTimeout(hideStatus, 1600);
}

async function loginAccount() {
  const email = accountEmailInput.value.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    showStatus("Please enter a valid account email.", true);
    return;
  }

  try {
    const backendUrl = backendUrlInput.value.trim() || "http://localhost:8787";
    const response = await fetch(`${backendUrl}/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Login failed");

    account = {
      ...account,
      backendUrl,
      token: data.token,
      email,
      plan: data.user?.plan || "free",
      usage: { count: 0, dailyLimit: PLAN_LIMITS[data.user?.plan || "free"] || PLAN_LIMITS.free },
    };
    await persistAccount();
    await refreshAccountStatus();
    showStatus("Account connected.", false);
    setTimeout(hideStatus, 1200);
  } catch (err) {
    showStatus(err.message || "Account login failed.", true);
  }
}

async function logoutAccount() {
  try {
    if (account.token) {
      await backendCall("/v1/auth/logout", { method: "POST" }).catch(() => null);
    }
  } finally {
    account.token = "";
    account.plan = "free";
    account.usage = { count: 0, dailyLimit: PLAN_LIMITS.free };
    await persistAccount();
    await refreshAccountStatus();
  }
}

async function refreshAccountStatus() {
  if (!account.token) {
    accountStatus.textContent = "Not signed in";
    usageStatus.textContent = "Usage: local free limit only";
    btnAccountLogout.disabled = true;
    btnAccountLogin.disabled = false;
    return;
  }

  try {
    const me = await backendCall("/v1/auth/me");
    account.plan = me.user?.plan || account.plan || "free";
    account.email = me.user?.email || account.email;
    account.usage = me.usage || account.usage;
    await persistAccount();

    accountStatus.textContent = `Signed in: ${account.email} (${account.plan.toUpperCase()})`;
    usageStatus.textContent = `Usage: ${account.usage.count}/${account.usage.dailyLimit} today`;
    btnAccountLogout.disabled = false;
    btnAccountLogin.disabled = false;
  } catch (_err) {
    accountStatus.textContent = "Session invalid. Sign in again.";
    usageStatus.textContent = "Usage: --";
    btnAccountLogout.disabled = true;
  }
}

async function startUpgradeFlow() {
  if (!account.token) {
    showStatus("Sign in first to start checkout.", true);
    return;
  }

  try {
    const priceId = "price_pro_placeholder";
    const data = await backendCall("/v1/billing/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId }),
    });

    if (!data.url) throw new Error("Checkout URL was not returned.");
    await chrome.tabs.create({ url: data.url });
  } catch (err) {
    showStatus(err.message || "Could not start checkout.", true);
  }
}

async function summarizeActivePage() {
  const key = apiKeys[currentProvider] || "";
  if (!key) {
    apiKeySection.classList.remove("hidden");
    showStatus(`Save a ${PROVIDERS[currentProvider].label} API key first.`, true);
    return;
  }

  const allowed = await assertUsageAvailable();
  if (!allowed.ok) {
    upgradeBanner.textContent = allowed.message;
    upgradeBanner.classList.remove("hidden");
    showStatus(allowed.message, true);
    return;
  }
  upgradeBanner.classList.add("hidden");

  setBusy(true);
  hideResult();
  showStatus("Extracting article content...");

  try {
    const tabCheck = await sendRuntimeMessage({ type: "CHECK_TAB" });
    if (!tabCheck.ok) throw new Error("This browser page is restricted and cannot be summarized.");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) throw new Error("No active tab found.");

    const [{ result: pageData }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractReadableContent,
    });

    if (!pageData || !pageData.text) throw new Error("Could not extract readable content from this page.");
    if (pageData.text.length < 30 && pageData.isPdf) {
      throw new Error("PDF detected but text extraction is limited on this viewer. Open the source PDF URL and try again.");
    }
    if (pageData.text.length < 30) throw new Error("Could not extract enough text from this page.");

    lastExtracted = {
      text: pageData.text,
      title: tab.title || pageData.title,
      url: tab.url || pageData.url,
      wordCount: pageData.wordCount || estimateWords(pageData.text),
      isPdf: Boolean(pageData.isPdf),
    };

    contentMetrics.textContent = `Extracted ${lastExtracted.wordCount} words (${lastExtracted.text.length.toLocaleString()} chars)`;
    contentMetrics.classList.remove("hidden");

    await summarizeFromText(lastExtracted, false);
  } catch (err) {
    showStatus(err.message || "Something went wrong.", true);
  } finally {
    setBusy(false);
  }
}

async function summarizeFromText(extracted, isResummary) {
  const key = apiKeys[currentProvider] || "";
  if (!key) throw new Error("Missing API key.");

  showStatus(isResummary ? "Re-summarizing with current style..." : "Generating summary...");
  const summary = await callProviderApi({
    provider: currentProvider,
    model: currentModel,
    apiKey: key,
    text: extracted.text,
    style: currentStyle,
    niche: currentNiche,
  });

  const payload = {
    url: extracted.url,
    title: extracted.title,
    style: currentStyle,
    provider: currentProvider,
    model: currentModel,
    niche: currentNiche,
    summary,
    date: Date.now(),
    pinned: false,
  };

  lastSummary = payload;
  renderSummary(summary);
  await saveToHistory(payload);
  await storageSet({ lastSummarizedUrl: extracted.url });
  await consumeUsage({ chars: extracted.text.length, provider: currentProvider, model: currentModel });

  btnResummarize.disabled = false;
  btnHighlight.disabled = false;

  if (settings.autoHighlight) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      const [{ result: highlightCount = 0 } = {}] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: highlightSummaryEvidence,
        args: [summary],
      });
      if (highlightCount > 0) {
        highlightsActive = true;
        btnHighlight.textContent = "Clear Highlight";
      }
    }
  }
}

async function assertUsageAvailable() {
  if (account.token) {
    try {
      const usage = await backendCall("/v1/usage");
      account.usage = usage;
      await persistAccount();
      await refreshAccountStatus();

      if (usage.remaining <= 0) {
        return { ok: false, message: "Daily account limit reached. Upgrade your plan to continue." };
      }
      return { ok: true };
    } catch (_err) {
      // Fall back to local usage tracking.
    }
  }

  const localUsage = await getLocalUsage();
  const limit = PLAN_LIMITS.free;
  if (localUsage.count >= limit) {
    return { ok: false, message: "Local free limit reached (15/day). Connect account and upgrade for more." };
  }
  return { ok: true };
}

async function consumeUsage(meta = {}) {
  if (account.token) {
    try {
      const response = await backendCall("/v1/usage/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ units: 1, meta }),
      });
      account.usage = { count: response.count, dailyLimit: response.dailyLimit };
      await persistAccount();
      await refreshAccountStatus();
      return;
    } catch (_err) {
      // Fall back to local usage tracking.
    }
  }

  const localUsage = await getLocalUsage();
  localUsage.count += 1;
  await storageSet({ localUsage });
  usageStatus.textContent = `Usage: ${localUsage.count}/${PLAN_LIMITS.free} local free today`;
}

async function getLocalUsage() {
  const { localUsage } = await storageGet(["localUsage"]);
  const today = new Date().toISOString().slice(0, 10);
  if (!localUsage || localUsage.date !== today) {
    return { date: today, count: 0 };
  }
  return localUsage;
}

async function loadCurrentPageChatSession() {
  try {
    const tab = await getActiveTabInfo();
    currentPageUrl = tab?.url || "";
    if (!currentPageUrl) {
      currentChatSession = [];
      renderChatSession();
      return;
    }

    const { chatSessions = {} } = await storageGet(["chatSessions"]);
    currentChatSession = Array.isArray(chatSessions[currentPageUrl]) ? chatSessions[currentPageUrl] : [];
    renderChatSession();
  } catch (_err) {
    currentChatSession = [];
    renderChatSession();
  }
}

function renderChatSession() {
  chatMessages.innerHTML = "";

  if (!currentChatSession.length) {
    const empty = document.createElement("div");
    empty.className = "chat-msg assistant";
    empty.textContent = "Ask a question about the current page and I will answer with source snippets.";
    chatMessages.appendChild(empty);
    return;
  }

  currentChatSession.forEach((msg) => {
    const row = document.createElement("div");
    row.className = `chat-msg ${msg.role === "user" ? "user" : "assistant"}`;
    row.textContent = msg.content || "";

    if (msg.role === "assistant" && Array.isArray(msg.citations) && msg.citations.length) {
      const citations = document.createElement("div");
      citations.className = "chat-citations";
      citations.textContent = "Sources:";

      msg.citations.forEach((citation) => {
        const item = document.createElement("div");
        item.className = "chat-citation-item";
        item.textContent = `[${citation.id}] ${citation.snippet}`;
        citations.appendChild(item);
      });

      row.appendChild(citations);
    }

    chatMessages.appendChild(row);
  });

  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function saveCurrentPageChatSession() {
  if (!currentPageUrl) return;
  const { chatSessions = {} } = await storageGet(["chatSessions"]);
  chatSessions[currentPageUrl] = currentChatSession.slice(-20);
  await storageSet({ chatSessions });
}

async function clearCurrentPageChatSession() {
  if (!currentPageUrl) {
    currentChatSession = [];
    renderChatSession();
    return;
  }

  const { chatSessions = {} } = await storageGet(["chatSessions"]);
  delete chatSessions[currentPageUrl];
  await storageSet({ chatSessions });
  currentChatSession = [];
  renderChatSession();
}

async function handleSendChatQuestion() {
  const question = (chatInput.value || "").trim();
  if (!question) return;

  const key = apiKeys[currentProvider] || "";
  if (!key) {
    apiKeySection.classList.remove("hidden");
    showStatus(`Save a ${PROVIDERS[currentProvider].label} API key first.`, true);
    return;
  }

  const allowed = await assertUsageAvailable();
  if (!allowed.ok) {
    upgradeBanner.textContent = allowed.message;
    upgradeBanner.classList.remove("hidden");
    showStatus(allowed.message, true);
    return;
  }
  upgradeBanner.classList.add("hidden");

  chatInput.value = "";
  const userMessage = { role: "user", content: question, date: Date.now() };
  currentChatSession.push(userMessage);
  renderChatSession();

  btnChatSend.disabled = true;
  showStatus("Finding relevant parts of the page...");

  try {
    const extracted = await ensureExtractedForChat();
    const chunks = buildSourceChunks(extracted.text);
    const topChunks = selectTopChunks(question, chunks, 4);

    if (!topChunks.length) {
      throw new Error("Could not find enough relevant page content to answer this question.");
    }

    showStatus("Generating grounded answer...");
    const answer = await callProviderChatQA({
      provider: currentProvider,
      model: currentModel,
      apiKey: key,
      question,
      chunks: topChunks,
      niche: currentNiche,
    });

    const citations = topChunks.map((chunk, index) => ({
      id: `S${index + 1}`,
      snippet: chunk.text.slice(0, 220).replace(/\s+/g, " ").trim(),
    }));

    currentChatSession.push({
      role: "assistant",
      content: answer,
      citations,
      date: Date.now(),
    });

    await saveCurrentPageChatSession();
    await consumeUsage({
      type: "chat",
      chars: question.length + topChunks.reduce((sum, chunk) => sum + chunk.text.length, 0),
      provider: currentProvider,
      model: currentModel,
    });

    hideStatus();
  } catch (err) {
    currentChatSession.push({
      role: "assistant",
      content: err.message || "Could not answer that question.",
      date: Date.now(),
    });
    showStatus(err.message || "Could not answer that question.", true);
  } finally {
    renderChatSession();
    btnChatSend.disabled = false;
  }
}

async function ensureExtractedForChat() {
  const tab = await getActiveTabInfo();
  if (!tab?.id) throw new Error("No active tab found.");
  if (lastExtracted && lastExtracted.url === tab.url && lastExtracted.text) return lastExtracted;

  const tabCheck = await sendRuntimeMessage({ type: "CHECK_TAB" });
  if (!tabCheck.ok) throw new Error("This browser page is restricted and cannot be analyzed.");

  const [{ result: pageData }] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: extractReadableContent,
  });

  if (!pageData || !pageData.text || pageData.text.length < 30) {
    throw new Error("Could not extract enough content from this page.");
  }

  lastExtracted = {
    text: pageData.text,
    title: tab.title || pageData.title,
    url: tab.url || pageData.url,
    wordCount: pageData.wordCount || estimateWords(pageData.text),
    isPdf: Boolean(pageData.isPdf),
  };

  contentMetrics.textContent = `Extracted ${lastExtracted.wordCount} words (${lastExtracted.text.length.toLocaleString()} chars)`;
  contentMetrics.classList.remove("hidden");
  return lastExtracted;
}

function buildSourceChunks(text) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const chunks = [];
  const chunkSize = 130;
  const overlap = 30;

  for (let i = 0; i < words.length; i += (chunkSize - overlap)) {
    const chunkWords = words.slice(i, i + chunkSize);
    if (chunkWords.length < 40) continue;
    chunks.push({
      text: chunkWords.join(" "),
      index: chunks.length,
    });
    if (chunks.length >= 120) break;
  }

  return chunks;
}

function selectTopChunks(question, chunks, topK = 4) {
  const qTokens = tokenizeForRetrieval(question);
  if (!qTokens.length) return chunks.slice(0, topK);

  const scored = chunks.map((chunk) => {
    const cTokens = tokenizeForRetrieval(chunk.text);
    let score = 0;
    qTokens.forEach((token) => {
      if (cTokens.has(token)) score += 1;
    });

    const loweredQuestion = question.toLowerCase();
    const loweredChunk = chunk.text.toLowerCase();
    if (loweredChunk.includes(loweredQuestion.slice(0, Math.min(35, loweredQuestion.length)))) {
      score += 2;
    }

    return { chunk, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter((entry) => entry.score > 0)
    .map((entry, idx) => ({ ...entry.chunk, sourceId: `S${idx + 1}` }));
}

function tokenizeForRetrieval(text) {
  const stop = new Set(["the", "and", "for", "that", "with", "from", "this", "what", "when", "where", "how", "why", "are", "was", "were", "you", "your", "into", "about"]);
  return new Set(
    (text || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stop.has(token))
  );
}

async function callProviderChatQA({ provider, model, apiKey, question, chunks, niche }) {
  const nicheContext = {
    academic: "Prefer rigorous, evidence-aware answers suitable for studying.",
    "product-intel": "Focus on product implications, market signals, and decisions.",
    compliance: "Focus on obligations, risk, deadlines, and exceptions.",
  };

  const sourceBlock = chunks
    .map((chunk) => `[${chunk.sourceId}] ${chunk.text}`)
    .join("\n\n");

  const systemPrompt = [
    "You are PageBrief, a grounded assistant.",
    "Answer ONLY using the provided sources.",
    "If the answer is not present, say you cannot find it in the page.",
    "Cite source tags inline like [S1] [S2] after factual statements.",
    nicheContext[niche] || nicheContext.academic,
  ].join(" ");

  const userPrompt = `Question: ${question}\n\nSources:\n${sourceBlock}`;

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 450,
        temperature: 0.2,
      }),
    });
    return await parseOpenAIResponse(response);
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 450,
        temperature: 0.2,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    return await parseAnthropicResponse(response);
  }

  if (provider === "gemini") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 450,
        },
      }),
    });
    return await parseGeminiResponse(response);
  }

  throw new Error("Unsupported provider.");
}

async function getActiveTabInfo() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function callProviderApi({ provider, model, apiKey, text, style, niche }) {
  const prompt = stylePrompt(style, niche);
  const clippedText = text.slice(0, 22000);

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: clippedText },
        ],
        max_tokens: 550,
        temperature: 0.4,
      }),
    });
    return await parseOpenAIResponse(response);
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 550,
        temperature: 0.4,
        system: prompt,
        messages: [{ role: "user", content: clippedText }],
      }),
    });
    return await parseAnthropicResponse(response);
  }

  if (provider === "gemini") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${prompt}\n\n${clippedText}` }],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 550,
        },
      }),
    });
    return await parseGeminiResponse(response);
  }

  throw new Error("Unsupported provider.");
}

async function parseOpenAIResponse(response) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${response.status}`);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "No summary returned.";
}

async function parseAnthropicResponse(response) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic error ${response.status}`);
  }
  const data = await response.json();
  const textChunk = (data.content || []).find((part) => part.type === "text");
  return textChunk?.text?.trim() || "No summary returned.";
}

async function parseGeminiResponse(response) {
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini error ${response.status}`);
  }
  const data = await response.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "No summary returned.";
}

function renderSummary(summary) {
  hideStatus();
  resultTitle.textContent = `${styleLabel(currentStyle)} | ${PROVIDERS[currentProvider].label} / ${currentModel}`;

  const lines = summary.split("\n").filter((line) => line.trim());
  const isBullets = lines.some((line) => /^\s*([\-*])\s+/.test(line));

  summaryContent.innerHTML = "";
  if (isBullets) {
    const ul = document.createElement("ul");
    lines.forEach((line) => {
      const text = line.replace(/^\s*[\-*]\s*/, "").trim();
      if (!text) return;
      const li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
    summaryContent.appendChild(ul);
  } else {
    summaryContent.innerHTML = lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
  }

  resultArea.classList.remove("hidden");
}

async function renderHistory() {
  const { history = [] } = await storageGet(["history"]);
  historyList.innerHTML = "";
  if (history.length === 0) {
    historyEmpty.classList.remove("hidden");
    return;
  }

  historyEmpty.classList.add("hidden");

  const ordered = [...history].sort((a, b) => {
    if (Boolean(b.pinned) !== Boolean(a.pinned)) return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    return (b.date || 0) - (a.date || 0);
  });

  ordered.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const topRow = document.createElement("div");
    topRow.className = "history-item-top";

    const urlEl = document.createElement("div");
    urlEl.className = "history-item-url";
    urlEl.textContent = entry.url;

    const pin = document.createElement("button");
    pin.className = `icon-btn small pin-btn${entry.pinned ? " pinned" : ""}`;
    pin.title = entry.pinned ? "Unpin" : "Pin";
    pin.innerHTML = "&#9733;";
    pin.addEventListener("click", async (event) => {
      event.stopPropagation();
      await togglePinned(entry);
      await renderHistory();
    });

    topRow.appendChild(urlEl);
    topRow.appendChild(pin);

    const preview = document.createElement("div");
    preview.className = "history-item-preview";
    preview.textContent = (entry.summary || "").replace(/^[\-*]\s*/g, "").replace(/\s+/g, " ").trim();

    const meta = document.createElement("div");
    meta.className = "history-item-meta";
    const providerLabel = PROVIDERS[entry.provider]?.label || "OpenAI";
    meta.textContent = `${styleLabel(entry.style)} | ${providerLabel} | ${new Date(entry.date).toLocaleString()}`;

    item.appendChild(topRow);
    item.appendChild(preview);
    item.appendChild(meta);

    item.addEventListener("click", () => {
      pills.forEach((pill) => pill.classList.toggle("active", pill.dataset.style === entry.style));
      currentStyle = entry.style || "bullet";
      currentNiche = entry.niche || currentNiche;
      nicheSelect.value = currentNiche;
      if (nicheSelectSettings) nicheSelectSettings.value = currentNiche;
      providerSelect.value = entry.provider && PROVIDERS[entry.provider] ? entry.provider : currentProvider;
      currentProvider = providerSelect.value;
      populateModelSelect();
      if (entry.model && PROVIDERS[currentProvider].models.includes(entry.model)) {
        currentModel = entry.model;
      }
      modelSelect.value = currentModel;

      lastSummary = entry;
      renderSummary(entry.summary || "");
      btnResummarize.disabled = !lastExtracted;
      btnHighlight.disabled = false;
      showView("main");
    });

    historyList.appendChild(item);
  });
}

async function togglePinned(entry) {
  const { history = [] } = await storageGet(["history"]);
  const updated = history.map((item) => {
    if (item.date === entry.date && item.url === entry.url) {
      return { ...item, pinned: !item.pinned };
    }
    return item;
  });
  await storageSet({ history: updated });
}

async function saveToHistory(entry) {
  const { history = [] } = await storageGet(["history"]);
  const deduped = history.filter((item) => !(item.url === entry.url && item.style === entry.style));
  deduped.push(entry);

  if (deduped.length > MAX_HISTORY) {
    const pinned = deduped.filter((item) => item.pinned);
    const others = deduped.filter((item) => !item.pinned).sort((a, b) => (b.date || 0) - (a.date || 0));
    const trimmed = [...pinned, ...others.slice(0, Math.max(0, MAX_HISTORY - pinned.length))];
    await storageSet({ history: trimmed });
    return;
  }

  await storageSet({ history: deduped });
}

function showView(viewName) {
  viewMain.classList.toggle("hidden", viewName !== "main");
  viewHistory.classList.toggle("hidden", viewName !== "history");
  viewSettings.classList.toggle("hidden", viewName !== "settings");
}

function populateModelSelect() {
  modelSelect.innerHTML = "";
  PROVIDERS[currentProvider].models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    modelSelect.appendChild(option);
  });
  currentModel = modelSelect.value;
}

function syncKeyUI() {
  const currentKey = apiKeys[currentProvider] || "";
  apiKeyInput.value = currentKey;
  apiKeyInputSettings.value = currentKey;
  if (currentKey) apiKeySection.classList.add("hidden");
  else apiKeySection.classList.remove("hidden");
}

function stylePrompt(style, niche) {
  const nicheContext = {
    academic: "Prioritize claims, evidence strength, and study relevance for students/researchers.",
    "product-intel": "Prioritize product changes, positioning, pricing signals, and competitive implications.",
    compliance: "Prioritize policy obligations, deadlines, exceptions, and risk flags."
  };

  const prompts = {
    bullet: "Summarize this page as concise bullet points. Start each point with '- '. Focus on key facts and claims.",
    brief: "Summarize this page in 2 to 4 concise sentences with the central takeaway first.",
    simple: "Explain this page in plain language for a non-expert. Keep sentences short and avoid jargon.",
    study: "Create study notes with sections: Key Concepts, Important Evidence, Open Questions, and Exam-Ready Takeaways. Use short bullets under each heading.",
  };

  return `${prompts[style] || prompts.bullet} ${nicheContext[niche] || ""}`.trim();
}

function styleLabel(style) {
  return {
    bullet: "Bullet Points",
    brief: "Brief Overview",
    simple: "Explain Simply",
    study: "Study Notes"
  }[style] || style;
}

function nicheLabel(niche) {
  return {
    academic: "Academic Research",
    "product-intel": "Product Intelligence",
    compliance: "Compliance Monitoring"
  }[niche] || niche;
}

function buildMarkdownSummary(entry) {
  return [
    `# ${entry.title || "Page Summary"}`,
    "",
    `- URL: ${entry.url || "Unknown"}`,
    `- Style: ${styleLabel(entry.style)}`,
    `- Niche: ${nicheLabel(entry.niche || "academic")}`,
    `- Provider: ${PROVIDERS[entry.provider]?.label || "Unknown"}`,
    `- Model: ${entry.model || "Unknown"}`,
    `- Generated: ${new Date(entry.date || Date.now()).toLocaleString()}`,
    "",
    "## Summary",
    "",
    entry.summary || "",
    "",
  ].join("\n");
}

function showStatus(msg, isError = false) {
  statusEl.textContent = msg;
  statusEl.classList.remove("hidden", "error");
  if (isError) statusEl.classList.add("error");
}

function hideStatus() {
  statusEl.classList.add("hidden");
  statusEl.textContent = "";
}

function hideResult() {
  resultArea.classList.add("hidden");
  summaryContent.innerHTML = "";
}

function setBusy(busy) {
  btnSummarize.disabled = busy;
  btnResummarize.disabled = busy || !lastExtracted;
  btnHighlight.disabled = busy || !lastSummary;

  if (busy) {
    btnSummarize.textContent = "Summarizing...";
  } else {
    btnSummarize.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="btn-icon">
        <line x1="21" y1="10" x2="7" y2="10"></line>
        <line x1="21" y1="6" x2="3" y2="6"></line>
        <line x1="21" y1="14" x2="3" y2="14"></line>
        <line x1="21" y1="18" x2="7" y2="18"></line>
      </svg>
      Summarize This Page`;
  }
}

function flashControl(el, text) {
  const old = el.title;
  el.title = text;
  setTimeout(() => {
    el.title = old;
  }, 1200);
}

function estimateWords(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise((resolve) => chrome.storage.local.set(obj, resolve));
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, reason: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: false, reason: "No response" });
    });
  });
}

async function persistAccount() {
  await storageSet({ account });
}

async function backendCall(path, init = {}) {
  const backendUrl = (account.backendUrl || "http://localhost:8787").replace(/\/$/, "");
  const headers = { ...(init.headers || {}) };
  if (account.token) headers.Authorization = `Bearer ${account.token}`;

  const response = await fetch(`${backendUrl}${path}`, {
    ...init,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Backend error ${response.status}`);
  return data;
}

async function openLegal(path) {
  const url = chrome.runtime.getURL(path);
  await chrome.tabs.create({ url });
}

function extractReadableContent() {
  const isPdf = (document.contentType || "").includes("pdf") || /\.pdf(\?|$)/i.test(location.href);

  function cleanText(value) {
    return (value || "").replace(/\s+/g, " ").trim();
  }

  const clone = document.documentElement.cloneNode(true);
  const noiseSelectors = [
    "script", "style", "noscript", "iframe", "svg", "canvas", "img", "video", "audio",
    "nav", "footer", "header", "aside", "form", "button", "input", "select", "textarea",
    "[role='banner']", "[role='navigation']", "[role='complementary']", "[aria-hidden='true']",
  ];

  noiseSelectors.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((node) => node.remove());
  });

  const candidateRoots = [];
  const article = clone.querySelector("article");
  const main = clone.querySelector("main");
  if (article) candidateRoots.push(article);
  if (main) candidateRoots.push(main);

  clone.querySelectorAll("section, div").forEach((node) => {
    const text = cleanText(node.textContent);
    if (text.length > 800) candidateRoots.push(node);
  });

  let bestRoot = candidateRoots[0] || clone.body || clone;
  let bestScore = 0;

  candidateRoots.forEach((node) => {
    const paragraphs = Array.from(node.querySelectorAll("p"));
    const score = paragraphs.reduce((sum, p) => {
      const t = cleanText(p.textContent);
      return sum + Math.min(220, t.length);
    }, 0);
    if (score > bestScore) {
      bestScore = score;
      bestRoot = node;
    }
  });

  const paragraphTexts = Array.from(bestRoot.querySelectorAll("p"))
    .map((p) => cleanText(p.textContent))
    .filter((text) => text.length >= 35);

  let text = paragraphTexts.join(" ");
  if (text.length < 300) {
    text = cleanText((bestRoot && bestRoot.textContent) || document.body.innerText || "");
  }

  const words = text.split(" ").slice(0, 8000);
  text = words.join(" ");

  return {
    title: document.title,
    url: location.href,
    text,
    wordCount: words.length,
    isPdf,
  };
}

function clearPageBriefHighlights() {
  const marks = document.querySelectorAll("mark.pagebrief-highlight");
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

function highlightSummaryEvidence(summaryText) {
  clearPageBriefHighlights();

  const phrases = buildHighlightCandidates(summaryText);

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || node.nodeValue.trim().length < 30) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("mark.pagebrief-highlight")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let highlighted = 0;
  const MAX_HIGHLIGHTS = 20;

  while (walker.nextNode() && highlighted < MAX_HIGHLIGHTS) {
    const node = walker.currentNode;
    const text = node.nodeValue;
    if (!text) continue;

    const lower = text.toLowerCase();
    let chosen = null;
    for (const phrase of phrases) {
      const candidate = phrase.toLowerCase();
      if (candidate.length < 8) continue;
      if (lower.includes(candidate)) {
        chosen = candidate;
        break;
      }
    }

    if (!chosen) continue;

    const idx = lower.indexOf(chosen);
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + chosen.length);
    const after = text.slice(idx + chosen.length);

    const mark = document.createElement("mark");
    mark.className = "pagebrief-highlight";
    mark.style.background = "#fde047";
    mark.style.color = "#111827";
    mark.style.padding = "0 2px";
    mark.textContent = match;

    const frag = document.createDocumentFragment();
    if (before) frag.appendChild(document.createTextNode(before));
    frag.appendChild(mark);
    if (after) frag.appendChild(document.createTextNode(after));

    if (node.parentNode) node.parentNode.replaceChild(frag, node);
    highlighted += 1;
  }

  return highlighted;
}

function buildHighlightCandidates(summaryText) {
  const stopWords = new Set([
    "the", "and", "for", "that", "with", "from", "this", "what", "when", "where", "how", "why",
    "are", "was", "were", "you", "your", "into", "about", "page", "summary", "brief", "notes",
    "highlight", "source", "relevant", "important", "key", "main", "takeaway", "takeaways"
  ]);

  const lines = (summaryText || "")
    .split(/\n|\.|;|,/) 
    .map((part) => part.replace(/^\s*[\-*]\s*/, "").trim())
    .filter((part) => part.length >= 6);

  const candidates = [];

  for (const line of lines) {
    const tokens = line
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 4 && !stopWords.has(token));

    for (let i = 0; i < tokens.length - 2; i += 1) {
      const phrase = tokens.slice(i, i + 3).join(" ");
      if (phrase.length >= 12) candidates.push(phrase);
    }

    if (tokens.length >= 2) {
      candidates.push(tokens.slice(0, 4).join(" "));
    }
  }

  const unique = [];
  for (const phrase of candidates) {
    if (!unique.some((existing) => existing === phrase)) unique.push(phrase);
    if (unique.length >= 24) break;
  }

  return unique;
}

// background/service-worker.js
/* eslint func-names: ["error", "always"] */

// ---- onInstalled: 既定キーマップのseed ----
async function seedKeymapsIfEmpty() {
    const { keymaps } = await chrome.storage.sync.get("keymaps");
    if (!keymaps) {
        const url = chrome.runtime.getURL("data/default-keymaps.json");
        const res = await fetch(url);
        const defaults = await res.json();
        await chrome.storage.sync.set({ keymaps: defaults });
        // console.log("[Flightdeck] seeded keymaps");
    }
}

function onInstalled() {
    // async関数を名前付きで呼ぶ
    seedKeymapsIfEmpty().catch(function onSeedError(e) {
        // console.error("[Flightdeck] seed failed", e);
    });
}

// ---- onMessage: 新規タブで開く ----
async function openUrlNewTab(url) {
    await chrome.tabs.create({ url });
    return { ok: true };
}

function onMessage(msg, sender, sendResponse) {
    (async function handleMessage() {
        try {
            if (msg && msg.type === "OPEN_URL_IN_NEW_TAB" && msg.url) {
                const res = await openUrlNewTab(msg.url);
                sendResponse(res);
            } else {
                sendResponse({ ok: false, error: "unsupported_message" });
            }
        } catch (e) {
            sendResponse({ ok: false, error: String(e) });
        }
    }()).catch(function onMsgErr(e) {
        // 最終フォールバック
        sendResponse({ ok: false, error: String(e) });
    });
    return true; // 非同期sendResponse
}

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.runtime.onMessage.addListener(onMessage);

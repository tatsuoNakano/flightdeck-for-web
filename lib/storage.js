// lib/storage.js
// chrome.storage.sync の薄いラッパ（名前付き）
(function initStorageApi() {
    async function getKeymaps() {
        const { keymaps } = await chrome.storage.sync.get("keymaps");
        if (keymaps) return keymaps;
        const url = chrome.runtime.getURL("data/default-keymaps.json");
        const res = await fetch(url);
        const defaults = await res.json();
        await chrome.storage.sync.set({ keymaps: defaults });
        return defaults;
    }
    async function setKeymaps(next) {
        await chrome.storage.sync.set({ keymaps: next });
    }
    if (!window.Flightdeck) window.Flightdeck = {};
    window.Flightdeck.getKeymaps = getKeymaps;
    window.Flightdeck.setKeymaps = setKeymaps;
}());

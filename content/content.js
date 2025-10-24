// content/content.js — ダブルタップ検知を堅牢化（再起動しない不具合対応）
(function initContentScript() {
    const { getKeymaps, applyTemplate } = window.Flightdeck;
    const { show, hide } = window.FlightdeckUI;

    // ---- 状態 ----
    let isOpen = false;
    let keymapsCache = null;

    // タイピング前方一致用
    let buffer = "";
    let bufferTimer = null;
    const BUFFER_TIMEOUT = 600; // ms

    // Shift×2 検知用（カウント＋タイムアウト）
    let shiftCount = 0;
    let shiftFirstAt = 0;
    let shiftTimer = null;
    const SHIFT_INTERVAL = 350; // ms

    // ---- ユーティリティ ----
    function now() { return performance.now(); }

    function resetTypeBufferSoon() {
        clearTimeout(bufferTimer);
        bufferTimer = setTimeout(function onReset() { buffer = ""; }, BUFFER_TIMEOUT);
    }

    function resetShiftDetector() {
        shiftCount = 0;
        shiftFirstAt = 0;
        clearTimeout(shiftTimer);
        shiftTimer = null;
    }

    async function ensureKeymaps() {
        if (!keymapsCache) keymapsCache = await getKeymaps();
        return keymapsCache;
    }

    function getSelectionText() {
        const sel = window.getSelection();
        return sel ? String(sel).trim() : "";
    }

    function toItems(keys) {
        const km = keymapsCache || {};
        return keys.map(function mapKey(k) {
            return { key: k, label: (km[k]?.label || k), template: (km[k]?.template || "") };
        });
    }

    function filterKeys(prefix) {
        const keys = Object.keys(keymapsCache || {});
        if (!prefix) return keys.sort();
        const l = prefix.toLowerCase();
        const starts = keys.filter(function startsWith(k) { return k.toLowerCase().startsWith(l); });
        return (starts.length ? starts : keys).sort();
    }

    function handleOpenTabResponse(res) {
        // console.debug("[Flightdeck] open-tab:", res);
    }

    function sendMessageOpenUrl(url) {
        return new Promise(function newPromise(resolve) {
            function onResponse(res) {
                handleOpenTabResponse(res);
                if (chrome.runtime.lastError) { resolve(false); return; }
                resolve(!!(res && res.ok));
            }
            chrome.runtime.sendMessage({ type: "OPEN_URL_IN_NEW_TAB", url }, onResponse);
        });
    }

    async function openWithKey(key) {
        const def = keymapsCache?.[key];
        if (!def) return;
        const url = applyTemplate(def.template, getSelectionText());
        await sendMessageOpenUrl(url);
        closeLauncher();
    }

    function openLauncher() {
        isOpen = true;
        resetTypeBufferSoon(); // タイプ状態のタイマー開始（空でもOK）
        ensureKeymaps().then(function onReady() {
            const keys = filterKeys("");
            show({ selectedText: getSelectionText(), items: toItems(keys) });
        });
    }

    function closeLauncher() {
        hide();
        isOpen = false;
        buffer = "";
        resetShiftDetector(); // 次の起動に影響しないよう必ず初期化
    }

    // UIからの実行（名前付き経由）
    window.Flightdeck._emitPick = function emitPick(key) {
        openWithKey(key);
    };

    // ---- ダブルタップ検知（堅牢版）----
    function handleShiftDoubleTap() {
        const t = now();

        if (shiftCount === 0) {
            shiftCount = 1;
            shiftFirstAt = t;
            clearTimeout(shiftTimer);
            shiftTimer = setTimeout(resetShiftDetector, SHIFT_INTERVAL + 80); // 余裕を少し
            return;
        }

        // 2回目
        if (t - shiftFirstAt <= SHIFT_INTERVAL) {
            resetShiftDetector();
            openLauncher();
            return;
        }

        // 間に合わなかった場合は1回目としてカウントし直す
        shiftCount = 1;
        shiftFirstAt = t;
        clearTimeout(shiftTimer);
        shiftTimer = setTimeout(resetShiftDetector, SHIFT_INTERVAL + 80);
    }

    // ---- キーイベント ----
    function onKeydown(e) {
        // ランチャー未表示時：Shift×2 起動のみを見る
        if (!isOpen) {
            if (e.key === "Shift") {
                if (e.repeat) return; // 長押しのリピートは無視
                // 一部サイトが keydown を stopPropagation しても、capture:true で拾える
                e.preventDefault();
                e.stopPropagation();
                handleShiftDoubleTap();
            }
            return;
        }

        // ランチャー表示中：Esc/Enter/タイプだけ処理（Shiftは無視）
        if (e.key === "Escape") {
            e.preventDefault(); e.stopPropagation();
            closeLauncher();
            return;
        }
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        // タイプで前方一致→1件なら自動確定
        if (e.key.length === 1) {
            buffer += e.key;
            resetTypeBufferSoon();
            const keys = filterKeys(buffer);
            show({ selectedText: getSelectionText(), items: toItems(keys) });

            const exact = keys.filter(function eq(k) { return k.toLowerCase() === buffer.toLowerCase(); });
            if (exact.length === 1) { e.preventDefault(); e.stopPropagation(); openWithKey(exact[0]); return; }
            if (keys.length === 1) { e.preventDefault(); e.stopPropagation(); openWithKey(keys[0]); return; }
        }

        // Enterで先頭を実行（保険）
        if (e.key === "Enter") {
            const keys = filterKeys(buffer);
            if (keys.length) { e.preventDefault(); e.stopPropagation(); openWithKey(keys[0]); }
        }
    }

    // 可視状態が変わったら（タブ切替/ウィンドウ最小化など）シフト検知を必ずリセット
    function onVisibilityChange() {
        if (document.visibilityState !== "visible") {
            resetShiftDetector();
        }
    }

    // ---- リスナー登録 ----
    window.addEventListener("keydown", onKeydown, true); // captureで早期取得
    document.addEventListener("visibilitychange", onVisibilityChange, true);

    // ストレージ変更の反映
    chrome.storage.onChanged.addListener(function onStorageChanged(changes, area) {
        if (area === "sync" && changes.keymaps) {
            keymapsCache = changes.keymaps.newValue || null;
            if (isOpen) {
                const keys = filterKeys(buffer);
                show({ selectedText: getSelectionText(), items: toItems(keys) });
            }
        }
    });
}());

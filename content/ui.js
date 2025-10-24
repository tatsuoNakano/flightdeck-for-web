// content/ui.js（検索バーなし・名前付き関数中心）
(function initFlightdeckUI() {
    if (!window.Flightdeck) window.Flightdeck = {};
    const UI_ID = "flightdeck-root-host";

    function hostFromTemplate(t) {
        try { return new URL(t.replaceAll("{{q}}","X")).host; } catch { return ""; }
    }

    function ensureRoot() {
        let host = document.getElementById(UI_ID);
        if (host) return host;

        host = document.createElement("div");
        host.id = UI_ID;
        host.style.all = "initial";
        host.style.position = "fixed";
        host.style.inset = "0";
        host.style.zIndex = "2147483646";
        document.documentElement.appendChild(host);

        const shadow = host.attachShadow({ mode:"open" });

        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = chrome.runtime.getURL("content/styles.css");
        shadow.appendChild(link);

        const backdrop = document.createElement("div");
        backdrop.className = "flightdeck-backdrop";
        backdrop.addEventListener("click", onBackdropClick);

        const overlay = document.createElement("div");
        overlay.className = "flightdeck-overlay";
        overlay.setAttribute("role","dialog");
        overlay.setAttribute("aria-modal","true");
        overlay.tabIndex = -1;

        const head = document.createElement("div");
        head.className = "fd-head";
        const title = el("div","fd-title","Flightdeck");
        const chip  = el("div","fd-chip","");
        chip.title = "選択テキスト";
        const close = el("button","fd-close","✕");
        close.addEventListener("click", onCloseClick);
        head.append(title, chip, close);

        const grid = el("div","fd-grid");

        const foot = el("div","fd-foot");
        foot.innerHTML = `<div class="row"><span class="fd-kbd">Shift×2</span>開閉 <span class="fd-kbd">Enter</span>先頭実行 <span class="fd-kbd">Esc</span>閉じる</div>
                      <div class="row">キーをタイプすると前方一致で自動確定します</div>`;

        overlay.append(head, grid, foot);
        shadow.append(backdrop, overlay);

        host._fd = { shadow, overlay, chip, grid };
        return host;
    }

    function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text != null) n.textContent = text;
        return n;
    }

    function onBackdropClick() { hide(); }
    function onCloseClick() { hide(); }

    function renderGrid(items) {
        const { grid } = getRefs();
        grid.replaceChildren();
        items.forEach(function onEach(it, idx) {
            const card = el("div","fd-card");
            if (idx === 0) card.classList.add("active");
            card.dataset.key = it.key;

            const kb = el("div","fd-keybubble", it.key);
            const meta = el("div","fd-meta");
            const label = el("div","fd-label", it.label);
            const domain = el("div","fd-domain", hostFromTemplate(it.template));
            meta.append(label, domain);

            card.append(kb, meta);
            card.addEventListener("mouseenter", function onHover() { setActive(idx); });
            card.addEventListener("click", function onClick() { window.Flightdeck._emitPick(it.key); });
            grid.appendChild(card);
        });
    }

    function setActive(i) {
        const { grid } = getRefs();
        const cards = Array.from(grid.querySelectorAll(".fd-card"));
        if (!cards.length) return;
        cards.forEach(function onClear(x) { x.classList.remove("active"); });
        const idx = Math.max(0, Math.min(i, cards.length - 1));
        const active = cards[idx];
        active.classList.add("active");

        const rect = active.getBoundingClientRect();
        const gRect = grid.getBoundingClientRect();
        if (rect.top < gRect.top) grid.scrollTop += rect.top - gRect.top - 6;
        if (rect.bottom > gRect.bottom) grid.scrollTop += rect.bottom - gRect.bottom + 6;
    }

    function onKey(e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); hide(); return; }
        if (e.key === "Enter") {
            e.preventDefault(); e.stopPropagation();
            const { grid } = getRefs();
            const first = grid.querySelector(".fd-card");
            if (first) window.Flightdeck._emitPick(first.dataset.key);
            return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
            e.preventDefault(); e.stopPropagation();
            const { grid } = getRefs();
            const cards = Array.from(grid.querySelectorAll(".fd-card"));
            const cur = cards.findIndex(function onFind(c){ return c.classList.contains("active"); });
            const cols = Math.max(1, Math.floor(grid.clientWidth / 160));
            let next = cur < 0 ? 0 : cur;
            if (e.key === "ArrowRight") next = Math.min(cards.length - 1, cur + 1);
            if (e.key === "ArrowLeft")  next = Math.max(0, cur - 1);
            if (e.key === "ArrowDown")  next = Math.min(cards.length - 1, cur + cols);
            if (e.key === "ArrowUp")    next = Math.max(0, cur - cols);
            setActive(next);
        }
    }

    function getRefs() {
        const host = document.getElementById(UI_ID);
        return host?._fd ?? {};
    }

    function show(payload) {
        const host = ensureRoot();
        const { overlay, chip } = host._fd;

        const selectedText = payload?.selectedText ? String(payload.selectedText) : "";
        chip.textContent = selectedText ? `選択: ${selectedText.slice(0, 60)}` : "選択なし";

        overlay.classList.remove("enter");
        host.style.display = "";
        requestAnimationFrame(function onNextFrame() { overlay.classList.add("enter"); });

        renderGrid(payload?.items ?? []);
        overlay.focus();
        document.addEventListener("keydown", onKey, true);
    }

    function hide() {
        const host = document.getElementById(UI_ID);
        if (!host) return;
        const { overlay } = host._fd;
        overlay.classList.remove("enter");
        host.style.display = "none";
        document.removeEventListener("keydown", onKey, true);
    }

    window.FlightdeckUI = { show, hide };
}());

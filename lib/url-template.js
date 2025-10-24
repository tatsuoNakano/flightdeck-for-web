// lib/url-template.js
// URLテンプレート {{q}} を encodeURIComponent で差し込み（名前付き公開）
(function initUrlTemplate() {
    function sanitizeUrl(u) {
        try {
            const parsed = new URL(u);
            if (parsed.protocol === "http:" || parsed.protocol === "https:") return u;
        } catch {}
        throw new Error("Invalid URL template");
    }
    function applyTemplate(template, query) {
        const safe = sanitizeUrl(template);
        const enc = encodeURIComponent(query ?? "");
        return safe.replaceAll("{{q}}", enc);
    }
    if (!window.Flightdeck) window.Flightdeck = {};
    window.Flightdeck.applyTemplate = applyTemplate;
}());

// options/options.js（名前付き関数で構成）
(function initOptionsPage() {
    const { getKeymaps, setKeymaps } = window.Flightdeck;

    const tableBody = document.querySelector("#table tbody");
    const btnAdd = document.getElementById("add");
    const btnReset = document.getElementById("reset");
    const btnSave = document.getElementById("save");
    const status = document.getElementById("status");

    let model = {};

    function makeRow(key, obj) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td><input name="key" value="${key}" maxlength="3" spellcheck="false"></td>
      <td><input name="label" value="${obj.label ?? ""}" spellcheck="false"></td>
      <td><input name="template" value="${obj.template ?? ""}" spellcheck="false"></td>
      <td style="text-align:center"><input type="checkbox" name="search" ${obj.search ? "checked": ""}></td>
      <td><button class="del">削除</button></td>
    `;
        const btnDel = tr.querySelector(".del");
        btnDel.addEventListener("click", function onDel() { tr.remove(); });
        return tr;
    }

    function render() {
        tableBody.replaceChildren();
        Object.keys(model).sort().forEach(function onEach(k) {
            tableBody.appendChild(makeRow(k, model[k]));
        });
    }

    function setStatus(msg) {
        status.textContent = msg || "";
        if (msg) setTimeout(function clear() { status.textContent = ""; }, 1500);
    }

    function urlLooksValid(tpl) {
        try { new URL(tpl.replaceAll("{{q}}", "test")); return true; } catch { return false; }
    }

    async function onAdd() {
        tableBody.appendChild(makeRow("", { label: "", template: "", search: true }));
    }

    async function onReset() {
        const url = chrome.runtime.getURL("../data/default-keymaps.json");
        const res = await fetch(url);
        model = await res.json();
        render();
        setStatus("既定に戻しました（保存で確定）");
    }

    async function onSave() {
        const next = {};
        const rows = Array.from(tableBody.querySelectorAll("tr"));
        for (const tr of rows) {
            const key = tr.querySelector('input[name="key"]').value.trim();
            const label = tr.querySelector('input[name="label"]').value.trim();
            const template = tr.querySelector('input[name="template"]').value.trim();
            const search = tr.querySelector('input[name="search"]').checked;

            if (!key) continue;
            if (!urlLooksValid(template)) {
                tr.style.background = "#fff2f2";
                setStatus(`URLテンプレートが不正: ${key}`);
                return;
            }
            next[key] = { label, template, search };
            tr.style.background = "";
        }
        await setKeymaps(next);
        model = next;
        setStatus("保存しました");
    }

    async function bootstrap() {
        model = await getKeymaps();
        render();
        btnAdd.addEventListener("click", onAdd);
        btnReset.addEventListener("click", onReset);
        btnSave.addEventListener("click", onSave);
    }

    bootstrap().catch(function onBootErr(e) {
        setStatus(String(e));
    });
}());

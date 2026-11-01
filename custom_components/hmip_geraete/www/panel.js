/* HmIP Geräteverwaltung – Home-Assistant-Panel (Web Component, keine Abhängigkeiten) */

const TEMPLATE = `
<style>
:host{display:block;height:100%;overflow:auto;box-sizing:border-box;
  --bg:var(--primary-background-color,#f4f6f9);--card:var(--card-background-color,#fff);
  --ink:var(--primary-text-color,#1b2430);--mut:var(--secondary-text-color,#667085);
  --pri:var(--primary-color,#0b5cab);--onpri:var(--text-primary-color,#fff);
  --line:var(--divider-color,#dde2ea);--bad:var(--error-color,#b42318);
  background:var(--bg);color:var(--ink);font:16px/1.4 var(--paper-font-body1_-_font-family,system-ui,sans-serif)}
*{box-sizing:border-box}
header{position:sticky;top:0;z-index:5;background:var(--app-header-background-color,var(--pri));
  color:var(--app-header-text-color,var(--onpri));padding:10px 12px}
header .top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
header h1{margin:0;font-size:18px;font-weight:500}
.bar{display:flex;gap:8px;flex-wrap:wrap}
button{font:inherit;border:0;border-radius:10px;padding:10px 14px;background:#fff;color:#0b5cab;font-weight:600;cursor:pointer}
header button.burger{background:transparent;color:inherit;padding:4px 8px;font-size:22px;line-height:1}
button.pri{background:var(--pri);color:var(--onpri)}
button.bad{background:var(--bad);color:#fff}
button.ghost{background:transparent;color:var(--pri);border:1px solid var(--line)}
main{padding:12px;max-width:900px;margin:0 auto}
.tools{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
input,select,textarea{font:inherit;width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.tools input{flex:2;min-width:160px}.tools select{flex:1;min-width:120px}
.tag.miss{background:color-mix(in srgb,#f59e0b 25%,transparent);color:inherit}.tag.ok{background:color-mix(in srgb,#22a559 25%,transparent);color:inherit}
.item{background:var(--card);border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;gap:10px;align-items:center;
  box-shadow:0 1px 2px #0002;cursor:pointer}
.item img{width:56px;height:56px;object-fit:cover;border-radius:8px;background:#8883;flex:none}
.item .t{font-weight:600}.item .s{color:var(--mut);font-size:14px;word-break:break-all}
.tag{display:inline-block;background:color-mix(in srgb,var(--pri) 18%,transparent);color:var(--pri);border-radius:6px;padding:1px 7px;font-size:12px;margin-right:4px}
.empty{text-align:center;color:var(--mut);padding:40px 10px}
dialog{border:0;border-radius:14px;padding:0;width:min(94vw,560px);max-height:92vh;background:var(--card);color:var(--ink)}
dialog::backdrop{background:#0008}
.dlg{padding:14px;display:flex;flex-direction:column;gap:10px}
.dlg h2{margin:0;font-size:18px;font-weight:500}
label{font-size:13px;color:var(--mut);display:block;margin-bottom:3px}
.row{display:flex;gap:8px}.row>*{flex:1;min-width:0}
video{width:100%;border-radius:10px;background:#000;max-height:55vh}
.photo{max-width:100%;max-height:220px;border-radius:10px;align-self:flex-start}
.msg{padding:8px 10px;border-radius:8px;font-size:14px}
.msg.warn{background:color-mix(in srgb,#f59e0b 22%,transparent)}
.msg.ok{background:color-mix(in srgb,#22a559 22%,transparent)}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#1b2430;color:#fff;padding:10px 16px;border-radius:10px;z-index:99;display:none}
small{color:var(--mut)}
</style>
<header>
  <div class="top"><button class="burger" id="bBurger" style="display:none" aria-label="Menü">☰</button>
    <h1>HmIP Geräte <span id="count" style="font-weight:400;font-size:14px"></span></h1></div>
  <div class="bar">
    <button id="bScan">📷 Scannen</button>
    <button id="bPhoto">🖼️ Foto</button>
    <button id="bManual">✍️ Manuell</button>
    <button id="bMenu">⋯</button>
  </div>
</header>
<main>
  <div class="tools">
    <input id="q" type="search" placeholder="Suchen (Name, Raum, SGTIN …)">
    <select id="fRoom"><option value="">Alle Räume</option></select>
    <select id="fStatus"><option value="">Alle Geräte</option><option value="missing">Zettel fehlt</option><option value="done">Zettel erfasst</option></select>
  </div>
  <div id="list"></div>
</main>

<input type="file" id="filePhoto" accept="image/*" capture="environment" hidden>
<input type="file" id="fileImport" accept=".json,application/json" hidden>
<div class="toast" id="toast"></div>

<dialog id="dScan"><div class="dlg">
  <h2>Zettel scannen</h2>
  <video id="vid" playsinline muted></video>
  <div id="scanMsg" class="msg warn">Kamera wird gestartet …</div>
  <button class="ghost" id="scanClose">Abbrechen</button>
</div></dialog>

<dialog id="dEdit"><form class="dlg" id="fEdit" method="dialog">
  <h2 id="eTitle">Gerät</h2>
  <div id="eMsg"></div>
  <img id="ePhoto" class="photo" alt="" hidden>
  <div><label>Rohinhalt des Codes (wie gescannt)</label><textarea id="eRaw" rows="2"></textarea></div>
  <div class="row">
    <div><label>SGTIN / Gerätenummer</label><input id="eSgtin" autocapitalize="characters"></div>
    <div><label>Letzte 4 Ziffern</label><input id="eLast4" readonly></div>
  </div>
  <div class="row">
    <div><label>Name (wie in HmIP-App)</label><input id="eName"></div>
    <div><label>Gerätetyp</label><input id="eType" list="types" placeholder="z. B. HmIP-SWDO"></div>
  </div>
  <div class="row">
    <div><label>Raum</label><input id="eRoom" list="rooms"></div>
    <div><label>Einbauort</label><input id="eLoc" placeholder="z. B. Fenster links"></div>
  </div>
  <div><label>Firmware</label><input id="eFw"></div>
  <div><label>Notiz</label><textarea id="eNote" rows="2"></textarea></div>
  <div class="row">
    <button type="button" class="ghost" id="ePhotoBtn">Foto ersetzen</button>
    <button type="button" class="ghost" id="ePhotoDel">Foto entfernen</button>
  </div>
  <div class="row">
    <button type="button" class="bad" id="eDel">Löschen</button>
    <button type="button" class="ghost" id="eCancel">Abbrechen</button>
    <button type="submit" class="pri" id="eSave">Speichern</button>
  </div>
  <datalist id="rooms"></datalist><datalist id="types"></datalist>
</form></dialog>

<dialog id="dMenu"><div class="dlg">
  <h2>Export / Backup</h2>
  <button class="pri" id="mHa">Geräte aus Home Assistant übernehmen</button>
  <small>Liest alle eQ-3-Geräte mit Seriennummer aus Home Assistant (Name, Typ, Raum, Firmware). Vorhandene Einträge und deine Eingaben bleiben erhalten.</small>
  <button class="ghost" id="mCsv">CSV für Excel exportieren</button>
  <button class="ghost" id="mJson">Backup (JSON mit Fotos)</button>
  <button class="ghost" id="mImport">Backup importieren</button>
  <small>Die Daten liegen in Home Assistant (.storage) und sind in dessen Backups enthalten. Backups aus den früheren Einzeldatei- und Add-on-Versionen lassen sich importieren.</small>
  <button class="ghost" id="mClose">Schließen</button>
</div></dialog>
`;

const FIELDS = ["id", "raw", "sgtin", "name", "type", "room", "loc", "note", "fw", "created", "updated", "thumb"];

function init(host) {
  const root = host.shadowRoot;
  const $ = (id) => root.getElementById(id);
  const ws = (m) => host.hass.connection.sendMessagePromise(m);
  let devices = [], cur = null, stream = null, scanning = false, detector = null;

  /* ---------- Helfer ---------- */
  const errText = (e) => (e && (e.message || e.code)) || JSON.stringify(e);
  function toast(t) {
    const e = $("toast"); e.textContent = t; e.style.display = "block";
    clearTimeout(toast.t); toast.t = setTimeout(() => (e.style.display = "none"), 2500);
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const norm = (s) => String(s || "").replace(/[\s-]/g, "").toUpperCase();
  /* Heuristik: SGTIN-Vorschlag = erste 24-stellige Hex-Folge im Rohinhalt. Bleibt leer, wenn nichts passt;
     das Feld ist editierbar, der Rohinhalt wird immer unverändert gespeichert. */
  const guessSgtin = (raw) => { const m = norm(raw).match(/[0-9A-F]{24}/); return m ? m[0] : ""; };
  const last4 = (s) => norm(s).slice(-4);
  function findDup(raw, sg, exceptId) {
    const nr = norm(raw), ns = norm(sg);
    return devices.find((d) => d.id !== exceptId && ((ns && norm(d.sgtin) === ns) || (nr && norm(d.raw) === nr)));
  }

  function drawToJpeg(src, w, h, max, q) {
    const k = Math.min(1, max / Math.max(w, h));
    const c = document.createElement("canvas");
    c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext("2d").drawImage(src, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", q);
  }
  function shrink(src, max = 900, q = 0.72) {
    return new Promise((res, rej) => {
      if (src instanceof HTMLVideoElement) { res(drawToJpeg(src, src.videoWidth, src.videoHeight, max, q)); return; }
      const img = new Image(), u = typeof src === "string" ? src : URL.createObjectURL(src);
      img.onload = () => { res(drawToJpeg(img, img.naturalWidth, img.naturalHeight, max, q)); if (typeof src !== "string") URL.revokeObjectURL(u); };
      img.onerror = () => rej(new Error("Bild nicht lesbar"));
      img.src = u;
    });
  }
  const thumbOf = (dataUrl) => shrink(dataUrl, 128, 0.6);

  /* ---------- Server-API (Websocket) ---------- */
  const dbAll = () => ws({ type: "hmip_geraete/list" });
  async function dbSave(d) {
    const device = {};
    FIELDS.forEach((k) => (device[k] = d[k] ?? ""));
    const msg = { type: "hmip_geraete/save", device };
    if (typeof d.photo === "string") msg.photo = d.photo;
    return ws(msg);
  }
  const dbDel = (id) => ws({ type: "hmip_geraete/delete", device_id: id });

  /* ---------- Barcode ---------- */
  async function getDetector() {
    if (detector) return detector;
    if (!("BarcodeDetector" in window)) return null;
    try {
      const sup = await BarcodeDetector.getSupportedFormats();
      const want = ["qr_code", "data_matrix", "code_128", "code_39", "ean_13", "ean_8", "itf", "pdf417", "aztec"];
      detector = new BarcodeDetector({ formats: want.filter((f) => sup.includes(f)) });
    } catch (e) { detector = new BarcodeDetector(); }
    return detector;
  }

  async function startScan() {
    const det = await getDetector();
    $("dScan").showModal();
    if (!det) { $("scanMsg").textContent = "Dieser Browser kann keine Barcodes erkennen. Nimm „Foto“ oder „Manuell“ (Chrome auf Android funktioniert)."; return; }
    if (!navigator.mediaDevices?.getUserMedia) { $("scanMsg").textContent = "Kein Kamerazugriff (HTTPS nötig). Nimm „Foto“ oder „Manuell“."; return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false });
      $("vid").srcObject = stream; await $("vid").play();
      $("scanMsg").textContent = "Zettel mit dem Code ins Bild halten …"; scanning = true; loop(det);
    } catch (e) { $("scanMsg").textContent = "Kamera nicht verfügbar: " + e.message + ". Nimm „Foto“ oder „Manuell“."; }
  }

  async function loop(det) {
    const v = $("vid");
    while (scanning) {
      try {
        if (v.readyState >= 2) {
          const r = await det.detect(v);
          if (r.length) {
            const raw = r[0].rawValue;
            const photo = await shrink(v), thumb = await thumbOf(photo);
            stopScan();
            if (navigator.vibrate) navigator.vibrate(60);
            openFromScan(raw, photo, thumb); return;
          }
        }
      } catch (e) { /* weiter versuchen */ }
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  function stopScan() {
    scanning = false;
    if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    $("vid").srcObject = null;
    if ($("dScan").open) $("dScan").close();
  }
  host._stopScan = stopScan;

  async function fromPhoto(file) {
    if (!file) return;
    const det = await getDetector();
    let raw = "";
    if (det) { try { const bmp = await createImageBitmap(file); const r = await det.detect(bmp); if (r.length) raw = r[0].rawValue; } catch (e) { /* kein Code */ } }
    const photo = await shrink(file), thumb = await thumbOf(photo);
    openFromScan(raw, photo, thumb, raw ? null : (det ? "Im Foto wurde kein Code erkannt. Inhalt bitte von Hand eintragen." : "Dieser Browser erkennt keine Codes im Foto. Inhalt bitte von Hand eintragen."));
  }

  /* Gescannter Zettel: passt die SGTIN zu einem vorhandenen Gerät, wird dieses ergänzt statt ein neues anzulegen. */
  function openFromScan(raw, photo, thumb, note) {
    const sg = guessSgtin(raw);
    const m = sg ? devices.find((d) => norm(d.sgtin) === sg) : null;
    if (!m) { openEdit(newDev(raw, photo, thumb), note || (devices.length ? "Dieses Gerät ist noch nicht in der Liste." : null)); return; }
    const d = { ...m };
    if (!m.raw) d.raw = raw;
    if (!m.hasPhoto && photo) { d.photo = photo; d.thumb = thumb; }
    openEdit(d, note || `Gerät aus der Liste erkannt: ${m.name || m.type || "ohne Name"}.` + (m.raw || m.hasPhoto ? " Zu diesem Gerät war schon ein Zettel erfasst." : ""));
  }

  /* ---------- Datenmodell ---------- */
  function newDev(raw = "", photo = "", thumb = "") {
    const d = { id: uid(), raw, sgtin: guessSgtin(raw), name: "", type: "", room: "", loc: "", note: "", thumb, created: new Date().toISOString(), isNew: true };
    if (photo) d.photo = photo;
    return d;
  }

  /* ---------- UI ---------- */
  function refreshLists() {
    const rooms = [...new Set(devices.map((d) => d.room).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
    const types = [...new Set(devices.map((d) => d.type).filter(Boolean))].sort();
    $("rooms").innerHTML = rooms.map((r) => `<option value="${esc(r)}">`).join("");
    $("types").innerHTML = types.map((r) => `<option value="${esc(r)}">`).join("");
    const sel = $("fRoom"), v = sel.value;
    sel.innerHTML = '<option value="">Alle Räume</option>' + rooms.map((r) => `<option>${esc(r)}</option>`).join("");
    sel.value = rooms.includes(v) ? v : "";
  }

  const hasLabel = (d) => !!(d.raw || d.hasPhoto);
  function render() {
    refreshLists();
    const q = $("q").value.trim().toLowerCase(), fr = $("fRoom").value, fs = $("fStatus").value;
    const list = devices.filter((d) => (!fr || d.room === fr) && (!fs || (fs === "done") === hasLabel(d)) && (!q || [d.name, d.type, d.room, d.loc, d.sgtin, d.raw, d.note].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => (a.room || "~").localeCompare(b.room || "~", "de") || (a.name || "").localeCompare(b.name || "", "de"));
    $("count").textContent = `(${devices.length}, Zettel ${devices.filter(hasLabel).length}/${devices.length})`;
    $("list").innerHTML = list.length ? list.map((d) => `
      <div class="item" data-id="${esc(d.id)}">
        ${d.thumb ? `<img src="${esc(d.thumb)}" alt="">` : `<img alt="" style="visibility:hidden">`}
        <div style="min-width:0">
          <div class="t">${esc(d.name || d.type || "(ohne Name)")}</div>
          <div class="s"><span class="tag ${hasLabel(d) ? "ok" : "miss"}">${hasLabel(d) ? "Zettel ✓" : "Zettel fehlt"}</span>${d.room ? `<span class="tag">${esc(d.room)}</span>` : ""}${esc(d.loc)}</div>
          <div class="s">${esc(d.type)}${d.type && d.sgtin ? " · " : ""}${d.sgtin ? "SGTIN …" + esc(last4(d.sgtin)) : ""}${d.fw ? " · FW " + esc(d.fw) : ""}</div>
        </div></div>`).join("") :
      `<div class="empty">${devices.length ? "Keine Treffer." : "Noch keine Geräte.<br>Tippe auf „Scannen“ und halte einen Barcodezettel vor die Kamera."}</div>`;
  }

  function showPhoto() {
    const src = typeof cur.photo === "string" ? cur.photo : cur.thumb;
    const p = $("ePhoto"); p.hidden = !src; p.src = src || "";
  }

  function openEdit(d, msg) {
    cur = d;
    $("eTitle").textContent = d.isNew ? "Neues Gerät" : "Gerät bearbeiten";
    $("eRaw").value = d.raw; $("eSgtin").value = d.sgtin; $("eLast4").value = last4(d.sgtin);
    $("eName").value = d.name; $("eType").value = d.type; $("eRoom").value = d.room; $("eLoc").value = d.loc; $("eNote").value = d.note; $("eFw").value = d.fw || "";
    showPhoto();
    if (d.hasPhoto && typeof d.photo !== "string") {
      const id = d.id;
      ws({ type: "hmip_geraete/photo", device_id: id }).then((r) => {
        if (cur && cur.id === id && typeof cur.photo !== "string" && r.photo) { $("ePhoto").src = r.photo; $("ePhoto").hidden = false; }
      }).catch(() => {});
    }
    $("eDel").style.display = d.isNew ? "none" : "";
    showDupMsg(msg);
    $("dEdit").showModal();
  }

  function showDupMsg(extra) {
    let h = "";
    if (extra) h += `<div class="msg warn">${esc(extra)}</div>`;
    if (cur) {
      const dup = findDup($("eRaw").value, $("eSgtin").value, cur.id);
      if (dup) h += `<div class="msg warn">Achtung: Dieser Code ist schon erfasst als „${esc(dup.name || dup.type || "ohne Name")}“ (${esc(dup.room || "ohne Raum")}).</div>`;
      else if (cur.isNew && $("eSgtin").value) h += `<div class="msg ok">SGTIN erkannt, noch nicht vorhanden.</div>`;
      else if (cur.isNew && $("eRaw").value && !$("eSgtin").value) h += `<div class="msg warn">Aus dem Inhalt konnte keine SGTIN abgeleitet werden. Der Rohinhalt wird trotzdem gespeichert; trage die SGTIN bei Bedarf von Hand ein.</div>`;
    }
    $("eMsg").innerHTML = h;
  }

  $("eSgtin").addEventListener("input", () => { $("eLast4").value = last4($("eSgtin").value); showDupMsg(); });
  $("eRaw").addEventListener("input", () => {
    if (!$("eSgtin").value || $("eSgtin").dataset.auto === "1") { const g = guessSgtin($("eRaw").value); $("eSgtin").value = g; $("eSgtin").dataset.auto = "1"; $("eLast4").value = last4(g); }
    showDupMsg();
  });
  $("eSgtin").addEventListener("change", () => { $("eSgtin").dataset.auto = "0"; });

  $("fEdit").addEventListener("submit", async (e) => {
    e.preventDefault();
    Object.assign(cur, { raw: $("eRaw").value.trim(), sgtin: norm($("eSgtin").value), name: $("eName").value.trim(), type: $("eType").value.trim(),
      room: $("eRoom").value.trim(), loc: $("eLoc").value.trim(), note: $("eNote").value.trim(), fw: $("eFw").value.trim(), updated: new Date().toISOString() });
    const dup = findDup(cur.raw, cur.sgtin, cur.id);
    if (dup && !confirm("Dieser Code existiert schon. Trotzdem speichern?")) return;
    try {
      await dbSave(cur);
      devices = await dbAll(); render(); $("dEdit").close(); toast("Gespeichert"); cur = null;
    } catch (err) { alert("Speichern fehlgeschlagen: " + errText(err)); }
  });
  $("eCancel").onclick = () => { $("dEdit").close(); cur = null; };
  $("eDel").onclick = async () => {
    if (!cur || !confirm("Gerät wirklich löschen?")) return;
    try { await dbDel(cur.id); devices = await dbAll(); render(); $("dEdit").close(); cur = null; toast("Gelöscht"); }
    catch (err) { alert("Löschen fehlgeschlagen: " + errText(err)); }
  };
  $("ePhotoDel").onclick = () => { if (cur) { cur.photo = ""; cur.thumb = ""; showPhoto(); } };
  $("ePhotoBtn").onclick = () => { $("filePhoto").dataset.mode = "replace"; $("filePhoto").click(); };
  $("list").addEventListener("click", (e) => {
    const it = e.target.closest(".item"); if (!it) return;
    const d = devices.find((x) => x.id === it.dataset.id); if (d) openEdit({ ...d });
  });
  $("q").addEventListener("input", render); $("fRoom").addEventListener("change", render); $("fStatus").addEventListener("change", render);

  $("bBurger").onclick = () => host.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true }));
  $("bScan").onclick = startScan;
  $("scanClose").onclick = stopScan;
  $("dScan").addEventListener("cancel", stopScan);
  $("bPhoto").onclick = () => { $("filePhoto").dataset.mode = "new"; $("filePhoto").click(); };
  $("bManual").onclick = () => openEdit(newDev());
  $("filePhoto").addEventListener("change", async (e) => {
    const f = e.target.files[0]; const mode = e.target.dataset.mode; e.target.value = ""; if (!f) return;
    try {
      if (mode === "replace" && cur) { cur.photo = await shrink(f); cur.thumb = await thumbOf(cur.photo); showPhoto(); }
      else await fromPhoto(f);
    } catch (err) { alert("Foto konnte nicht verarbeitet werden: " + errText(err)); }
  });

  /* ---------- Export / Import ---------- */
  function download(name, text, type) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  const csvCell = (v) => { v = String(v ?? ""); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function exportCsv() {
    const head = ["Raum", "Einbauort", "Name", "Typ", "Firmware", "SGTIN", "Letzte 4", "Zettel", "Rohinhalt", "Notiz", "Erfasst am"];
    const rows = [...devices].sort((a, b) => (a.room || "~").localeCompare(b.room || "~", "de") || (a.name || "").localeCompare(b.name || "", "de"))
      .map((d) => [d.room, d.loc, d.name, d.type, d.fw, d.sgtin, last4(d.sgtin), hasLabel(d) ? "ja" : "nein", d.raw, d.note, (d.created || "").slice(0, 10)].map(csvCell).join(";"));
    download(`hmip-geraete-${stamp()}.csv`, "﻿" + head.join(";") + "\r\n" + rows.join("\r\n"), "text/csv;charset=utf-8");
  }
  async function exportJson() {
    try {
      toast("Backup wird erstellt …");
      const out = [];
      for (const d of devices) {
        const o = { ...d }; delete o.hasPhoto; delete o.thumb; o.photo = "";
        if (d.hasPhoto) { try { o.photo = (await ws({ type: "hmip_geraete/photo", device_id: d.id })).photo || ""; } catch (e) { /* ohne Foto */ } }
        out.push(o);
      }
      download(`hmip-backup-${stamp()}.json`, JSON.stringify({ app: "hmip-geraete", version: 1, devices: out }, null, 1), "application/json");
    } catch (e) { alert("Backup fehlgeschlagen: " + errText(e)); }
  }
  async function importJson(file) {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== "hmip-geraete" || !Array.isArray(j.devices)) throw new Error("Keine gültige Backup-Datei");
      let n = 0;
      for (const src of j.devices) {
        if (!src || !/^[A-Za-z0-9_-]{1,40}$/.test(String(src.id || ""))) continue;
        const d = { ...src };
        const hasData = typeof d.photo === "string" && d.photo.startsWith("data:image/");
        if (hasData) d.thumb = await thumbOf(d.photo); else { delete d.photo; d.thumb = d.thumb || ""; }
        await dbSave(d); n++;
      }
      devices = await dbAll(); render(); toast(`${n} Geräte importiert`);
    } catch (e) { alert("Import fehlgeschlagen: " + errText(e)); }
  }
  $("bMenu").onclick = () => $("dMenu").showModal();
  $("mClose").onclick = () => $("dMenu").close();
  $("mHa").onclick = async () => {
    $("mHa").disabled = true;
    try {
      const r = await ws({ type: "hmip_geraete/import_ha" });
      devices = await dbAll(); render(); $("dMenu").close();
      toast(`Aus Home Assistant: ${r.added} neu, ${r.updated} aktualisiert` + (r.skipped ? `, ${r.skipped} ohne passende Seriennummer übersprungen` : ""));
    } catch (e) { alert("Übernahme fehlgeschlagen: " + errText(e)); }
    $("mHa").disabled = false;
  };
  $("mCsv").onclick = () => { exportCsv(); $("dMenu").close(); };
  $("mJson").onclick = () => { exportJson(); $("dMenu").close(); };
  $("mImport").onclick = () => $("fileImport").click();
  $("fileImport").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) { importJson(f); $("dMenu").close(); } });

  /* ---------- Start ---------- */
  dbAll().then((l) => { devices = l; render(); }).catch((e) => { render(); alert("Daten konnten nicht geladen werden: " + errText(e)); });
  render();
}

class HmipGeraetePanel extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: "open" }); this._ready = false; this._narrow = false; }
  set hass(h) {
    this._hass = h;
    if (!this._ready) { this._ready = true; this.shadowRoot.innerHTML = TEMPLATE; this._applyNarrow(); init(this); }
  }
  get hass() { return this._hass; }
  set narrow(v) { this._narrow = !!v; this._applyNarrow(); }
  get narrow() { return this._narrow; }
  _applyNarrow() { const b = this.shadowRoot.getElementById("bBurger"); if (b) b.style.display = this._narrow ? "" : "none"; }
  disconnectedCallback() { if (this._stopScan) this._stopScan(); }
}
if (!customElements.get("hmip-geraete-panel")) customElements.define("hmip-geraete-panel", HmipGeraetePanel);

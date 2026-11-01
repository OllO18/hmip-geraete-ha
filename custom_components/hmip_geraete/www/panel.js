/* HmIP Geräteverwaltung – Home-Assistant-Panel (Web Component).
   QR-Codes erzeugt die MIT-lizenzierte Bibliothek qrcode-generator (Kazuhiko Arase), siehe qrcode.mjs. */
import qrcode from "./qrcode.mjs";

/* ---------- Code-Format der HmIP-QR-Code-Aufkleber ----------
   Beobachtet: EQ01 + "SG" + SGTIN (24 Hex) + "DLK" + Geräteschlüssel (32 Hex). Alles andere gilt als unbekanntes Format. */
const CODE_RE = /^(EQ\d{2})SG([0-9A-F]{24})DLK([0-9A-F]{32})$/;
export const norm = (s) => String(s || "").replace(/[\s-]/g, "").toUpperCase();
export function parseCode(raw) {
  const n = norm(raw);
  const m = n.match(CODE_RE);
  if (m) return { fmt: m[1], sgtin: m[2], key: m[3], raw: "" };
  const g = n.match(/[0-9A-F]{24}/); // Notlösung für abweichende Formate: erste 24-stellige Hex-Folge
  return { fmt: "", sgtin: g ? g[0] : "", key: "", raw: String(raw || "").trim() };
}
const validSgtin = (s) => /^[0-9A-F]{24}$/.test(norm(s));

/* Der Geräteschlüssel (128 Bit) steht im QR-Code als 32 Hex-Zeichen und auf dem Aufkleber als Base32 mit
   eigenem Alphabet (ohne D, I, O, V) in Gruppen 5-5-5-5-6. Geprüft an zwei Original-Aufklebern. */
const KEY_CHARS = "0123456789ABCEFGHJKLMNPQRSTUWXYZ";
export function keyToPrinted(hex) {
  let n = BigInt("0x" + norm(hex)), out = "";
  for (let i = 25; i >= 0; i--) out += KEY_CHARS[Number((n >> BigInt(5 * i)) & 31n)];
  return [out.slice(0, 5), out.slice(5, 10), out.slice(10, 15), out.slice(15, 20), out.slice(20)].join("-");
}
/* Nimmt 32 Hex-Zeichen oder die gedruckte Schreibweise (26 Zeichen) und liefert 32 Hex-Zeichen, sonst "" */
export function keyFromInput(input) {
  const n = norm(input);
  if (/^[0-9A-F]{32}$/.test(n)) return n;
  if (n.length === 26 && [...n].every((c) => KEY_CHARS.includes(c))) {
    let v = 0n;
    for (const c of n) v = v * 32n + BigInt(KEY_CHARS.indexOf(c));
    if (v >> 128n === 0n) return v.toString(16).toUpperCase().padStart(32, "0");
  }
  return "";
}
const validKey = (s) => keyFromInput(s) !== "";
/* Inhalt des QR-Codes, den die Homematic-IP-App beim Scannen erwartet */
export function codeContent(d) {
  if (validSgtin(d.sgtin) && validKey(d.key)) return `${d.fmt || "EQ01"}SG${norm(d.sgtin)}DLK${keyFromInput(d.key)}`;
  return d.raw || "";
}
export const hasCode = (d) => !!(validKey(d.key) || d.raw);

/* ---------- QR-Code-Aufkleber (SVG) ---------- */
export function qrMatrix(text) {
  const mode = /^[0-9A-Z $%*+\-./:]+$/.test(text) ? "Alphanumeric" : "Byte";
  const qr = qrcode(0, "M");
  qr.addData(text, mode);
  qr.make();
  return { n: qr.getModuleCount(), dark: (r, c) => qr.isDark(r, c) };
}
const xml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function wrap(text, max, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean), lines = [];
  let line = "";
  for (let w of words) {
    while (w.length > max) { if (line) { lines.push(line); line = ""; } lines.push(w.slice(0, max)); w = w.slice(max); }
    if ((line ? line + " " : "").length + w.length <= max) line = (line ? line + " " : "") + w;
    else { lines.push(line); line = w; }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*$/, "") + "…"; }
  return lines;
}
const cut = (s, n) => (String(s || "").length > n ? String(s).slice(0, n - 1) + "…" : String(s || ""));
const groups = (s) => norm(s).match(/.{1,4}/g) || [];

/* Nachempfunden dem Original-Aufkleber (Hochformat, Breite 50 mm; 1 Einheit = 0,1 mm). Lange Texte werden umbrochen, die Höhe passt
   sich an. Der Schlüssel steht als Text in der gedruckten Schreibweise und steckt zusätzlich im QR-Code. */
export function stickerSvg(d) {
  const text = codeContent(d);
  if (!text) return "";
  const q = qrMatrix(text);
  const area = 370, quiet = 4, m = area / (q.n + 2 * quiet), ox = 65, oy = 108;
  let path = "";
  for (let r = 0; r < q.n; r++) for (let c = 0; c < q.n; c++) {
    if (q.dark(r, c)) path += `M${(ox + (c + quiet) * m).toFixed(2)} ${(oy + (r + quiet) * m).toFixed(2)}h${m.toFixed(2)}v${m.toFixed(2)}h${(-m).toFixed(2)}z`;
  }
  const mono = 'font-family="Courier New,monospace" font-size="28"';
  let y = 520, body = "";
  for (const l of wrap(d.type, 20, 2)) { y += 36; body += `<text x="26" y="${y}" font-size="32" font-weight="bold" fill="#000">${xml(l)}</text>`; }
  for (const l of wrap(d.name, 30, 3)) { y += 31; body += `<text x="26" y="${y}" font-size="25" fill="#000">${xml(l)}</text>`; }
  for (const l of wrap([d.room, d.loc].filter(Boolean).join(" · "), 34, 2)) { y += 28; body += `<text x="26" y="${y}" font-size="22" fill="#555">${xml(l)}</text>`; }
  y += 14;
  if (validKey(d.key)) {
    const g = keyToPrinted(keyFromInput(d.key)).split("-");
    body += `<text x="26" y="${y + 38}" ${mono}>Key:${xml(g.slice(0, 3).join("-"))}-</text>
  <text x="26" y="${y + 74}" ${mono}>${xml(g.slice(3).join("-"))}</text>`;
    y += 92;
  }
  y += 8;
  body += `<line x1="26" y1="${y}" x2="474" y2="${y}" stroke="#000" stroke-width="3"/>`;
  const g = groups(d.sgtin);
  if (validSgtin(d.sgtin)) {
    const line1 = g.slice(0, 3).join("-") + (g.length > 3 ? "-" : "");
    const rest = g.slice(3);
    const last = rest.length ? rest[rest.length - 1] : "";
    const mid = rest.length > 1 ? rest.slice(0, -1).join("-") + "-" : "";
    body += `<text x="26" y="${y + 46}" ${mono}>SGTIN:${xml(line1)}</text>
  <text x="127" y="${y + 82}" ${mono}>${xml(mid)}<tspan font-weight="bold" font-size="31">${xml(last)}</tspan></text>`;
    y += 82;
  } else {
    body += `<text x="26" y="${y + 46}" ${mono}>SGTIN: ${xml(cut(d.sgtin, 22))}</text>`;
    y += 46;
  }
  const h = y + 34;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 ${h}" width="50mm" height="${(h / 10).toFixed(1)}mm" font-family="Arial,Helvetica,sans-serif">
  <rect x="3" y="3" width="494" height="${h - 6}" rx="22" fill="#fff" stroke="#9a9a9a" stroke-width="4"/>
  <text x="250" y="58" text-anchor="middle" font-size="38" fill="#444">QR-Code-Aufkleber</text>
  <text x="250" y="92" text-anchor="middle" font-size="21" font-weight="bold" text-decoration="underline" fill="#000">Aufkleber sorgfältig aufbewahren!</text>
  <rect x="${ox}" y="${oy}" width="${area}" height="${area}" fill="#fff"/>
  <path d="${path}" fill="#000" shape-rendering="crispEdges"/>
  ${body}
</svg>`;
}

function downloadBlob(name, blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
}
function svgToPng(svg, scale = 8) {
  return new Promise((res, rej) => {
    const img = new Image();
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    img.onload = () => {
      const vb = svg.match(/viewBox="0 0 (\d+) (\d+)"/); const vw = vb ? +vb[1] : 500, vh = vb ? +vb[2] : 835;
      const c = document.createElement("canvas"); c.width = vw * scale / 2; c.height = vh * scale / 2;
      const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); c.toBlob((b) => (b ? res(b) : rej(new Error("PNG konnte nicht erzeugt werden"))), "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Aufkleber konnte nicht gezeichnet werden")); };
    img.src = url;
  });
}
/* Druckbogen: 3 Spalten, 9 Aufkleber je A4-Seite */
export function sheetHtml(devices) {
  const items = devices.map((d) => `<div class="s">${stickerSvg(d)}</div>`).join("");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>QR-Code-Aufkleber</title>
<style>@page{size:A4;margin:10mm}body{margin:0;font-family:Arial,sans-serif}
.grid{display:grid;grid-template-columns:repeat(3,50mm);gap:6mm 8mm;justify-content:center}
.s{width:50mm;break-inside:avoid;page-break-inside:avoid}.s svg{display:block}
.hint{font-size:12px;color:#555;margin:0 0 8mm}@media print{.hint{display:none}}</style></head>
<body><p class="hint">${devices.length} QR-Code-Aufkleber. Ausdrucken (Größe 100 %, keine Skalierung) und auf Klebefolie oder Etikettenpapier ausschneiden.</p>
<div class="grid">${items}</div></body></html>`;
}

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
button{font:inherit;display:inline-flex;align-items:center;justify-content:center;text-align:center;line-height:1.2;min-width:0;
  border:0;border-radius:10px;padding:11px 14px;background:#fff;color:#0b5cab;font-weight:600;cursor:pointer;overflow-wrap:anywhere;-webkit-tap-highlight-color:transparent}
header button.burger{background:transparent;color:inherit;padding:4px 8px;font-size:22px;line-height:1}
button.pri{background:var(--pri);color:var(--onpri)}
button.bad{background:var(--bad);color:#fff}
button.ghost{background:transparent;color:var(--pri);border:1px solid var(--line)}
button:disabled{opacity:.5}
main{padding:12px;max-width:900px;margin:0 auto}
.tools{display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap}
input,select,textarea{font:inherit;width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)}
.tools input{flex:2;min-width:160px}.tools select{flex:1;min-width:120px}
.item{background:var(--card);border-radius:12px;padding:10px 12px;margin-bottom:8px;display:flex;gap:10px;align-items:center;
  box-shadow:0 1px 2px #0002;cursor:pointer}
.ico{width:48px;height:48px;border-radius:10px;flex:none;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;letter-spacing:.5px}
.ico.ok{background:color-mix(in srgb,#22a559 28%,transparent)}.ico.miss{background:color-mix(in srgb,#f59e0b 28%,transparent)}
.item .t{font-weight:600}.item .s{color:var(--mut);font-size:14px;word-break:break-all}
.tag{display:inline-block;background:color-mix(in srgb,var(--pri) 18%,transparent);color:var(--pri);border-radius:6px;padding:1px 7px;font-size:12px;margin-right:4px}
.tag.miss{background:color-mix(in srgb,#f59e0b 25%,transparent);color:inherit}.tag.ok{background:color-mix(in srgb,#22a559 25%,transparent);color:inherit}
.empty{text-align:center;color:var(--mut);padding:40px 10px}
dialog{border:0;border-radius:14px;padding:0;width:min(94vw,560px);max-height:92vh;overflow-y:auto;overscroll-behavior:contain;background:var(--card);color:var(--ink)}
dialog::backdrop{background:#0008}
.dlg{padding:14px 14px 10px;display:flex;flex-direction:column;gap:12px}
header h1{line-height:1.2}#count{font-size:13px;opacity:.9;font-weight:400}
.dlg h2{margin:0;font-size:18px;font-weight:500}
label{font-size:13px;color:var(--mut);display:block;margin-bottom:3px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}.row>*{flex:1 1 220px;min-width:0}
.keyrow{display:flex;gap:8px}.keyrow input{flex:1;min-width:0}.keyrow button{flex:none}
.actions{display:flex;flex-wrap:wrap;gap:8px;position:sticky;bottom:0;background:var(--card);padding:10px 0 2px;border-top:1px solid var(--line);margin-top:4px}
.actions button{flex:1 1 auto;padding:12px 10px}
.btns{display:flex;flex-wrap:wrap;gap:8px}.btns button{flex:1 1 auto}
video{width:100%;border-radius:10px;background:#000;max-height:55vh}
.msg{padding:8px 10px;border-radius:8px;font-size:14px}
.msg.warn{background:color-mix(in srgb,#f59e0b 22%,transparent)}
.msg.ok{background:color-mix(in srgb,#22a559 22%,transparent)}
#eSticker{background:#fff;border-radius:10px;padding:6px;align-self:flex-start}#eSticker svg{display:block;width:190px;height:auto}
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#1b2430;color:#fff;padding:10px 16px;border-radius:10px;z-index:99;display:none}
small{color:var(--mut)}
</style>
<header>
  <div class="top"><button class="burger" id="bBurger" style="display:none" aria-label="Menü">☰</button>
    <div><h1>HmIP Geräte</h1><div id="count"></div></div></div>
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
    <select id="fStatus"><option value="">Alle Geräte</option><option value="missing">QR-Code-Aufkleber fehlt</option><option value="done">QR-Code-Aufkleber erfasst</option></select>
  </div>
  <div id="list"></div>
</main>

<input type="file" id="filePhoto" accept="image/*" capture="environment" hidden>
<input type="file" id="fileImport" accept=".json,application/json" hidden>
<div class="toast" id="toast"></div>

<dialog id="dScan"><div class="dlg">
  <h2>QR-Code-Aufkleber scannen</h2>
  <video id="vid" playsinline muted></video>
  <div id="scanMsg" class="msg warn">Kamera wird gestartet …</div>
  <button class="ghost" id="scanClose">Abbrechen</button>
</div></dialog>

<dialog id="dEdit"><form class="dlg" id="fEdit" method="dialog">
  <h2 id="eTitle">Gerät</h2>
  <div id="eMsg"></div>
  <div><label>SGTIN / Gerätenummer <span id="eLast4"></span></label><input id="eSgtin" autocapitalize="characters" spellcheck="false"></div>
  <div><label>Geräteschlüssel (geheim; Hex oder gedruckte Schreibweise)</label>
    <div class="keyrow"><input id="eKey" type="password" autocomplete="off" spellcheck="false" autocapitalize="characters"><button type="button" class="ghost" id="eKeyShow">anzeigen</button></div></div>
  <div id="eRawWrap" hidden><label>Scan-Inhalt (Format unbekannt, unverändert gespeichert)</label><textarea id="eRaw" rows="2" readonly></textarea></div>
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
  <div id="eStBox" hidden>
    <label>QR-Code-Aufkleber (aus den gespeicherten Daten erzeugt)</label>
    <button type="button" class="ghost" id="eStToggle">Aufkleber anzeigen</button>
    <div id="eStWrap" hidden style="margin-top:8px">
      <div id="eSticker"></div>
      <div class="btns" style="margin-top:8px">
        <button type="button" class="ghost" id="eStPng">PNG</button>
        <button type="button" class="ghost" id="eStSvg">SVG</button>
        <button type="button" class="ghost" id="eStPrint">Drucken</button>
      </div>
      <small>Der QR-Code enthält SGTIN und Geräteschlüssel und lässt sich mit der Homematic-IP-App scannen. Der Schlüssel steht auch als Text im Aufkleber, so wie beim Original.</small>
    </div>
  </div>
  <div class="actions">
    <button type="button" class="bad" id="eDel">Löschen</button>
    <button type="button" class="ghost" id="eCancel">Abbrechen</button>
    <button type="submit" class="pri" id="eSave">Speichern</button>
  </div>
  <datalist id="rooms"></datalist><datalist id="types"></datalist>
</form></dialog>

<dialog id="dMenu"><div class="dlg">
  <h2>Übernahme, Aufkleber, Export</h2>
  <button class="pri" id="mHa">Geräte aus Home Assistant übernehmen</button>
  <small>Liest alle eQ-3-Geräte mit Seriennummer aus Home Assistant (Name, Typ, Raum, Firmware). Vorhandene Einträge und deine Eingaben bleiben erhalten.</small>
  <button class="ghost" id="mSheet">QR-Code-Aufkleber drucken (aktuelle Auswahl)</button>
  <button class="ghost" id="mCsv">CSV für Excel exportieren</button>
  <small>Die CSV enthält keine Geräteschlüssel.</small>
  <button class="ghost" id="mJson">Backup (JSON, enthält die Geräteschlüssel)</button>
  <button class="ghost" id="mImport">Backup importieren</button>
  <small>Die Daten liegen in Home Assistant (.storage) und sind in dessen Backups enthalten. Das Panel ist nur für Administratoren sichtbar. Backups aus früheren Versionen lassen sich importieren (Fotos werden nicht mehr übernommen).</small>
  <button class="ghost" id="mClose">Schließen</button>
</div></dialog>
`;

const FIELDS = ["id", "raw", "sgtin", "key", "fmt", "name", "type", "room", "loc", "note", "fw", "created", "updated"];

function init(host) {
  const root = host.shadowRoot;
  const $ = (id) => root.getElementById(id);
  const ws = (m) => host.hass.connection.sendMessagePromise(m);
  let devices = [], cur = null, stream = null, scanning = false, detector = null;

  /* ---------- Helfer ---------- */
  const errText = (e) => (e && (e.message || e.code)) || JSON.stringify(e);
  function toast(t) {
    const e = $("toast"); e.textContent = t; e.style.display = "block";
    clearTimeout(toast.t); toast.t = setTimeout(() => (e.style.display = "none"), 2800);
  }
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const last4 = (s) => norm(s).slice(-4);
  const setLast4 = (s) => { $("eLast4").textContent = norm(s) ? `(letzte 4: ${last4(s)})` : ""; };
  function findDup(sgtin, raw, exceptId) {
    const ns = norm(sgtin);
    return devices.find((d) => d.id !== exceptId && ((ns && norm(d.sgtin) === ns) || (raw && d.raw && d.raw === raw)));
  }

  /* ---------- Server-API (Websocket) ---------- */
  const dbAll = () => ws({ type: "hmip_geraete/list" });
  function dbSave(d) {
    const device = {};
    FIELDS.forEach((k) => (device[k] = d[k] ?? ""));
    return ws({ type: "hmip_geraete/save", device });
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
      $("scanMsg").textContent = "QR-Code-Aufkleber ins Bild halten …"; scanning = true; loop(det);
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
            stopScan();
            if (navigator.vibrate) navigator.vibrate(60);
            openFromScan(raw); return;
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

  /* Foto wird nur ausgewertet und nicht gespeichert */
  async function fromPhoto(file) {
    if (!file) return;
    const det = await getDetector();
    let raw = "";
    if (det) { try { const bmp = await createImageBitmap(file); const r = await det.detect(bmp); if (r.length) raw = r[0].rawValue; } catch (e) { /* kein Code */ } }
    if (!raw) { openEdit(newDev(), det ? "Im Foto wurde kein QR-Code erkannt. SGTIN und Schlüssel bitte von Hand eintragen." : "Dieser Browser erkennt keine Codes im Foto. SGTIN und Schlüssel bitte von Hand eintragen."); return; }
    openFromScan(raw);
  }

  /* Gescannter Code: passt die SGTIN zu einem vorhandenen Gerät, wird dieses ergänzt statt ein neues anzulegen. */
  function openFromScan(raw) {
    const p = parseCode(raw);
    const m = p.sgtin ? devices.find((d) => norm(d.sgtin) === p.sgtin) : null;
    if (!m) {
      const d = newDev();
      Object.assign(d, { sgtin: p.sgtin, key: p.key, fmt: p.fmt, raw: p.raw });
      openEdit(d, p.key ? (devices.length ? "Dieses Gerät ist noch nicht in der Liste." : null)
        : "Das Format des Codes ist unbekannt. Er wird unverändert gespeichert, einen Aufkleber kann die App daraus nicht erzeugen.");
      return;
    }
    const d = { ...m };
    const had = hasCode(m);
    if (!validKey(m.key) && p.key) { d.key = p.key; d.fmt = p.fmt; }
    if (!hasCode(m) && p.raw) d.raw = p.raw;
    openEdit(d, `Gerät aus der Liste erkannt: ${m.name || m.type || "ohne Name"}.` + (had ? " Der QR-Code-Aufkleber war schon erfasst." : ""));
  }

  /* ---------- Datenmodell ---------- */
  function newDev() {
    return { id: uid(), raw: "", sgtin: "", key: "", fmt: "", name: "", type: "", room: "", loc: "", note: "", fw: "", created: new Date().toISOString(), isNew: true };
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

  function filtered() {
    const q = $("q").value.trim().toLowerCase(), fr = $("fRoom").value, fs = $("fStatus").value;
    return devices.filter((d) => (!fr || d.room === fr) && (!fs || (fs === "done") === hasCode(d)) && (!q ||
      [d.name, d.type, d.room, d.loc, d.sgtin, d.note].join(" ").toLowerCase().includes(q)))
      .sort((a, b) => (a.room || "~").localeCompare(b.room || "~", "de") || (a.name || "").localeCompare(b.name || "", "de"));
  }

  function render() {
    refreshLists();
    const list = filtered();
    $("count").textContent = `${devices.length} Geräte · QR-Code-Aufkleber ${devices.filter(hasCode).length}/${devices.length}`;
    $("list").innerHTML = list.length ? list.map((d) => {
      const ok = hasCode(d);
      return `
      <div class="item" data-id="${esc(d.id)}">
        <div class="ico ${ok ? "ok" : "miss"}">${ok ? "QR ✓" : "QR –"}</div>
        <div style="min-width:0">
          <div class="t">${esc(d.name || d.type || "(ohne Name)")}</div>
          <div class="s"><span class="tag ${ok ? "ok" : "miss"}">${ok ? "QR-Code-Aufkleber erfasst" : "QR-Code-Aufkleber fehlt"}</span>${d.room ? `<span class="tag">${esc(d.room)}</span>` : ""}${esc(d.loc)}</div>
          <div class="s">${esc(d.type)}${d.type && d.sgtin ? " · " : ""}${d.sgtin ? "SGTIN …" + esc(last4(d.sgtin)) : ""}${d.fw ? " · FW " + esc(d.fw) : ""}</div>
        </div></div>`;
    }).join("") :
      `<div class="empty">${devices.length ? "Keine Treffer." : "Noch keine Geräte.<br>Öffne das Menü (⋯) und übernimm die Geräte aus Home Assistant, oder tippe auf „Scannen“."}</div>`;
  }

  function draft() {
    return { sgtin: norm($("eSgtin").value), key: keyFromInput($("eKey").value) || norm($("eKey").value), fmt: cur ? cur.fmt : "", raw: cur ? cur.raw : "",
      name: $("eName").value.trim(), type: $("eType").value.trim(), room: $("eRoom").value.trim(), loc: $("eLoc").value.trim() };
  }
  function updateSticker() {
    const d = draft();
    const svg = validKey(d.key) && validSgtin(d.sgtin) ? stickerSvg(d) : "";
    $("eStBox").hidden = !svg;
    $("eSticker").innerHTML = $("eStWrap").hidden ? "" : svg;
    if (!svg) $("eStWrap").hidden = true;
  }

  function openEdit(d, msg) {
    cur = d;
    $("eTitle").textContent = d.isNew ? "Neues Gerät" : "Gerät bearbeiten";
    $("eSgtin").value = d.sgtin; setLast4(d.sgtin);
    $("eKey").value = d.key || ""; $("eKey").type = "password"; $("eKeyShow").textContent = "anzeigen";
    $("eRaw").value = d.raw || ""; $("eRawWrap").hidden = !d.raw;
    $("eName").value = d.name; $("eType").value = d.type; $("eRoom").value = d.room; $("eLoc").value = d.loc; $("eNote").value = d.note; $("eFw").value = d.fw || "";
    $("eStWrap").hidden = true; $("eStToggle").textContent = "Aufkleber anzeigen";
    updateSticker();
    $("eDel").style.display = d.isNew ? "none" : "";
    showMsg(msg);
    $("dEdit").showModal();
  }

  function showMsg(extra) {
    let h = "";
    if (extra) h += `<div class="msg warn">${esc(extra)}</div>`;
    if (cur) {
      const sg = norm($("eSgtin").value), k = norm($("eKey").value), kOk = keyFromInput($("eKey").value);
      const dup = findDup(sg, cur.raw, cur.id);
      if (dup) h += `<div class="msg warn">Achtung: Diese SGTIN ist schon erfasst als „${esc(dup.name || dup.type || "ohne Name")}“ (${esc(dup.room || "ohne Raum")}).</div>`;
      if (sg && !validSgtin(sg)) h += `<div class="msg warn">Eine SGTIN hat 24 Zeichen (0–9, A–F). Hier sind es ${sg.length}.</div>`;
      if (k && !kOk) h += `<div class="msg warn">Der Geräteschlüssel besteht aus 32 Zeichen (0–9, A–F) oder aus 26 Zeichen in der gedruckten Schreibweise (XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX). Hier sind es ${k.length}. Er wird so nicht gespeichert.</div>`;
    }
    $("eMsg").innerHTML = h;
  }

  ["eSgtin", "eKey", "eName", "eType", "eRoom", "eLoc"].forEach((id) => $(id).addEventListener("input", () => {
    if (id === "eSgtin") setLast4($("eSgtin").value);
    showMsg(); updateSticker();
  }));
  $("eKeyShow").onclick = () => { const k = $("eKey"); const show = k.type === "password"; k.type = show ? "text" : "password"; $("eKeyShow").textContent = show ? "verbergen" : "anzeigen"; };
  $("eStToggle").onclick = () => { const w = $("eStWrap"); w.hidden = !w.hidden; $("eStToggle").textContent = w.hidden ? "Aufkleber anzeigen" : "Aufkleber verbergen"; updateSticker(); };
  const stName = () => `qr-code-aufkleber-${last4($("eSgtin").value) || "geraet"}`;
  const curSvg = () => stickerSvg(draft());
  $("eStSvg").onclick = () => downloadBlob(stName() + ".svg", new Blob([curSvg()], { type: "image/svg+xml" }));
  $("eStPng").onclick = async () => { try { downloadBlob(stName() + ".png", await svgToPng(curSvg())); } catch (e) { alert(errText(e)); } };
  $("eStPrint").onclick = () => printSheet([draft()]);

  $("fEdit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const k = keyFromInput($("eKey").value);
    if (norm($("eKey").value) && !k) { alert("Der Geräteschlüssel muss aus 32 Zeichen (0–9, A–F) oder aus 26 Zeichen in der gedruckten Schreibweise bestehen."); return; }
    Object.assign(cur, { sgtin: norm($("eSgtin").value), key: k, name: $("eName").value.trim(), type: $("eType").value.trim(),
      room: $("eRoom").value.trim(), loc: $("eLoc").value.trim(), note: $("eNote").value.trim(), fw: $("eFw").value.trim(), updated: new Date().toISOString() });
    if (k && !cur.fmt) cur.fmt = "EQ01";
    const dup = findDup(cur.sgtin, cur.raw, cur.id);
    if (dup && !confirm("Diese SGTIN existiert schon. Trotzdem speichern?")) return;
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
  $("list").addEventListener("click", (e) => {
    const it = e.target.closest(".item"); if (!it) return;
    const d = devices.find((x) => x.id === it.dataset.id); if (d) openEdit({ ...d });
  });
  $("q").addEventListener("input", render); $("fRoom").addEventListener("change", render); $("fStatus").addEventListener("change", render);

  $("bBurger").onclick = () => host.dispatchEvent(new Event("hass-toggle-menu", { bubbles: true, composed: true }));
  $("bScan").onclick = startScan;
  $("scanClose").onclick = stopScan;
  $("dScan").addEventListener("cancel", stopScan);
  $("bPhoto").onclick = () => $("filePhoto").click();
  $("bManual").onclick = () => openEdit(newDev());
  $("filePhoto").addEventListener("change", async (e) => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { await fromPhoto(f); } catch (err) { alert("Foto konnte nicht verarbeitet werden: " + errText(err)); }
  });

  /* ---------- Druck ---------- */
  function printSheet(list) {
    const withCode = list.filter((d) => codeContent(d));
    if (!withCode.length) { toast("Keine QR-Code-Aufkleber zum Drucken vorhanden"); return; }
    const html = sheetHtml(withCode);
    const f = document.createElement("iframe");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    f.onload = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { downloadBlob("qr-code-aufkleber.html", new Blob([html], { type: "text/html" })); } setTimeout(() => f.remove(), 60000); };
    f.srcdoc = html; document.body.appendChild(f);
  }

  /* ---------- Export / Import ---------- */
  const stamp = () => new Date().toISOString().slice(0, 10);
  const csvCell = (v) => { v = String(v ?? ""); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  function exportCsv() {
    const head = ["Raum", "Einbauort", "Name", "Typ", "Firmware", "SGTIN", "Letzte 4", "QR-Code-Aufkleber", "Notiz", "Erfasst am"];
    const rows = [...devices].sort((a, b) => (a.room || "~").localeCompare(b.room || "~", "de") || (a.name || "").localeCompare(b.name || "", "de"))
      .map((d) => [d.room, d.loc, d.name, d.type, d.fw, d.sgtin, last4(d.sgtin), hasCode(d) ? "ja" : "nein", d.note, (d.created || "").slice(0, 10)].map(csvCell).join(";"));
    downloadBlob(`hmip-geraete-${stamp()}.csv`, new Blob(["﻿" + head.join(";") + "\r\n" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }));
  }
  function exportJson() {
    const out = devices.map((d) => { const o = {}; FIELDS.forEach((k) => (o[k] = d[k] ?? "")); return o; });
    downloadBlob(`hmip-backup-${stamp()}.json`, new Blob([JSON.stringify({ app: "hmip-geraete", version: 2, devices: out }, null, 1)], { type: "application/json" }));
  }
  async function importJson(file) {
    try {
      const j = JSON.parse(await file.text());
      if (j.app !== "hmip-geraete" || !Array.isArray(j.devices)) throw new Error("Keine gültige Backup-Datei");
      let n = 0;
      for (const src of j.devices) {
        if (!src || !/^[A-Za-z0-9_-]{1,40}$/.test(String(src.id || ""))) continue;
        const d = {}; FIELDS.forEach((k) => (d[k] = src[k] ?? ""));
        if (!validKey(d.key) && d.raw) { const p = parseCode(d.raw); if (p.key) { Object.assign(d, { key: p.key, fmt: p.fmt, raw: "" }); if (!d.sgtin) d.sgtin = p.sgtin; } }
        if (!d.sgtin && d.raw) d.sgtin = parseCode(d.raw).sgtin;
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
  $("mSheet").onclick = () => { $("dMenu").close(); printSheet(filtered()); };
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

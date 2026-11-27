/* NEXFORM · CLIENTS SENSE APP (2026-11-19, CLIENTS_01)
   Al panell de Clients: l'entrenador crea un enllaç personal (formulari.html#t=TOKEN) perquè el client respongui
   la valoració sense compte. Les respostes arriben a form_responses i aquí es veuen amb el mateix informe
   (assessCard de valoracio.js). La rutina es prepara a part i s'envia en PDF; aquí només es marca com a enviada.
   Depèn de globals de l'app: $, esc, toast, render, cur, IS_COACH, QStore, assessCard, ago. */

let naLinks = null, naResp = [], naErr = null, naBusy = false, naNew = null, naOpen = null;
const naUrl = t => location.origin + location.pathname.replace(/[^/]*$/, "") + "formulari.html#t=" + t;
const naText = (n, url) => `Ei${n ? " " + String(n).split(" ")[0] : ""}! Per preparar-te la rutina a mida, respon aquesta valoració des del mòbil (uns 10 minuts):\n${url}\n\nQuan la tingui, t'envio la rutina en PDF amb el vídeo de cada exercici 💪`;
const naDays = iso => Math.max(0, Math.ceil((new Date(iso) - new Date()) / 864e5));

async function naLoad() {
  if (naBusy || !QStore.sb) return; naBusy = true;
  try {
    const now = new Date().toISOString();
    const l = await QStore.sb.from("form_links").select("token,name,created_at,expires_at").is("used_at", null).gt("expires_at", now).order("created_at", { ascending: false });
    if (l.error) throw l.error;
    const r = await QStore.sb.from("form_responses").select("id,name,lang,data,status,created_at,sent_at").order("created_at", { ascending: false });
    if (r.error) throw r.error;
    naLinks = l.data || []; naResp = r.data || []; naErr = null;
  } catch (e) { naErr = e.message; naLinks = naLinks || []; }
  naBusy = false;
  const n = naPending().length, changed = n !== naSeenN; naSeenN = n;
  if (cur === "clients" || (changed && IS_COACH() && !CV())) render();
}

/* Avís a l'entrenador (2026-11-26, CLIENTS_04): valoracions rebudes amb la rutina encara per fer (sense «PDF enviat»).
   Es carreguen en obrir l'app i cada cop que torna a primer pla; surten com a bombolla a «Clients» i targeta a l'inici. */
let naSeenN = -1;
const naPending = () => { if (naLinks == null && !naErr && IS_COACH()) naLoad(); return naResp.filter(r => r.status !== "enviada"); };
function naBanner() {
  if (!IS_COACH() || CV()) return "";
  const p = naPending(); if (!p.length) return "";
  return `<a href="#clients" class="card stack" style="gap:6px;text-decoration:none;color:inherit;border:1.5px solid var(--warn)">
    <span class="lbl" style="color:var(--warn)">📋 ${p.length === 1 ? "Valoració nova · rutina per fer" : p.length + " valoracions noves · rutines per fer"}</span>
    ${p.slice(0, 4).map(r => `<div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(r.name || "Sense nom")}</b><span class="sub" style="font-size:13px">${esc(ago(r.created_at))}${(r.data || {}).parqAlert ? " · ⚠️ Salut: revisar" : ""}</span></div>`).join("")}
    <span class="sub" style="font-size:13px">Toca per veure-les a Clients →</span></a>`;
}
function naWatch() { if (IS_COACH()) naLoad(); }
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") naWatch(); });

function noAppCard() {
  if (!IS_COACH()) return "";
  if (naLinks == null && !naErr) naLoad();
  let h = `<section class="card stack" id="na-card"><span class="lbl">Clients sense app · rutina en PDF</span>
    <p class="sub" style="margin:0;font-size:13px">Per a qui no vols que tingui l'app: respon la valoració amb un enllaç, sense compte ni contrasenya, i li envies la rutina en PDF.</p>
    <label class="f"><span class="lbl">Nom del client</span><input id="na-name" autocomplete="off"></label>
    <button class="primary" id="na-make" type="button" style="height:50px">📲 Crear enllaç</button>`;
  if (naNew) h += `<div class="card stack" style="border:1.5px solid var(--good)"><span><b>Enllaç llest per a ${esc(naNew.name)}.</b> Només serveix per a aquesta persona, un sol cop, i caduca en 7 dies.</span>
      <a href="https://wa.me/?text=${encodeURIComponent(naText(naNew.name, naUrl(naNew.token)))}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;color:#fff;background:#25D366;border-radius:16px;padding:15px;font-weight:700;font-size:18px">Obrir WhatsApp</a>
      <div class="btns" style="margin:0"><button type="button" data-na-copy="${esc(naNew.token)}" data-na-n="${esc(naNew.name)}">Copiar el missatge</button></div></div>`;
  if (naErr) h += `<div class="note">No s'han pogut carregar: ${esc(naErr)}</div>`;
  else if (naLinks == null) h += `<div class="sub">Carregant…</div>`;
  else {
    naResp.forEach(r => {
      const d = r.data || {}, alert = d.parqAlert, sent = r.status === "enviada";
      h += `<article class="card stack" style="gap:8px"><div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div style="min-width:0"><h3 style="margin:0">${esc(r.name || "Sense nom")}</h3><div class="sub" style="font-size:13px">Valoració ${esc(ago(r.created_at))}${r.lang === "es" ? " · castellà" : ""} · ${esc(d.goal || "")}${d.days ? " · " + esc(d.days) + " dies" : ""}</div></div>
        <div class="ph" style="justify-content:flex-end">${alert ? `<span class="pill w">Salut: revisar</span>` : ""}${sent ? `<span class="pill">📄 PDF enviat</span>` : `<span class="pill" style="background:var(--warn,#c77700);color:#fff">🕒 Rutina per fer</span>`}</div></div>
        <div class="btns" style="margin:0"><button class="primary" data-na-open="${esc(r.id)}">${naOpen === r.id ? "Amagar la valoració" : "Veure la valoració"}</button>
          <button data-na-sent="${esc(r.id)}" data-na-v="${sent ? "pendent" : "enviada"}">${sent ? "Desfer «enviat»" : "Marcar PDF enviat"}</button></div>
        ${naOpen === r.id ? (assessCard(d, true) || `<div class="note">Aquesta valoració no té el format nou.</div>`) : ""}</article>`;
    });
    if (naLinks.length) h += `<div class="tw" style="padding:0"><table><thead><tr><th>Enllaços sense respondre</th><th class="r"></th></tr></thead><tbody>
      ${naLinks.map(l => `<tr><td><b>${esc(l.name)}</b><div class="sub" style="font-size:12px">creat ${esc(ago(l.created_at))} · caduca en ${naDays(l.expires_at)} dies</div></td>
        <td class="r" style="white-space:nowrap"><button class="plain" data-na-copy="${esc(l.token)}" data-na-n="${esc(l.name)}" aria-label="Copiar el missatge">📋</button><button class="plain" data-na-del="${esc(l.token)}" style="color:var(--bad)" aria-label="Anul·lar">✕</button></td></tr>`).join("")}</tbody></table></div>`;
    if (!naResp.length && !naLinks.length) h += `<div class="sub" style="font-size:13px">Encara no n'hi ha cap.</div>`;
  }
  return h + `</section>`;
}

document.addEventListener("click", async e => {
  if (!e.target.closest("#na-card")) return; const b = e.target.closest("button"); if (!b) return;
  if (b.id === "na-make") {
    const name = ($("#na-name").value || "").trim(); if (!name) { toast("Escriu el nom del client"); return; }
    b.disabled = true;
    try {
      const { data, error } = await QStore.sb.from("form_links").insert({ name }).select("token,name,created_at,expires_at").single();
      if (error) throw error;
      naNew = data; naLinks = [data, ...(naLinks || [])]; render();
    } catch (err) { b.disabled = false; toast("No s'ha pogut crear l'enllaç: " + err.message); }
    return;
  }
  if (b.dataset.naCopy) {
    const t = naText(b.dataset.naN, naUrl(b.dataset.naCopy));
    try { await navigator.clipboard.writeText(t); toast("Missatge copiat"); } catch (err) { prompt("Copia el missatge:", t); }
    return;
  }
  if (b.dataset.naOpen) { naOpen = naOpen === b.dataset.naOpen ? null : b.dataset.naOpen; render(); return; }
  if (b.dataset.naSent) {
    const v = b.dataset.naV;
    try {
      const { error } = await QStore.sb.from("form_responses").update({ status: v, sent_at: v === "enviada" ? new Date().toISOString() : null }).eq("id", b.dataset.naSent);
      if (error) throw error;
      const r = naResp.find(x => x.id === b.dataset.naSent); if (r) r.status = v; render();
    } catch (err) { toast("Error: " + err.message); }
    return;
  }
  if (b.dataset.naDel) {
    try {
      const { error } = await QStore.sb.from("form_links").delete().eq("token", b.dataset.naDel);
      if (error) throw error;
      naLinks = naLinks.filter(x => x.token !== b.dataset.naDel); if (naNew && naNew.token === b.dataset.naDel) naNew = null; toast("Enllaç anul·lat"); render();
    } catch (err) { toast("Error: " + err.message); }
  }
});

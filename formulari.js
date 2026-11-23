/* NEXFORM · FORMULARI SENSE APP (2026-11-19, CLIENTS_01)
   Valoració inicial per a clients que no fan servir l'app: s'obre amb un enllaç personal (formulari.html#t=TOKEN)
   que crea l'entrenador a Clients. Sense compte ni contrasenya.
   Reaprofita valoracio.js (mateixes preguntes, català o castellà) i, en lloc de desar a intake/inicial,
   envia les respostes amb l'RPC form_submit. L'enllaç només serveix un cop i caduca en 7 dies.
   Aquest fitxer va ABANS de valoracio.js: defineix els helpers globals que valoracio.js espera de l'app. */

const SB_URL = "https://tsgvbxvrufuqlbzekmwd.supabase.co";
const SB_KEY = "sb_publishable_CIQ_0caYmCUsbustLjvTfg_qZR4At_K";
window.V_FORM = true;

/* helpers que valoracio.js agafa d'app.js i coach.js */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dt = iso => new Date(iso + "T12:00:00");
const fdate = (iso, o) => dt(iso).toLocaleDateString("ca-ES", o || { day: "numeric", month: "short" });
const ageFrom = b => { if (!b) return null; const d = new Date(b), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n < new Date(n.getFullYear(), d.getMonth(), d.getDate())) a--; return a; };
const INTAKE_GOALS = ["Perdre greix", "Guanyar múscul", "Recomposició (perdre greix i guanyar múscul)", "Millorar força o rendiment", "Salut i benestar"];
const FTOKEN = (/[#&]t=([a-f0-9]{16,64})/.exec(location.hash) || [])[1] || "";
/* si s'obre un altre enllaç a la mateixa pestanya, només canvia el #t=… i el navegador no recarrega la pàgina:
   sense això es quedaria el formulari (i el nom) de la persona anterior */
window.addEventListener("hashchange", () => location.reload());
const QStore = { uid: "f_" + FTOKEN.slice(0, 12), profile: { name: "" } };
const intakeDoc = () => null;

async function frpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: SB_KEY, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || ("Error " + r.status));
  return j;
}

/* CONSENTIMENT OBLIGATORI (2026-11-23, CLIENTS_02, decisió de l'entrenador: el servei és de pagament).
   Surt a la pantalla de revisió, just abans d'«Enviar»: sense les 3 caselles el botó no s'activa.
   S'envia dins el payload (consent) amb la versió i l'hora. Sense IA: ELION està apagat. */
const FCONSENT_VERSION = "form-v1-2026-11";
const vCons = { adult: false, health: false, truth: false };
window.vConsentOk = () => vCons.adult && vCons.health && vCons.truth;
window.vConsentBlock = () => `<div class="card stack" style="gap:10px;font-size:14px;line-height:1.45">
  <b style="font-size:16px">${VT("Protecció de dades")}</b>
  <p style="margin:0">${VT("Responsable: Sergi Coma, entrenador personal. Les teves respostes, incloses les de salut, només serveixen per preparar-te la rutina i fer-ne el seguiment. No es venen ni es cedeixen a ningú.")}</p>
  <p style="margin:0">${VT("Es guarden a Supabase, amb servidors a la UE, mentre siguis client. Pots demanar veure-les, corregir-les o esborrar-les quan vulguis dient-ho al teu entrenador. Si creus que no es respecten els teus drets, pots reclamar a l'Agència Espanyola de Protecció de Dades (aepd.es).")}</p>
  <p style="margin:0;color:var(--muted,#666)">${VT("Base legal: el teu consentiment explícit (art. 6.1.a i 9.2.a RGPD i Llei orgànica 3/2018).")}</p>
  ${[["adult", "Tinc 18 anys o més."],
     ["health", "Consenteixo expressament que el meu entrenador tracti les meves dades de salut per preparar-me la rutina i fer-ne el seguiment."],
     ["truth", "Les meves respostes de salut són certes. Si n'he marcat alguna amb «Sí» o «No ho sé», consultaré el metge abans de començar a entrenar."]]
    .map(([k, t]) => `<label class="chkl" style="display:flex;gap:10px;align-items:flex-start"><input type="checkbox" data-fc="${k}" ${vCons[k] ? "checked" : ""} style="width:22px;height:22px;flex:none;margin-top:1px"> <span>${VT(t)}</span></label>`).join("")}
</div>`;
/* VAL_ES és de valoracio.js, que es carrega després: s'hi afegeix al DOMContentLoaded */
const FCONSENT_ES = Object.assign({}, {
  "Protecció de dades": "Protección de datos",
  "Responsable: Sergi Coma, entrenador personal. Les teves respostes, incloses les de salut, només serveixen per preparar-te la rutina i fer-ne el seguiment. No es venen ni es cedeixen a ningú.":
    "Responsable: Sergi Coma, entrenador personal. Tus respuestas, incluidas las de salud, solo sirven para prepararte la rutina y hacer su seguimiento. No se venden ni se ceden a nadie.",
  "Es guarden a Supabase, amb servidors a la UE, mentre siguis client. Pots demanar veure-les, corregir-les o esborrar-les quan vulguis dient-ho al teu entrenador. Si creus que no es respecten els teus drets, pots reclamar a l'Agència Espanyola de Protecció de Dades (aepd.es).":
    "Se guardan en Supabase, con servidores en la UE, mientras seas cliente. Puedes pedir verlas, corregirlas o borrarlas cuando quieras diciéndoselo a tu entrenador. Si crees que no se respetan tus derechos, puedes reclamar a la Agencia Española de Protección de Datos (aepd.es).",
  "Base legal: el teu consentiment explícit (art. 6.1.a i 9.2.a RGPD i Llei orgànica 3/2018).":
    "Base legal: tu consentimiento explícito (art. 6.1.a y 9.2.a RGPD y Ley Orgánica 3/2018).",
  "Tinc 18 anys o més.": "Tengo 18 años o más.",
  "Consenteixo expressament que el meu entrenador tracti les meves dades de salut per preparar-me la rutina i fer-ne el seguiment.":
    "Consiento expresamente que mi entrenador trate mis datos de salud para prepararme la rutina y hacer su seguimiento.",
  "Les meves respostes de salut són certes. Si n'he marcat alguna amb «Sí» o «No ho sé», consultaré el metge abans de començar a entrenar.":
    "Mis respuestas de salud son ciertas. Si he marcado alguna con «Sí» o «No lo sé», consultaré al médico antes de empezar a entrenar.",
});
/* marcar una casella només activa o desactiva el botó (sense redibuixar la pantalla) */
document.addEventListener("change", e => {
  const k = e.target && e.target.dataset && e.target.dataset.fc; if (!k) return;
  vCons[k] = e.target.checked;
  const b = $("#v-send"); if (b && !vBusy) b.disabled = +b.dataset.miss > 0 || !window.vConsentOk();
});

/* missatges de l'enllaç (bilingües: encara no sabem l'idioma) */
function fMsg(ca, es) {
  $("#v-valoracio").innerHTML = `<section class="vslide vdone"><h1 class="vbig" style="font-size:30px">${ca}</h1><p class="vhelp" style="margin:0">${es}</p></section>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  /* textos propis del mode sense app */
  const lq = VQ.find(q => q.id === "lang"); if (lq) lq.h = "Et prepararé la rutina en aquest idioma.";
  const kq = VQ.find(q => q.id === "kg"); if (kq) kq.h = "Si no ho saps exacte, posa-hi un aproximat.";
  VAL_ES["Si no ho saps exacte, posa-hi un aproximat."] = "Si no lo sabes exacto, pon un aproximado.";
  Object.assign(VAL_ES, FCONSENT_ES);

  /* enviar: per RPC, no a la base de dades de l'app */
  vSend = async function () {
    if (!window.vConsentOk()) return; /* segona barrera: sense consentiment no s'envia res */
    const b = $("#v-send"); vBusy = true; if (b) { b.disabled = true; b.textContent = VT("Enviant…"); }
    try {
      const payload = vBuildDoc();
      payload.consent = { version: FCONSENT_VERSION, adult: true, health: true, truth: true, at: new Date().toISOString(), ua: navigator.userAgent.slice(0, 200) };
      await frpc("form_submit", { t: FTOKEN, payload });
      vScreen = "done"; vBusy = false;
      try { localStorage.removeItem(vKey()); } catch (e) {}
      renderValoracio(); window.scrollTo(0, 0);
    } catch (err) { vBusy = false; renderValoracio(); const m = $("#v-err"); if (m) m.textContent = VT("No s'ha pogut enviar:") + " " + err.message; }
  };

  if (!FTOKEN) return fMsg("Aquest enllaç no és complet", "Este enlace no está completo. Pide a tu entrenador que te lo vuelva a enviar.");
  let info;
  try { info = await frpc("form_link_info", { t: FTOKEN }); }
  catch (e) { return fMsg("No s'ha pogut carregar", "No se ha podido cargar. Comprueba la conexión y vuelve a abrir el enlace."); }
  if (info.used) return fMsg("Ja l'has enviada. Gràcies!", "Ya la has enviado. ¡Gracias! Tu entrenador ya está preparando tu rutina.");
  if (info.expired) return fMsg("Aquest enllaç ha caducat", "Este enlace ha caducado. Pide a tu entrenador uno nuevo.");
  if (!info.ok) return fMsg("Aquest enllaç no és vàlid", "Este enlace no es válido. Pide a tu entrenador que te lo vuelva a enviar.");
  QStore.profile.name = info.name || "";
  renderValoracio();
});

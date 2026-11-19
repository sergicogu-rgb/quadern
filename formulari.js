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

/* missatges de l'enllaç (bilingües: encara no sabem l'idioma) */
function fMsg(ca, es) {
  $("#v-valoracio").innerHTML = `<section class="vslide vdone"><h1 class="vbig" style="font-size:30px">${ca}</h1><p class="vhelp" style="margin:0">${es}</p></section>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  /* textos propis del mode sense app */
  const lq = VQ.find(q => q.id === "lang"); if (lq) lq.h = "Et prepararé la rutina en aquest idioma.";
  const kq = VQ.find(q => q.id === "kg"); if (kq) kq.h = "Si no ho saps exacte, posa-hi un aproximat.";
  VAL_ES["Si no ho saps exacte, posa-hi un aproximat."] = "Si no lo sabes exacto, pon un aproximado.";

  /* enviar: per RPC, no a la base de dades de l'app */
  vSend = async function () {
    const b = $("#v-send"); vBusy = true; if (b) { b.disabled = true; b.textContent = VT("Enviant…"); }
    try {
      await frpc("form_submit", { t: FTOKEN, payload: vBuildDoc() });
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

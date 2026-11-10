// Envia una notificació push (Web Push) per a una fila de public.notifications.
// Només rep l'id; tot el contingut el llegeix de la base de dades amb la service role.
// (2026-11-10) Còpia de la versió 2 desplegada a Supabase (verify_jwt: false), desada al repositori per tenir-la versionada.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let ready = false;
async function init() {
  if (ready) return;
  const { data, error } = await sb.from("app_secrets").select("name,value").in("name", ["vapid_public", "vapid_private"]);
  if (error) throw error;
  const k = Object.fromEntries(data.map((r: any) => [r.name, r.value]));
  webpush.setVapidDetails("mailto:quadern@example.com", k.vapid_public, k.vapid_private);
  ready = true;
}

Deno.serve(async (req) => {
  try {
    const { id } = await req.json();
    if (!Number.isInteger(id)) return Response.json({ error: "id" }, { status: 400 });
    await init();
    const { data: n, error } = await sb.from("notifications").select("*").eq("id", id).is("sent_at", null).maybeSingle();
    if (error) throw error;
    if (!n) return Response.json({ skipped: true });
    await sb.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
    const { count } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", n.user_id).is("read_at", null);
    const { data: subs } = await sb.from("push_subs").select("*").eq("user_id", n.user_id);
    const payload = JSON.stringify({ id: n.id, title: n.title, body: n.body || "", url: n.url || "./", badge: count || 1 });
    const results: any[] = [];
    for (const s of subs || []) {
      try {
        const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: "high" });
        results.push({ ep: s.endpoint.slice(0, 40), status: r.statusCode });
      } catch (e: any) {
        results.push({ ep: s.endpoint.slice(0, 40), status: e.statusCode, err: String(e.body || e.message || e).slice(0, 200) });
        if (e.statusCode === 404 || e.statusCode === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
      }
    }
    await sb.from("notifications").update({ result: { subs: results.length, results } }).eq("id", n.id);
    return Response.json({ sent: results });
  } catch (e: any) {
    console.error(e);
    return Response.json({ error: String(e.message || e) }, { status: 500 });
  }
});

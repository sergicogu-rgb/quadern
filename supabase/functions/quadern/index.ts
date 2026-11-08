// Quadern · funcions de servidor: convidar clients i esborrar el compte (RGPD).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const URL_ = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP = "https://sergicogu-rgb.github.io/quadern/";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const asUser = createClient(URL_, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await asUser.auth.getUser();
    if (!user) return json({ error: "Cal iniciar sessió" }, 401);
    const admin = createClient(URL_, SERVICE, { auth: { persistSession: false } });
    const { data: me } = await admin.from("profiles").select("id,role,name").eq("id", user.id).single();
    const body = await req.json().catch(() => ({}));

    if (body.action === "invite") {
      if (me?.role !== "coach") return json({ error: "Només l'entrenador pot convidar" }, 403);
      const email = String(body.email || "").trim().toLowerCase();
      const name = String(body.name || "").trim().slice(0, 80) || email.split("@")[0];
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Correu no vàlid" }, 400);

      // Ja té compte?
      const { data: prof } = await admin.from("profiles").select("id,coach_id").ilike("email", email).maybeSingle();
      if (prof) {
        if (prof.coach_id && prof.coach_id !== user.id) return json({ error: "Aquest compte ja té un altre entrenador" }, 409);
        if (prof.id === user.id) return json({ error: "No et pots convidar a tu mateix" }, 400);
        const already = prof.coach_id === user.id;
        if (!already) {
          await admin.from("profiles").update({ coach_id: user.id }).eq("id", prof.id);
          await admin.from("invites").upsert({ email, coach_id: user.id, name, accepted_at: new Date().toISOString(), user_id: prof.id });
        }
        // Client que encara no ha començat (sense consentiment ni dades): es torna a convidar de zero,
        // perquè rebi el correu de benvinguda en lloc del de canviar contrasenya.
        if (already) {
          const { count: nc } = await admin.from("consents").select("id", { count: "exact", head: true }).eq("user_id", prof.id);
          const { count: nd } = await admin.from("docs").select("id", { count: "exact", head: true }).eq("user_id", prof.id);
          if (!nc && !nd) {
            await admin.auth.admin.deleteUser(prof.id);
            await admin.from("invites").upsert({ email, coach_id: user.id, name, created_at: new Date().toISOString(), accepted_at: null, user_id: null });
            const inv = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: APP, data: { name, invited_by: me.name } });
            if (!inv.error) return json({ ok: true, emailed: true, reinvited: true });
            const g0 = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: APP } });
            return json({ ok: !g0.error, emailed: false, link: g0.error ? null : g0.data.properties.action_link, reason: inv.error.message });
          }
        }
        // Client que ja fa servir l'app: correu per crear (o canviar) la contrasenya
        const pub = createClient(URL_, ANON, { auth: { persistSession: false } });
        const r = await pub.auth.resetPasswordForEmail(email, { redirectTo: APP });
        if (!r.error) return json({ ok: true, existing: true, emailed: true });
        const g = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: APP } });
        return json({ ok: !g.error, existing: true, emailed: false, link: g.error ? null : g.data.properties.action_link, reason: r.error.message });
      }

      await admin.from("invites").upsert({ email, coach_id: user.id, name, created_at: new Date().toISOString(), accepted_at: null, user_id: null });
      const { error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: APP, data: { name, invited_by: me.name } });
      if (!error) return json({ ok: true, emailed: true });

      // El correu no ha sortit (límit o servidor de correu no configurat): torna un enllaç per enviar a mà.
      let link: string | null = null;
      const g1 = await admin.auth.admin.generateLink({ type: "invite", email, options: { redirectTo: APP } });
      if (!g1.error) link = g1.data.properties.action_link;
      else {
        const g2 = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: APP } });
        if (!g2.error) link = g2.data.properties.action_link;
      }
      return json({ ok: !!link, emailed: false, link, reason: error.message });
    }

    if (body.action === "delete_account") {
      if (me?.role === "coach") return json({ error: "El compte de l'entrenador no es pot esborrar des d'aquí" }, 400);
      // fotos
      const { data: files } = await admin.storage.from("fotos").list(user.id, { limit: 1000 });
      if (files?.length) await admin.storage.from("fotos").remove(files.map((f) => `${user.id}/${f.name}`));
      await admin.from("docs").delete().eq("user_id", user.id);
      await admin.from("consents").delete().eq("user_id", user.id);
      await admin.from("invites").delete().eq("user_id", user.id);
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Acció desconeguda" }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});

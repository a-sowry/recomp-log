// Recomp Log: sends "rest over" notifications when they're due.
// A database cron job calls this every few seconds while any notification is due (see supabase/push.sql).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const STALE_MS = 10 * 60 * 1000; // don't send anything more than 10 minutes late
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// deno-lint-ignore no-explicit-any
export async function sendDue(db: any, push: any, now = () => Date.now()) {
  const horizon = new Date(now() + 3000).toISOString();
  const { data: jobs, error } = await db.from("push_jobs").select("id,user_id,send_at,title,body,tag").lte("send_at", horizon).order("send_at").limit(200);
  if (error) throw error;
  if (!jobs?.length) return { sent: 0, gone: 0, skipped: 0 };
  // Claim the jobs by deleting them; only send the ones this run actually deleted, so overlapping runs never double-send.
  const { data: claimed, error: delErr } = await db.from("push_jobs").delete().in("id", jobs.map((j: { id: string }) => j.id)).select("id");
  if (delErr) throw delErr;
  const ids = new Set((claimed || []).map((c: { id: string }) => c.id));
  const mine = jobs.filter((j: { id: string }) => ids.has(j.id));
  const users = [...new Set(mine.map((j: { user_id: string }) => j.user_id))];
  const { data: subs, error: subErr } = await db.from("push_subs").select("endpoint,p256dh,auth,user_id").in("user_id", users);
  if (subErr) throw subErr;
  let sent = 0, skipped = 0;
  const gone: string[] = [];
  // deno-lint-ignore no-explicit-any
  await Promise.all(mine.map(async (job: any) => {
    const due = new Date(job.send_at).getTime();
    if (now() - due > STALE_MS) { skipped++; return; }
    if (due > now()) await sleep(Math.min(due - now(), 3000));
    // deno-lint-ignore no-explicit-any
    for (const s of (subs || []).filter((x: any) => x.user_id === job.user_id)) {
      try {
        await push.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: job.title, body: job.body, tag: job.tag || "rest" }),
          { TTL: 300, urgency: "high" },
        );
        sent++;
      } catch (e) {
        // deno-lint-ignore no-explicit-any
        const code = (e as any)?.statusCode;
        if (code === 404 || code === 410) gone.push(s.endpoint); // phone unsubscribed or app removed
        else console.error("push failed", code, (e as Error)?.message);
      }
    }
  }));
  if (gone.length) await db.from("push_subs").delete().in("endpoint", gone);
  return { sent, gone: gone.length, skipped };
}

function serviceKey() {
  const k = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (k) return k;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default; } catch { return undefined; }
}

if (!Deno.env.get("PUSH_TEST")) {
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@example.com", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  Deno.serve(async (req) => {
    if (req.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return new Response("Not allowed", { status: 401 });
    const db = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey()!, { auth: { persistSession: false } });
    try { return Response.json(await sendDue(db, webpush)); }
    catch (e) { console.error(e); return Response.json({ error: String((e as Error)?.message || e) }, { status: 500 }); }
  });
}

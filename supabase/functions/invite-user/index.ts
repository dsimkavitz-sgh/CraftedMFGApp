// Invite a staff member by email (admin only). Self-contained so it can be
// pasted straight into the Supabase dashboard's Edge Function editor.
//
// POST { email, full_name, role }  (role: admin | manager | warehouse)
//
// Uses Supabase's built-in invite email: the user receives a link, sets a
// password, and the on_auth_user_created trigger mirrors them into
// public.users with the requested role.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const VALID_ROLES = ["admin", "manager", "warehouse"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // ── Caller must be an admin ─────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Not authorized" }, 401);
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const {
      data: { user },
    } = await anon.auth.getUser();
    if (!user) return json({ error: "Not authorized" }, 401);
    const { data: caller } = await service.from("users").select("role").eq("id", user.id).single();
    if (caller?.role !== "admin") return json({ error: "Admin access required" }, 403);

    // ── Validate input ──────────────────────────────────────────────────────
    const { email, full_name, role } = await req.json().catch(() => ({}));
    if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return json({ error: "A valid email is required" }, 400);
    }
    if (!VALID_ROLES.includes(role)) {
      return json({ error: `role must be one of: ${VALID_ROLES.join(", ")}` }, 400);
    }

    // ── Send the invite ─────────────────────────────────────────────────────
    const { data, error } = await service.auth.admin.inviteUserByEmail(email.trim(), {
      data: { full_name: typeof full_name === "string" ? full_name.trim() : "", role },
    });
    if (error) return json({ error: error.message }, 400);

    return json({ ok: true, user_id: data.user?.id ?? null });
  } catch (err) {
    console.error("invite-user error:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error" }, 500);
  }
});

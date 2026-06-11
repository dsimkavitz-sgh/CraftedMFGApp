import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Landing endpoint for Supabase email links (invites + password resets).
 * The email templates link here with ?token_hash=...&type=invite|recovery;
 * we verify the token (which signs the user in) and send them to the
 * set-password form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth/set-password";

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // Missing/expired token: the set-password page shows a friendly explainer.
  return NextResponse.redirect(new URL("/auth/set-password?expired=1", request.url));
}

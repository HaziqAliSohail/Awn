import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      return NextResponse.json({ error: "Could not generate link" }, { status: 500 });
    }

    // Convert Supabase action link to local callback redirect
    const urlObj = new URL(actionLink);
    const tokenHash = urlObj.searchParams.get("token") || urlObj.searchParams.get("hashed_token");
    const redirectUrl = `/callback?token_hash=${tokenHash}&type=magiclink`;

    return NextResponse.json({ success: true, redirectUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate link" },
      { status: 500 }
    );
  }
}

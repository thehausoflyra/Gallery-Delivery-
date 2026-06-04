import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import type { Database } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch gallery
    const { data: gallery, error } = await supabase
      .from("galleries")
      .select("id, password_hash, is_published, expires_at")
      .eq("slug", slug)
      .single();

    if (error || !gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (!gallery.is_published) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
      return NextResponse.json({ error: "Gallery has expired" }, { status: 410 });
    }

    if (!gallery.password_hash) {
      // No password required
      return NextResponse.json({ success: true });
    }

    const isValid = await bcrypt.compare(password, gallery.password_hash);

    if (!isValid) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    // Set auth cookie
    const cookieName = `gallery_auth_${slug}`;
    const response = NextResponse.json({ success: true });
    response.cookies.set(cookieName, gallery.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Verify password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; itemId: string } }
) {
  try {
    const { slug, itemId } = params;

    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Fetch gallery
    const { data: gallery, error: galleryError } = await supabase
      .from("galleries")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (galleryError || !gallery) {
      return NextResponse.json({ error: "Gallery not found" }, { status: 404 });
    }

    if (!gallery.allow_downloads) {
      return NextResponse.json({ error: "Downloads not allowed" }, { status: 403 });
    }

    if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
      return NextResponse.json({ error: "Gallery has expired" }, { status: 410 });
    }

    // Fetch media item
    const { data: item, error: itemError } = await supabase
      .from("media_items")
      .select("*")
      .eq("id", itemId)
      .eq("gallery_id", gallery.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Create a signed URL (1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("gallery-media")
      .createSignedUrl(item.storage_path, 3600);

    if (signedUrlError || !signedUrlData) {
      return NextResponse.json({ error: "Could not generate download URL" }, { status: 500 });
    }

    // Log download
    const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    await supabase.from("download_logs").insert({
      gallery_id: gallery.id,
      media_item_id: itemId,
      client_ip: clientIp,
    });

    // Redirect to signed URL
    return NextResponse.redirect(signedUrlData.signedUrl);
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

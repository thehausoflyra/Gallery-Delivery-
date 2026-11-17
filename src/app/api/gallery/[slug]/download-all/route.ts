import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

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

    // Check expiry
    if (gallery.expires_at && new Date(gallery.expires_at) < new Date()) {
      return NextResponse.json({ error: "Gallery has expired" }, { status: 410 });
    }

    // Fetch all media items
    const { data: mediaItems, error: mediaError } = await supabase
      .from("media_items")
      .select("*")
      .eq("gallery_id", gallery.id)
      .order("sort_order", { ascending: true });

    if (mediaError || !mediaItems || mediaItems.length === 0) {
      return NextResponse.json({ error: "No media found" }, { status: 404 });
    }

    // Create zip using archiver
    const archiver = (await import("archiver")).default;
    const { PassThrough } = await import("stream");

    const passThrough = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 6 } });

    archive.pipe(passThrough);

    // Add files to zip
    for (const item of mediaItems) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from("gallery-media")
        .download(item.storage_path);

      if (downloadError || !fileData) {
        console.error(`Error downloading ${item.file_name}:`, downloadError);
        continue;
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());
      archive.append(buffer, { name: item.file_name });
    }

    archive.finalize();

    // Log download
    const clientIp = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
    await supabase.from("download_logs").insert({
      gallery_id: gallery.id,
      media_item_id: null,
      client_ip: clientIp,
    });

    // Convert PassThrough to ReadableStream
    const readableStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk) => controller.enqueue(chunk));
        passThrough.on("end", () => controller.close());
        passThrough.on("error", (err) => controller.error(err));
      },
    });

    const galleryTitle = gallery.title.replace(/[^a-z0-9\s-]/gi, "").replace(/\s+/g, "-");

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${galleryTitle}.zip"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Download-all error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

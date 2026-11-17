import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const galleryId = formData.get("galleryId") as string | null;

    if (!file || !galleryId) {
      return NextResponse.json(
        { error: "Missing file or galleryId" },
        { status: 400 }
      );
    }

    const fileId = randomUUID();
    const storagePath = `${galleryId}/${fileId}-${file.name}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload original to gallery-media
    const { error: uploadError } = await supabase.storage
      .from("gallery-media")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Generate thumbnail for images
    let thumbnailPath: string | null = null;
    if (file.type.startsWith("image/")) {
      try {
        const sharp = (await import("sharp")).default;
        const thumbBuffer = await sharp(buffer)
          .resize(400, undefined, { withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer();

        thumbnailPath = `${galleryId}/${fileId}-thumb.webp`;

        const { error: thumbError } = await supabase.storage
          .from("thumbnails")
          .upload(thumbnailPath, thumbBuffer, {
            contentType: "image/webp",
            upsert: false,
          });

        if (thumbError) {
          console.error("Thumbnail upload error:", thumbError);
          thumbnailPath = null;
        }
      } catch (sharpError) {
        console.error("Sharp error:", sharpError);
        // Continue without thumbnail
      }
    }

    // Get current max sort_order
    const { data: maxOrder } = await supabase
      .from("media_items")
      .select("sort_order")
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = maxOrder ? maxOrder.sort_order + 1 : 0;

    // Insert media_item record
    const { data: mediaItem, error: insertError } = await supabase
      .from("media_items")
      .insert({
        gallery_id: galleryId,
        storage_path: storagePath,
        thumbnail_path: thumbnailPath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ mediaItem });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordGate } from "@/components/gallery/PasswordGate";
import { GalleryMediaGrid } from "@/components/gallery/MediaGrid";
import { isExpired } from "@/lib/utils";
import type { Gallery, MediaItem } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

type PageState = "loading" | "not_found" | "expired" | "password" | "gallery";

export default function GalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [state, setState] = useState<PageState>("loading");
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [authCookiePresent, setAuthCookiePresent] = useState(false);

  const checkAuth = (): boolean => {
    if (typeof document === "undefined") return false;
    const cookieName = `gallery_auth_${slug}`;
    return document.cookie.split(";").some((c) => c.trim().startsWith(`${cookieName}=`));
  };

  const fetchGallery = async () => {
    const supabase = createClient();

    const { data: galleryData, error } = await supabase
      .from("galleries")
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .single();

    if (error || !galleryData) {
      setState("not_found");
      return;
    }

    if (isExpired(galleryData.expires_at)) {
      setState("expired");
      return;
    }

    setGallery(galleryData);

    // Check password requirement
    if (galleryData.password_hash) {
      const hasAuth = checkAuth();
      if (!hasAuth) {
        setState("password");
        return;
      }
    }

    // Fetch media
    const { data: media } = await supabase
      .from("media_items")
      .select("*")
      .eq("gallery_id", galleryData.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setMediaItems(media ?? []);
    setState("gallery");
  };

  useEffect(() => {
    fetchGallery();
  }, [slug]);

  const handlePasswordSuccess = () => {
    // Re-fetch to enter gallery state
    fetchGallery();
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#888] text-sm">Loading gallery...</div>
      </div>
    );
  }

  if (state === "not_found") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Gallery not found</h1>
          <p className="text-[#888] text-sm">
            This gallery doesn&apos;t exist or is not yet available.
          </p>
        </div>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] mb-4">
            <Clock className="h-6 w-6 text-[#888]" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">
            This gallery has expired
          </h1>
          <p className="text-[#888] text-sm">
            The access period for this gallery has ended.
          </p>
        </div>
      </div>
    );
  }

  if (state === "password" && gallery) {
    return (
      <PasswordGate
        slug={slug}
        galleryTitle={gallery.title}
        onSuccess={handlePasswordSuccess}
      />
    );
  }

  if (!gallery) return null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">{gallery.title}</h1>
          {gallery.allow_downloads && mediaItems.length > 0 && (
            <a href={`/api/gallery/${slug}/download-all`} download>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Download All
              </Button>
            </a>
          )}
        </div>
      </header>

      {/* Gallery */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {mediaItems.length === 0 ? (
          <div className="text-center py-24 text-[#888]">
            <p>No photos available yet.</p>
          </div>
        ) : (
          <GalleryMediaGrid
            items={mediaItems}
            supabaseUrl={SUPABASE_URL}
            slug={slug}
            allowDownloads={gallery.allow_downloads}
          />
        )}
      </main>
    </div>
  );
}

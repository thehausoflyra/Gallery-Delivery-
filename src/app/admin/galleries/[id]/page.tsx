"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Check, ExternalLink, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadZone } from "@/components/admin/UploadZone";
import { MediaGrid } from "@/components/admin/MediaGrid";
import { formatDate, isExpired } from "@/lib/utils";
import type { Gallery, Client, MediaItem } from "@/types/database";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export default function GalleryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();

    const { data: galleryData, error: galleryError } = await supabase
      .from("galleries")
      .select("*")
      .eq("id", id)
      .single();

    if (galleryError || !galleryData) {
      router.push("/admin");
      return;
    }

    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", galleryData.client_id)
      .single();

    const { data: media } = await supabase
      .from("media_items")
      .select("*")
      .eq("gallery_id", id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    setGallery(galleryData);
    setClient(clientData);
    setMediaItems(media ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (itemId: string) => {
    const supabase = createClient();

    const item = mediaItems.find((m) => m.id === itemId);
    if (!item) return;

    // Delete from storage
    await supabase.storage.from("gallery-media").remove([item.storage_path]);
    if (item.thumbnail_path) {
      await supabase.storage.from("thumbnails").remove([item.thumbnail_path]);
    }

    // Delete record
    await supabase.from("media_items").delete().eq("id", itemId);

    setMediaItems((prev) => prev.filter((m) => m.id !== itemId));
  };

  const handlePublishToggle = async () => {
    if (!gallery) return;
    const supabase = createClient();
    const newValue = !gallery.is_published;
    await supabase
      .from("galleries")
      .update({ is_published: newValue })
      .eq("id", id);
    setGallery((prev) => prev ? { ...prev, is_published: newValue } : prev);
  };

  const handleDeleteAllMedia = async () => {
    if (mediaItems.length === 0) return;
    if (!confirm(`Delete all ${mediaItems.length} photo${mediaItems.length !== 1 ? "s" : ""} from this gallery? This cannot be undone.`)) return;

    const supabase = createClient();
    const mediaPaths = mediaItems.map((m) => m.storage_path);
    const thumbPaths = mediaItems.filter((m) => m.thumbnail_path).map((m) => m.thumbnail_path!);

    await supabase.storage.from("gallery-media").remove(mediaPaths);
    if (thumbPaths.length > 0) {
      await supabase.storage.from("thumbnails").remove(thumbPaths);
    }
    await supabase.from("media_items").delete().eq("gallery_id", id);

    setMediaItems([]);
  };

  const handleDeleteGallery = async () => {
    if (!gallery) return;
    if (!confirm(`Delete gallery "${gallery.title}"? This will delete all media and cannot be undone.`)) return;

    const supabase = createClient();

    // Delete all storage files
    if (mediaItems.length > 0) {
      const mediaPaths = mediaItems.map((m) => m.storage_path);
      const thumbPaths = mediaItems.filter((m) => m.thumbnail_path).map((m) => m.thumbnail_path!);
      await supabase.storage.from("gallery-media").remove(mediaPaths);
      if (thumbPaths.length > 0) {
        await supabase.storage.from("thumbnails").remove(thumbPaths);
      }
    }

    await supabase.from("galleries").delete().eq("id", id);
    router.push("/admin");
  };

  const handleCopyLink = async () => {
    if (!gallery) return;
    await navigator.clipboard.writeText(`${window.location.origin}/g/${gallery.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (!gallery) return null;

  const expired = isExpired(gallery.expires_at);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-semibold text-foreground">{gallery.title}</h1>
                {expired ? (
                  <Badge variant="destructive">Expired</Badge>
                ) : gallery.is_published ? (
                  <Badge variant="success">Published</Badge>
                ) : (
                  <Badge variant="outline">Draft</Badge>
                )}
              </div>
              {client && (
                <p className="text-xs text-[#888]">
                  {client.name} · {client.email}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/g/${gallery.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Preview
              </Button>
            </a>
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant={gallery.is_published ? "secondary" : "default"}
              size="sm"
              onClick={handlePublishToggle}
              disabled={expired}
            >
              {gallery.is_published ? "Unpublish" : "Publish"}
            </Button>
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteGallery}
              title="Delete gallery"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Gallery info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div className="bg-[#111111] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-[#888] mb-1">Media items</div>
            <div className="text-xl font-semibold">{mediaItems.length}</div>
          </div>
          <div className="bg-[#111111] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-[#888] mb-1">Created</div>
            <div className="font-medium">{formatDate(gallery.created_at)}</div>
          </div>
          <div className="bg-[#111111] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-[#888] mb-1">Downloads</div>
            <div className="font-medium">{gallery.allow_downloads ? "Allowed" : "Disabled"}</div>
          </div>
          <div className="bg-[#111111] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-[#888] mb-1">Expires</div>
            <div className={`font-medium ${expired ? "text-red-400" : ""}`}>
              {gallery.expires_at ? formatDate(gallery.expires_at) : "Never"}
            </div>
          </div>
        </div>

        {/* Upload zone */}
        <div>
          <h2 className="text-sm font-medium text-[#888] uppercase tracking-wider mb-4">
            Upload Media
          </h2>
          <UploadZone galleryId={id} onUploadComplete={fetchData} />
        </div>

        {/* Media grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[#888] uppercase tracking-wider">
              Media ({mediaItems.length})
            </h2>
            {mediaItems.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleDeleteAllMedia}>
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Delete all photos
              </Button>
            )}
          </div>
          <MediaGrid
            items={mediaItems}
            supabaseUrl={SUPABASE_URL}
            onDelete={handleDelete}
          />
        </div>
      </main>
    </div>
  );
}

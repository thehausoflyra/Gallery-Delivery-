"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, LogOut, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { GalleryCard } from "@/components/admin/GalleryCard";
import type { GalleryWithClient } from "@/types/database";

export default function AdminDashboard() {
  const router = useRouter();
  const [galleries, setGalleries] = useState<GalleryWithClient[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGalleries = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("galleries")
      .select(`*, clients (*)`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching galleries:", error);
      return;
    }

    // Get media counts
    const galleriesWithCount = await Promise.all(
      (data || []).map(async (gallery) => {
        const { count } = await supabase
          .from("media_items")
          .select("*", { count: "exact", head: true })
          .eq("gallery_id", gallery.id);
        return { ...gallery, media_count: count ?? 0 } as GalleryWithClient;
      })
    );

    setGalleries(galleriesWithCount);
    setLoading(false);
  };

  useEffect(() => {
    fetchGalleries();
  }, []);

  const handlePublishToggle = async (id: string, published: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("galleries")
      .update({ is_published: published })
      .eq("id", id);

    if (!error) {
      setGalleries((prev) =>
        prev.map((g) => (g.id === id ? { ...g, is_published: published } : g))
      );
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Lyra Galleries</h1>
            <p className="text-xs text-[#888]">Admin Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/galleries/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Gallery
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-36 rounded-lg bg-[#111111] border border-[#1a1a1a] animate-pulse"
              />
            ))}
          </div>
        ) : galleries.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] mb-4">
              <Images className="h-7 w-7 text-[#888]" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">No galleries yet</h2>
            <p className="text-sm text-[#888] mb-6">
              Create your first gallery to get started
            </p>
            <Link href="/admin/galleries/new">
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                Create Gallery
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm text-[#888]">
                {galleries.length} {galleries.length === 1 ? "gallery" : "galleries"}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {galleries.map((gallery) => (
                <GalleryCard
                  key={gallery.id}
                  gallery={gallery}
                  onPublishToggle={handlePublishToggle}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

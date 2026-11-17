"use client";

import { useState } from "react";
import Image from "next/image";
import { Download, Play } from "lucide-react";
import { Lightbox } from "./Lightbox";
import { isImageFile, isVideoFile } from "@/lib/utils";
import type { MediaItem } from "@/types/database";

interface GalleryMediaGridProps {
  items: MediaItem[];
  supabaseUrl: string;
  slug: string;
  allowDownloads: boolean;
}

export function GalleryMediaGrid({
  items,
  supabaseUrl,
  slug,
  allowDownloads,
}: GalleryMediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const getThumbUrl = (item: MediaItem) => {
    if (item.thumbnail_path) {
      return `${supabaseUrl}/storage/v1/object/public/thumbnails/${item.thumbnail_path}`;
    }
    return `${supabaseUrl}/storage/v1/object/public/gallery-media/${item.storage_path}`;
  };

  return (
    <>
      <div className="masonry-grid">
        {items.map((item, index) => (
          <div key={item.id} className="masonry-item group relative">
            <div
              className="relative overflow-hidden rounded-lg bg-[#111111] cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            >
              {isImageFile(item.file_type) ? (
                <Image
                  src={getThumbUrl(item)}
                  alt={item.file_name}
                  width={400}
                  height={300}
                  className="w-full h-auto object-cover transition-transform group-hover:scale-[1.02]"
                  loading="lazy"
                />
              ) : isVideoFile(item.file_type) ? (
                <div className="aspect-video flex items-center justify-center bg-[#111111]">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white ml-0.5" />
                    </div>
                    <span className="text-xs text-[#888]">{item.file_name}</span>
                  </div>
                </div>
              ) : null}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />

              {/* Individual download */}
              {allowDownloads && (
                <a
                  href={`/api/gallery/${slug}/download/${item.id}`}
                  download={item.file_name}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 hover:bg-black/90 rounded p-1.5"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 text-white" />
                </a>
              )}

              {isVideoFile(item.file_type) && (
                <div className="absolute top-2 left-2 bg-black/70 rounded px-1.5 py-0.5">
                  <span className="text-xs text-white">Video</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          items={items}
          currentIndex={lightboxIndex}
          supabaseUrl={supabaseUrl}
          slug={slug}
          allowDownloads={allowDownloads}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}

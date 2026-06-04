"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2, Video, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, isImageFile, isVideoFile } from "@/lib/utils";
import type { MediaItem } from "@/types/database";

interface MediaGridProps {
  items: MediaItem[];
  supabaseUrl: string;
  onDelete: (itemId: string) => Promise<void>;
}

export function MediaGrid({ items, supabaseUrl, onDelete }: MediaGridProps) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (itemId: string) => {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setDeletingIds((prev) => new Set(prev).add(itemId));
    try {
      await onDelete(itemId);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const getImageUrl = (item: MediaItem) => {
    if (item.thumbnail_path) {
      return `${supabaseUrl}/storage/v1/object/public/thumbnails/${item.thumbnail_path}`;
    }
    return `${supabaseUrl}/storage/v1/object/public/gallery-media/${item.storage_path}`;
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-[#888]">
        <p>No media uploaded yet.</p>
        <p className="text-sm mt-1">Use the upload zone above to add photos and videos.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="group relative rounded-lg overflow-hidden bg-[#111111] border border-[#2a2a2a] aspect-square"
        >
          {isImageFile(item.file_type) ? (
            <Image
              src={getImageUrl(item)}
              alt={item.file_name}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : isVideoFile(item.file_type) ? (
            <div className="flex items-center justify-center h-full">
              <Video className="h-10 w-10 text-[#888]" />
              <span className="sr-only">{item.file_name}</span>
            </div>
          ) : null}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
            <p className="text-xs text-white/80 text-center px-2 truncate max-w-full">
              {item.file_name}
            </p>
            <p className="text-xs text-white/60">{formatBytes(item.file_size)}</p>
            <div className="flex gap-1 mt-1">
              <Button
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDelete(item.id)}
                disabled={deletingIds.has(item.id)}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {isVideoFile(item.file_type) && (
            <div className="absolute top-2 left-2 bg-black/70 rounded px-1.5 py-0.5">
              <span className="text-xs text-white">Video</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

"use client";

import { useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isImageFile, isVideoFile } from "@/lib/utils";
import type { MediaItem } from "@/types/database";

interface LightboxProps {
  items: MediaItem[];
  currentIndex: number;
  supabaseUrl: string;
  slug: string;
  allowDownloads: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function Lightbox({
  items,
  currentIndex,
  supabaseUrl,
  slug,
  allowDownloads,
  onClose,
  onNavigate,
}: LightboxProps) {
  const current = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) onNavigate(currentIndex - 1);
  }, [currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (currentIndex < items.length - 1) onNavigate(currentIndex + 1);
  }, [currentIndex, items.length, onNavigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, handlePrev, handleNext]);

  if (!current) return null;

  const mediaUrl = `${supabaseUrl}/storage/v1/object/public/gallery-media/${current.storage_path}`;

  return (
    <div className="lightbox-overlay fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 text-white hover:bg-white/10"
      >
        <X className="h-5 w-5" />
      </Button>

      {/* Download button */}
      {allowDownloads && (
        <a
          href={`/api/gallery/${slug}/download/${current.id}`}
          download={current.file_name}
          className="absolute top-4 right-16 z-10"
        >
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Download className="h-5 w-5" />
          </Button>
        </a>
      )}

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 text-sm text-white/60">
        {currentIndex + 1} / {items.length}
      </div>

      {/* Navigation */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
      )}
      {currentIndex < items.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/10 h-12 w-12"
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      )}

      {/* Media */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {isImageFile(current.file_type) ? (
          <div className="relative" style={{ maxWidth: "90vw", maxHeight: "90vh" }}>
            <Image
              src={mediaUrl}
              alt={current.file_name}
              width={1200}
              height={900}
              className="object-contain max-h-[90vh] max-w-[90vw] w-auto h-auto"
              priority
            />
          </div>
        ) : isVideoFile(current.file_type) ? (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-h-[90vh] max-w-[90vw] rounded"
          />
        ) : null}
      </div>

      {/* Background click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}

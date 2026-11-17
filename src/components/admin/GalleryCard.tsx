"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, ExternalLink, Images } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, isExpired } from "@/lib/utils";
import type { GalleryWithClient } from "@/types/database";

interface GalleryCardProps {
  gallery: GalleryWithClient;
  onPublishToggle: (id: string, published: boolean) => Promise<void>;
}

export function GalleryCard({ gallery, onPublishToggle }: GalleryCardProps) {
  const [copied, setCopied] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const galleryUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/g/${gallery.slug}`;
  const expired = isExpired(gallery.expires_at);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(galleryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handlePublishToggle = async () => {
    setIsToggling(true);
    try {
      await onPublishToggle(gallery.id, !gallery.is_published);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <Card className="hover:border-[#3a3a3a] transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Link
                href={`/admin/galleries/${gallery.id}`}
                className="font-semibold text-foreground hover:text-white truncate text-base"
              >
                {gallery.title}
              </Link>
              {expired ? (
                <Badge variant="destructive">Expired</Badge>
              ) : gallery.is_published ? (
                <Badge variant="success">Published</Badge>
              ) : (
                <Badge variant="outline">Draft</Badge>
              )}
              {gallery.password_hash && (
                <Badge variant="secondary">Password</Badge>
              )}
            </div>
            <p className="text-sm text-[#888] truncate">{gallery.clients.email}</p>
            <p className="text-sm text-[#888] mt-0.5">{gallery.clients.name}</p>
          </div>
          <Link href={`/admin/galleries/${gallery.id}`}>
            <Button variant="ghost" size="icon" title="View gallery details">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#1a1a1a]">
          <div className="flex items-center gap-4 text-xs text-[#888]">
            <span className="flex items-center gap-1">
              <Images className="h-3.5 w-3.5" />
              {gallery.media_count ?? 0} items
            </span>
            <span>{formatDate(gallery.created_at)}</span>
            {gallery.expires_at && (
              <span className={expired ? "text-red-400" : ""}>
                Expires {formatDate(gallery.expires_at)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button
              variant={gallery.is_published ? "secondary" : "default"}
              size="sm"
              onClick={handlePublishToggle}
              disabled={isToggling || expired}
            >
              {isToggling ? "..." : gallery.is_published ? "Unpublish" : "Publish"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

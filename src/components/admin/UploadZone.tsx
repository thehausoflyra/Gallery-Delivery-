"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface UploadFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface UploadZoneProps {
  galleryId: string;
  onUploadComplete: () => void;
}

export function UploadZone({ galleryId, onUploadComplete }: UploadZoneProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      id: Math.random().toString(36).substring(2),
      file,
      progress: 0,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"],
      "video/*": [".mp4", ".mov", ".avi", ".webm"],
    },
    multiple: true,
  });

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setIsUploading(true);

    for (const uploadFile of pending) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === uploadFile.id ? { ...f, status: "uploading", progress: 10 } : f
        )
      );

      try {
        const formData = new FormData();
        formData.append("file", uploadFile.file);
        formData.append("galleryId", galleryId);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id && f.progress < 85
                ? { ...f, progress: f.progress + 15 }
                : f
            )
          );
        }, 300);

        const response = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Upload failed");
        }

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id ? { ...f, status: "success", progress: 100 } : f
          )
        );
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadFile.id
              ? {
                  ...f,
                  status: "error",
                  progress: 0,
                  error: error instanceof Error ? error.message : "Upload failed",
                }
              : f
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const clearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "success"));
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-white bg-white/5"
            : "border-[#2a2a2a] hover:border-[#444] hover:bg-[#111111]"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-3 text-[#888]" />
        <p className="text-foreground font-medium">
          {isDragActive ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-sm text-[#888] mt-1">
          or click to browse — images & videos supported
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((uploadFile) => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#111111] border border-[#2a2a2a]"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground truncate max-w-xs">
                    {uploadFile.file.name}
                  </span>
                  <span className="text-xs text-[#888] ml-2 shrink-0">
                    {formatBytes(uploadFile.file.size)}
                  </span>
                </div>
                {uploadFile.status === "uploading" && (
                  <Progress value={uploadFile.progress} />
                )}
                {uploadFile.status === "error" && (
                  <p className="text-xs text-red-400">{uploadFile.error}</p>
                )}
              </div>
              <div className="shrink-0">
                {uploadFile.status === "success" && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {uploadFile.status === "error" && (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                )}
                {(uploadFile.status === "pending" || uploadFile.status === "error") && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="text-[#888] hover:text-white transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-[#888]">
              {pendingCount > 0 && `${pendingCount} pending`}
              {successCount > 0 && ` • ${successCount} uploaded`}
            </div>
            <div className="flex gap-2">
              {successCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCompleted}>
                  Clear completed
                </Button>
              )}
              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={uploadAll}
                  disabled={isUploading}
                >
                  {isUploading ? "Uploading..." : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

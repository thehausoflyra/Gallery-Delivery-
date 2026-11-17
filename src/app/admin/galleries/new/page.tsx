"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import bcrypt from "bcryptjs";

export default function NewGalleryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    clientName: "",
    clientEmail: "",
    password: "",
    expiresAt: "",
    allowDownloads: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();

    try {
      // Upsert client
      const { data: client, error: clientError } = await supabase
        .from("clients")
        .upsert(
          { name: form.clientName, email: form.clientEmail },
          { onConflict: "email", ignoreDuplicates: false }
        )
        .select()
        .single();

      if (clientError) throw new Error(clientError.message);

      // Hash password if provided
      let passwordHash: string | null = null;
      if (form.password) {
        passwordHash = await bcrypt.hash(form.password, 10);
      }

      const slug = generateSlug(form.title);

      const { data: gallery, error: galleryError } = await supabase
        .from("galleries")
        .insert({
          client_id: client.id,
          title: form.title,
          slug,
          password_hash: passwordHash,
          expires_at: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
          allow_downloads: form.allowDownloads,
          is_published: false,
        })
        .select()
        .single();

      if (galleryError) throw new Error(galleryError.message);

      router.push(`/admin/galleries/${gallery.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create gallery");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">New Gallery</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Gallery Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Sarah & James Wedding"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                  placeholder="Sarah Johnson"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientEmail">Client Email *</Label>
                <Input
                  id="clientEmail"
                  name="clientEmail"
                  type="email"
                  value={form.clientEmail}
                  onChange={handleChange}
                  placeholder="sarah@example.com"
                  required
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Access & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password (optional)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Leave blank for no password"
                />
                <p className="text-xs text-[#888]">
                  If set, clients must enter this password to view the gallery.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expiry Date (optional)</Label>
                <Input
                  id="expiresAt"
                  name="expiresAt"
                  type="date"
                  value={form.expiresAt}
                  onChange={handleChange}
                />
                <p className="text-xs text-[#888]">
                  Gallery will be inaccessible after this date.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id="allowDownloads"
                  name="allowDownloads"
                  type="checkbox"
                  checked={form.allowDownloads}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-[#2a2a2a] bg-[#111111] accent-white"
                />
                <Label htmlFor="allowDownloads">Allow downloads</Label>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-md bg-red-900/20 border border-red-800 p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Link href="/admin">
              <Button variant="outline" type="button">Cancel</Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Gallery"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

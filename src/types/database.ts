export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string;
          name: string;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          created_at?: string;
        };
      };
      galleries: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          slug: string;
          password_hash: string | null;
          expires_at: string | null;
          allow_downloads: boolean;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          slug: string;
          password_hash?: string | null;
          expires_at?: string | null;
          allow_downloads?: boolean;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          title?: string;
          slug?: string;
          password_hash?: string | null;
          expires_at?: string | null;
          allow_downloads?: boolean;
          is_published?: boolean;
          created_at?: string;
        };
      };
      media_items: {
        Row: {
          id: string;
          gallery_id: string;
          storage_path: string;
          thumbnail_path: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          gallery_id: string;
          storage_path: string;
          thumbnail_path?: string | null;
          file_name: string;
          file_type: string;
          file_size: number;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          gallery_id?: string;
          storage_path?: string;
          thumbnail_path?: string | null;
          file_name?: string;
          file_type?: string;
          file_size?: number;
          sort_order?: number;
          created_at?: string;
        };
      };
      download_logs: {
        Row: {
          id: string;
          gallery_id: string;
          media_item_id: string | null;
          client_ip: string | null;
          downloaded_at: string;
        };
        Insert: {
          id?: string;
          gallery_id: string;
          media_item_id?: string | null;
          client_ip?: string | null;
          downloaded_at?: string;
        };
        Update: {
          id?: string;
          gallery_id?: string;
          media_item_id?: string | null;
          client_ip?: string | null;
          downloaded_at?: string;
        };
      };
    };
    Functions: {
      get_gallery_if_password_matches: {
        Args: {
          p_gallery_id: string;
          p_input_password: string;
        };
        Returns: Json;
      };
    };
  };
}

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type Gallery = Database["public"]["Tables"]["galleries"]["Row"];
export type MediaItem = Database["public"]["Tables"]["media_items"]["Row"];
export type DownloadLog = Database["public"]["Tables"]["download_logs"]["Row"];

export type GalleryWithClient = Gallery & {
  clients: Client;
  media_count?: number;
};

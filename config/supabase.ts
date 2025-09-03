import { createClient } from "@supabase/supabase-js";

// Initialize the Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Tables = {
  documents: {
    Row: {
      id: string;
      title: string;
      content: string;
      created_at: string;
      updated_at: string;
      metadata: Record<string, any>;
    };
    Insert: {
      id?: string;
      title: string;
      content: string;
      created_at?: string;
      updated_at?: string;
      metadata?: Record<string, any>;
    };
    Update: {
      title?: string;
      content?: string;
      updated_at?: string;
      metadata?: Record<string, any>;
    };
  };
  // Add more table types as needed
};

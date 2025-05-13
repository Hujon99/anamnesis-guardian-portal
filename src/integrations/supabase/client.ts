
/**
 * This file provides the Supabase client for the application.
 * It exports the client for use throughout the application and defines the base URL and keys.
 * This centralized client ensures consistent access to the Supabase backend.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase configuration - Environmental variables are preferred, but using values directly when not available
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://jawtwwwelxaaprzsqfyp.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imphd3R3d3dlbHhhYXByenNxZnlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MDMzMTYsImV4cCI6MjA1ODA3OTMxNn0.FAAh0QpAM18T2pDrohTUBUMcNez8dnmIu3bpRoa8Yhk";

// Export the supabase client for use throughout the application
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

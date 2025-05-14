
/// <reference types="vite/client" />

interface TestNote {
  id: string;
  content: string | null;
  title: string | null;
  user_id: string;
  organization_id: string;
  created_at: string;
  store_id?: string | null;
}

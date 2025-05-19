
/**
 * This store manages the state of user synchronization across the application.
 * It tracks which organizations have been synced, their sync status, and when
 * the last synchronization occurred. This helps prevent redundant sync operations
 * and provides status information for the UI.
 */

import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

interface UserSyncState {
  // Track sync status for each organization
  syncStatus: Record<string, SyncStatus>;
  lastSynced: Record<string, Date | null>;
  
  // Actions
  setSyncStatus: (orgId: string, status: SyncStatus) => void;
  getSyncStatus: (orgId: string) => SyncStatus;
  setLastSynced: (orgId: string, date: Date) => void;
  getLastSynced: (orgId: string) => Date | null;
  
  // Reset state (for testing or logout)
  resetState: () => void;
}

export const useUserSyncStore = create<UserSyncState>((set, get) => ({
  syncStatus: {},
  lastSynced: {},
  
  setSyncStatus: (orgId, status) => 
    set((state) => ({
      syncStatus: { ...state.syncStatus, [orgId]: status }
    })),
    
  getSyncStatus: (orgId) => 
    get().syncStatus[orgId] || 'idle',
    
  setLastSynced: (orgId, date) => 
    set((state) => ({
      lastSynced: { ...state.lastSynced, [orgId]: date }
    })),
    
  getLastSynced: (orgId) => 
    get().lastSynced[orgId] || null,
    
  resetState: () => 
    set({ syncStatus: {}, lastSynced: {} }),
}));

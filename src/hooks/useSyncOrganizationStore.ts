
import { create } from 'zustand';

interface SyncOrgState {
  syncedOrgs: Record<string, boolean>;
  syncingOrgs: Record<string, boolean>;
  setSynced: (orgId: string, synced: boolean) => void;
  setSyncing: (orgId: string, syncing: boolean) => void;
}

export const useSyncOrganizationStore = create<SyncOrgState>((set) => ({
  syncedOrgs: {},
  syncingOrgs: {},
  setSynced: (orgId, synced) => 
    set((state) => ({
      syncedOrgs: { ...state.syncedOrgs, [orgId]: synced }
    })),
  setSyncing: (orgId, syncing) => 
    set((state) => ({
      syncingOrgs: { ...state.syncingOrgs, [orgId]: syncing }
    })),
}));

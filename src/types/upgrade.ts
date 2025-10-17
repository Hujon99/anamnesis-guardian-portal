/**
 * Type definitions for the upgrade conversion tracking system.
 * 
 * This system tracks when patients accept or decline upgrade offers in questionnaires
 * (e.g., upgrading from basic eye exam to comprehensive eye health examination).
 * All data is anonymized and used for business analytics only.
 */

export interface UpgradeConversion {
  id: string;
  organization_id: string;
  entry_id: string;
  upgrade_question_id: string;
  upgrade_accepted: boolean;
  examination_type?: string;
  form_id?: string;
  store_id?: string;
  created_at: string;
}

export interface UpgradeStats {
  total_offered: number;
  total_accepted: number;
  conversion_rate: number;
  by_store?: Record<string, {
    offered: number;
    accepted: number;
    rate: number;
  }>;
  by_time_period?: Array<{
    period: string;
    offered: number;
    accepted: number;
  }>;
}

export interface UpgradeStatsTimeRange {
  timeRange?: 'week' | 'month' | 'year' | 'all';
  storeId?: string;
}
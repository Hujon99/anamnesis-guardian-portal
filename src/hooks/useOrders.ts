
/**
 * Custom hook for fetching and managing order data.
 * It provides functionality to load orders, mark orders as delivered,
 * and handles loading and error states.
 */

import { useState, useEffect } from 'react';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { useOrganization } from '@clerk/clerk-react';

// Define Order type
export interface Order {
  id: string;
  ref: string;
  patient_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
  eta: string | null;
}

export const useOrders = () => {
  const { supabase, isReady } = useSupabaseClient();
  const { organization } = useOrganization();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sample data for development
  // In a real app, this would come from the database
  const sampleOrders: Order[] = [
    {
      id: '1',
      ref: 'BIN-2023',
      patient_name: 'Erik Svensson',
      status: 'delivered',
      created_at: '2025-05-01T08:00:00Z',
      eta: '2025-05-15T15:00:00Z',
    },
    {
      id: '2',
      ref: 'BIN-2024',
      patient_name: 'Anna Lindberg',
      status: 'processing',
      created_at: '2025-05-10T09:30:00Z',
      eta: '2025-05-25T16:00:00Z',
    },
    {
      id: '3',
      ref: 'BIN-2025',
      patient_name: 'Johan Bergström',
      status: 'shipped',
      created_at: '2025-05-12T11:45:00Z',
      eta: '2025-05-22T10:30:00Z',
    },
    {
      id: '4',
      ref: 'BIN-2026',
      patient_name: 'Maria Andersson',
      status: 'pending',
      created_at: '2025-05-18T14:15:00Z',
      eta: null,
    },
    {
      id: '5',
      ref: 'BIN-2027',
      patient_name: 'Karl Nilsson',
      status: 'processing',
      created_at: '2025-05-19T10:00:00Z',
      eta: '2025-06-02T09:00:00Z',
    },
  ];

  // Function to load orders
  const loadOrders = async () => {
    // In a real implementation, this would fetch data from Supabase
    // For now, we're using sample data
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));
      setOrders(sampleOrders);
    } catch (err) {
      console.error('Error loading orders:', err);
      setError('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to mark an order as delivered
  const markAsDelivered = async (ref: string) => {
    try {
      // In a real implementation, this would call a Supabase RPC function
      // For now, we're updating the local state
      const updatedOrders = orders.map(order => 
        order.ref === ref ? { ...order, status: 'delivered' as const } : order
      );
      setOrders(updatedOrders);
      return true;
    } catch (err) {
      console.error('Error marking order as delivered:', err);
      return false;
    }
  };

  // Load orders when component mounts or organization changes
  useEffect(() => {
    if (isReady && organization) {
      loadOrders();
    }
  }, [isReady, organization?.id]);

  return {
    orders,
    isLoading,
    error,
    loadOrders,
    markAsDelivered,
  };
};

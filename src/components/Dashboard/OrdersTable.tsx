
/**
 * Orders table component that displays a list of orders in a responsive table.
 * It shows key information about each order including reference, patient name,
 * status, creation date, and estimated time of arrival.
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

// Types for order data
interface Order {
  id: string;
  ref: string;
  patient_name: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
  eta: string | null;
}

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
}

// Helper function to determine badge variant based on status
const getStatusBadge = (status: Order['status']) => {
  switch (status) {
    case 'pending':
      return { variant: 'outline' as const, label: 'Ny' };
    case 'processing':
      return { variant: 'warning' as const, label: 'Bearbetas' };
    case 'shipped':
      return { variant: 'default' as const, label: 'Skickad' };
    case 'delivered':
      return { variant: 'success' as const, label: 'Levererad' };
    default:
      return { variant: 'outline' as const, label: status };
  }
};

// Helper to format dates
const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'd MMM yyyy', { locale: sv });
  } catch (e) {
    return 'Ogiltigt datum';
  }
};

export const OrdersTable = ({ orders, isLoading }: OrdersTableProps) => {
  // Sample orders for loading state
  const loadingRows = Array(5).fill(0);
  
  return (
    <div className="rounded-2xl border overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Ref</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Skapad</TableHead>
              <TableHead>ETA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              loadingRows.map((_, index) => (
                <TableRow key={`loading-${index}`}>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : orders.length > 0 ? (
              orders.map((order) => {
                const badge = getStatusBadge(order.status);
                return (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.ref}</TableCell>
                    <TableCell>{order.patient_name}</TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>{order.eta ? formatDate(order.eta) : '—'}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Inga ordrar hittades
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

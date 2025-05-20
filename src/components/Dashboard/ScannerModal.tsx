
/**
 * Scanner modal component that provides a barcode/QR code scanner using the zxing library.
 * It allows users to scan incoming orders and mark them as delivered.
 */

import React, { useEffect, useState } from 'react';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeliveryMarked: () => void;
}

export const ScannerModal = ({ isOpen, onClose, onDeliveryMarked }: ScannerModalProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const codeReaderRef = React.useRef<BrowserMultiFormatReader | null>(null);

  // Initialize and start scanner when modal is opened
  useEffect(() => {
    if (isOpen) {
      startScanner();
      return () => {
        stopScanner();
      };
    }
  }, [isOpen]);

  const startScanner = async () => {
    setScanning(true);
    setError(null);
    
    try {
      if (!codeReaderRef.current) {
        // Configure the reader
        const hints = new Map();
        // Add the formats you want to scan
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.QR_CODE,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.EAN_13,
        ]);
        
        codeReaderRef.current = new BrowserMultiFormatReader(hints);
      }
      
      if (videoRef.current) {
        // Get available video devices
        const videoInputDevices = await codeReaderRef.current.getVideoInputDevices();
        
        if (videoInputDevices.length === 0) {
          throw new Error("Ingen kamera hittades");
        }
        
        // Use the first device (usually the back camera on mobile)
        const deviceId = videoInputDevices[0].deviceId;
        
        // Start decoding from the video stream
        codeReaderRef.current.decodeFromVideoDevice(
          deviceId, 
          videoRef.current, 
          (result) => {
            if (result) {
              const scannedValue = result.getText();
              console.log("Scanned value:", scannedValue);
              handleSuccessfulScan(scannedValue);
            }
          }
        );
      }
    } catch (err) {
      console.error("Error starting scanner:", err);
      setError(err instanceof Error ? err.message : "Ett fel uppstod när skannern skulle startas");
      setScanning(false);
    }
  };

  const stopScanner = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setScanning(false);
  };

  const handleSuccessfulScan = async (ref: string) => {
    setProcessing(true);
    stopScanner();
    
    try {
      // Call Supabase RPC to mark order as delivered
      const { data, error } = await supabase.rpc('mark_delivered', { p_ref: ref });
      
      if (error) {
        throw error;
      }
      
      if (data) {
        toast.success("Binokel Optik – order klar!", {
          description: `Order ${ref} är nu markerad som levererad.`,
          duration: 5000,
        });
        
        // Close modal and refresh data
        onDeliveryMarked();
        onClose();
      } else {
        throw new Error("Kunde inte hitta ordern med referens: " + ref);
      }
    } catch (err) {
      console.error("Error marking as delivered:", err);
      toast.error("Fel vid markering som levererad", {
        description: err instanceof Error ? err.message : "Ett oväntat fel uppstod",
      });
      setProcessing(false);
      startScanner(); // Restart scanner if we had an error
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Skanna streckkod</DialogTitle>
          <DialogDescription>
            Håll streckkoden i kamerans sikte för att markera order som levererad.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative">
          <div className="w-full aspect-[4/3] bg-gray-900 rounded-md overflow-hidden relative">
            {scanning && !error && (
              <ScanLine className="absolute top-1/2 left-0 w-full h-0.5 text-accent_teal animate-pulse" />
            )}
            
            {error ? (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 p-4 text-center">
                <p className="text-destructive">{error}</p>
                <Button onClick={startScanner}>Försök igen</Button>
              </div>
            ) : processing ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-accent_teal" />
              </div>
            ) : (
              <video ref={videoRef} className="w-full h-full object-cover" />
            )}
          </div>
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={processing}>
            <X className="mr-2 h-4 w-4" />
            Stäng
          </Button>
          <Button 
            variant="default" 
            onClick={() => startScanner()} 
            disabled={processing || (scanning && !error)}
          >
            <ScanLine className="mr-2 h-4 w-4" />
            {scanning && !error ? 'Skannar...' : 'Skanna igen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

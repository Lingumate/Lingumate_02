import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Camera, CameraOff, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRCodeScannerProps {
  onScanSuccess: (data: string) => void;
  onScanError?: (error: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function QRCodeScanner({ 
  onScanSuccess, 
  onScanError, 
  onClose, 
  isOpen 
}: QRCodeScannerProps) {
  const { toast } = useToast();
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    try {
      // Check for camera permission first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setHasPermission(true);
      
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      scanner.render(
        (decodedText) => {
          console.log('QR Code scanned:', decodedText);
          setIsScanning(false);
          onScanSuccess(decodedText);
          stopScanner();
          toast({
            title: "QR Code Scanned",
            description: "Successfully scanned QR code for handshake",
          });
        },
        (errorMessage) => {
          // Ignore errors during scanning, only log them
          console.log('Scanning error:', errorMessage);
        }
      );

      scannerRef.current = scanner;
      setIsScanning(true);
      setError('');

    } catch (err: any) {
      console.error('Scanner initialization error:', err);
      setHasPermission(false);
      setError(err.message || 'Failed to access camera');
      onScanError?.(err.message || 'Failed to access camera');
      toast({
        title: "Camera Access Error",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  const handleRetry = () => {
    setError('');
    setHasPermission(null);
    startScanner();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border border-white/20 shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Camera className="w-5 h-5 text-blue-500" />
            Scan QR Code
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {hasPermission === false ? (
            <div className="text-center py-8">
              <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Camera Access Required</h3>
              <p className="text-gray-600 mb-4">
                {error || "Please allow camera access to scan QR codes for handshake connection."}
              </p>
              <Button onClick={handleRetry} className="bg-blue-500 hover:bg-blue-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Point your camera at the QR code to establish a secure handshake connection
                </p>
              </div>
              
              <div className="relative">
                <div id="qr-reader" className="w-full"></div>
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg">
                    <div className="flex items-center gap-2 text-white">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Scanning...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-xs text-gray-500">
                  The QR code contains encrypted session data for secure peer-to-peer translation
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

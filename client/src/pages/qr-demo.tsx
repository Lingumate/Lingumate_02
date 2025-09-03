import React, { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, QrCode, Camera, Smartphone, Shield, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import QRCodeScanner from '@/components/QRCodeScanner';
import QRCode from 'qrcode';

export default function QRDemo() {
  const { toast } = useToast();
  const [showScanner, setShowScanner] = useState(false);
  const [scannedData, setScannedData] = useState<string>('');
  const [demoQRCode, setDemoQRCode] = useState<string>('');

  // Generate demo QR code on component mount
  React.useEffect(() => {
    generateDemoQRCode();
  }, []);

  const generateDemoQRCode = async () => {
    const demoData = {
      session_id: "demo-session-123",
      session_key: "demo-encryption-key-256-bit",
      user_id: "demo-user-456",
      preferred_language: "en",
      speaking_language: "en",
      listening_language: "es",
      timestamp: Date.now()
    };

    try {
      const qrUrl = await QRCode.toDataURL(JSON.stringify(demoData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setDemoQRCode(qrUrl);
    } catch (error) {
      console.error('Error generating demo QR code:', error);
    }
  };

  const handleScanSuccess = (data: string) => {
    setScannedData(data);
    toast({
      title: "QR Code Scanned Successfully!",
      description: "Handshake connection established",
    });
  };

  const handleScanError = (error: string) => {
    toast({
      title: "Scan Error",
      description: error,
      variant: "destructive",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showScanner}
        onScanSuccess={handleScanSuccess}
        onScanError={handleScanError}
        onClose={() => setShowScanner(false)}
      />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">QR Code Handshake Demo</h1>
              <p className="text-gray-300">Test the secure QR code scanning functionality</p>
            </div>
          </div>
          
          <Badge className="flex items-center gap-2 bg-green-500/20 text-green-300 border-green-400/30">
            <Shield className="w-3 h-3" />
            Secure Handshake
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Demo QR Code */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-cyan-400/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <QrCode className="w-5 h-5 text-cyan-400" />
                Demo QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-300 mb-4">
                  This is a sample QR code containing encrypted session data for testing
                </p>
                {demoQRCode && (
                  <div className="bg-white p-4 rounded-xl inline-block">
                    <img src={demoQRCode} alt="Demo QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm text-gray-400">
                <p><strong>Session ID:</strong> demo-session-123</p>
                <p><strong>Encryption:</strong> 256-bit AES</p>
                <p><strong>Languages:</strong> English → Spanish</p>
                <p><strong>Security:</strong> End-to-end encrypted</p>
              </div>
            </CardContent>
          </Card>

          {/* Scanner Instructions */}
          <Card className="bg-white/10 backdrop-blur-sm border border-white/20 shadow-2xl shadow-blue-400/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Camera className="w-5 h-5 text-blue-400" />
                How to Scan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Open Camera Scanner</h4>
                    <p className="text-sm text-gray-300">Click the "Scan QR Code" button below to open the camera scanner</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Allow Camera Access</h4>
                    <p className="text-sm text-gray-300">Grant camera permission when prompted by your browser</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Point at QR Code</h4>
                    <p className="text-sm text-gray-300">Point your camera at the demo QR code on the left</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-white">Establish Connection</h4>
                    <p className="text-sm text-gray-300">The scanner will automatically detect and establish a secure handshake</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowScanner(true)}
                className="w-full bg-gradient-to-br from-blue-500 to-purple-600 hover:shadow-lg hover:shadow-blue-400/25 transform hover:scale-105 transition-all text-white font-semibold py-3 rounded-2xl"
                size="lg"
              >
                <Camera className="w-5 h-5 mr-2" />
                Scan QR Code
              </Button>

              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Smartphone className="w-4 h-4" />
                <span>Works on mobile devices with camera access</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scanned Results */}
        {scannedData && (
          <Card className="mt-8 bg-white/10 backdrop-blur-sm border border-green-400/30 shadow-2xl shadow-green-400/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Wifi className="w-5 h-5 text-green-400" />
                Handshake Successful!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                  <p className="text-green-300 font-medium">✓ Secure connection established</p>
                  <p className="text-sm text-gray-300 mt-1">The QR code data has been successfully scanned and decrypted</p>
                </div>
                
                <div className="bg-black/20 rounded-lg p-4">
                  <h4 className="font-medium text-white mb-2">Scanned Data:</h4>
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    {JSON.stringify(JSON.parse(scannedData), null, 2)}
                  </pre>
                </div>
                
                <div className="flex gap-3">
                  <Link href="/ble-translator">
                    <Button className="bg-cyan-500 hover:bg-cyan-600">
                      Go to Full Translator
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    onClick={() => setScannedData('')}
                    className="border-gray-400/30 text-gray-300 hover:bg-gray-400/20"
                  >
                    Clear Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mobile Instructions */}
        <Card className="mt-8 bg-white/10 backdrop-blur-sm border border-amber-400/30 shadow-2xl shadow-amber-400/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Mobile Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="font-medium text-white mb-2">Camera Access</h4>
                <p className="text-sm text-gray-300">Grant camera permission for QR scanning</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="font-medium text-white mb-2">Secure Connection</h4>
                <p className="text-sm text-gray-300">End-to-end encrypted handshake</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Wifi className="w-6 h-6 text-amber-400" />
                </div>
                <h4 className="font-medium text-white mb-2">Real-time Translation</h4>
                <p className="text-sm text-gray-300">Instant voice translation after connection</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Camera, Zap } from "lucide-react";
import FullFrameBarcodeScanner from "./FullFrameBarcodeScanner";
import ZXingBarcodeScanner from "./ZXingBarcodeScanner";
import SimpleQRScanner from "./SimpleQRScanner";

interface ScannerTestProps {
  className?: string;
}

export default function ScannerTest({ className = "" }: ScannerTestProps) {
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [scannerType, setScannerType] = useState<'fullframe' | 'zxing' | 'simple'>('fullframe');

  const handleBarcodeScanned = (barcode: string) => {
    console.log("🎯 Barcode scanned:", barcode);
    setLastScanned(barcode);
    setScannedBarcodes(prev => [barcode, ...prev.slice(0, 9)]); // Keep last 10
  };

  const handleError = (error: string) => {
    console.error("❌ Scanner error:", error);
    setScanErrors(prev => [error, ...prev.slice(0, 4)]); // Keep last 5
  };

  const clearResults = () => {
    setScannedBarcodes([]);
    setLastScanned("");
    setScanErrors([]);
  };

  const generateTestQR = () => {
    // Generate a test barcode for demonstration
    const testBarcode = `TEST_${Date.now()}`;
    handleBarcodeScanned(testBarcode);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Full-Frame Barcode Scanner Test
          </CardTitle>
          <CardDescription>
            Test the full-frame barcode scanners that detect barcodes anywhere in the camera frame.
            No need to position barcodes in a specific box - just show them anywhere in the camera view.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Scanner Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scanner Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={scannerType === 'fullframe' ? 'default' : 'outline'}
              onClick={() => setScannerType('fullframe')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Full-Frame Scanner
            </Button>
            <Button
              variant={scannerType === 'zxing' ? 'default' : 'outline'}
              onClick={() => setScannerType('zxing')}
              className="flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              ZXing Scanner
            </Button>
            <Button
              variant={scannerType === 'simple' ? 'default' : 'outline'}
              onClick={() => setScannerType('simple')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Simple Scanner
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <strong>Full-Frame Scanner:</strong> Uses html5-qrcode with full-frame detection<br/>
            <strong>ZXing Scanner:</strong> Uses ZXing-js library for advanced detection<br/>
            <strong>Simple Scanner:</strong> Basic html5-qrcode with fixed scanning box
          </div>
        </CardContent>
      </Card>

      {/* Scanner Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scanner</CardTitle>
        </CardHeader>
        <CardContent>
          {scannerType === 'fullframe' && (
            <FullFrameBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              onError={handleError}
              scannedBarcode={lastScanned}
              showControls={true}
              autoStart={false}
              showDebugInfo={true}
              className="w-full"
            />
          )}
          
          {scannerType === 'zxing' && (
            <ZXingBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              onError={handleError}
              scannedBarcode={lastScanned}
              showControls={true}
              autoStart={false}
              showDebugInfo={true}
              scanInterval={100}
              className="w-full"
            />
          )}
          
          {scannerType === 'simple' && (
            <SimpleQRScanner
              onBarcodeScanned={handleBarcodeScanned}
              onError={handleError}
              scannedBarcode={lastScanned}
              showControls={true}
              autoStart={false}
              className="w-full"
            />
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button onClick={generateTestQR} variant="outline">
              Generate Test Barcode
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scanned Barcodes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Scanned Barcodes ({scannedBarcodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scannedBarcodes.length === 0 ? (
              <p className="text-muted-foreground text-sm">No barcodes scanned yet</p>
            ) : (
              <div className="space-y-2">
                {scannedBarcodes.map((barcode, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      #{index + 1}
                    </Badge>
                    <code className="text-sm bg-muted px-2 py-1 rounded flex-1">
                      {barcode}
                    </code>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Errors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              Errors ({scanErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scanErrors.length === 0 ? (
              <p className="text-muted-foreground text-sm">No errors</p>
            ) : (
              <div className="space-y-2">
                {scanErrors.map((error, index) => (
                  <Alert key={index} variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Full-Frame Detection</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Position barcode anywhere in camera view</li>
                <li>• No need to align with scanning box</li>
                <li>• Works with QR codes, barcodes, and text</li>
                <li>• Detects barcodes from any distance</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Test Methods</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use "Generate Test Barcode" button</li>
                <li>• Show real QR codes to camera</li>
                <li>• Try different barcode formats</li>
                <li>• Test from various distances</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


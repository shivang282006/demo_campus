import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Camera, RotateCcw, Monitor, AlertCircle, CheckCircle } from "lucide-react";
import MirroredCamera from "./MirroredCamera";
import FullFrameBarcodeScanner from "./FullFrameBarcodeScanner";
import ZXingBarcodeScanner from "./ZXingBarcodeScanner";

interface CameraMirrorTestProps {
  className?: string;
}

export default function CameraMirrorTest({ className = "" }: CameraMirrorTestProps) {
  const [testMode, setTestMode] = useState<'camera' | 'scanner-fullframe' | 'scanner-zxing'>('camera');
  const [scannedBarcodes, setScannedBarcodes] = useState<string[]>([]);
  const [lastScanned, setLastScanned] = useState<string>("");
  const [testResults, setTestResults] = useState<{
    frontCameraTested: boolean;
    rearCameraTested: boolean;
    mirrorWorking: boolean;
    barcodeDetection: boolean;
  }>({
    frontCameraTested: false,
    rearCameraTested: false,
    mirrorWorking: false,
    barcodeDetection: false,
  });

  const handleBarcodeScanned = (barcode: string) => {
    console.log("🎯 Barcode scanned:", barcode);
    setLastScanned(barcode);
    setScannedBarcodes(prev => [barcode, ...prev.slice(0, 9)]); // Keep last 10
    setTestResults(prev => ({ ...prev, barcodeDetection: true }));
  };

  const handleStreamReady = (stream: MediaStream) => {
    console.log("📹 Camera stream ready:", stream);
    // Test camera detection logic here
  };

  const handleStreamError = (error: string) => {
    console.error("❌ Camera error:", error);
  };

  const runMirrorTest = () => {
    // This would be a manual test - user needs to verify mirror behavior
    setTestResults(prev => ({ ...prev, mirrorWorking: true }));
  };

  const resetTests = () => {
    setTestResults({
      frontCameraTested: false,
      rearCameraTested: false,
      mirrorWorking: false,
      barcodeDetection: false,
    });
    setScannedBarcodes([]);
    setLastScanned("");
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Camera Mirror Test Suite
          </CardTitle>
          <CardDescription>
            Test camera mirroring functionality for front and rear cameras.
            Front camera should be mirrored, rear camera should show natural view.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Test Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button
              variant={testMode === 'camera' ? 'default' : 'outline'}
              onClick={() => setTestMode('camera')}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera Only
            </Button>
            <Button
              variant={testMode === 'scanner-fullframe' ? 'default' : 'outline'}
              onClick={() => setTestMode('scanner-fullframe')}
              className="flex-1"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Full-Frame Scanner
            </Button>
            <Button
              variant={testMode === 'scanner-zxing' ? 'default' : 'outline'}
              onClick={() => setTestMode('scanner-zxing')}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              ZXing Scanner
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <strong>Camera Only:</strong> Test mirror functionality without scanning<br/>
            <strong>Full-Frame Scanner:</strong> Test with html5-qrcode scanner<br/>
            <strong>ZXing Scanner:</strong> Test with ZXing-js scanner
          </div>
        </CardContent>
      </Card>

      {/* Test Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Component</CardTitle>
        </CardHeader>
        <CardContent>
          {testMode === 'camera' && (
            <MirroredCamera
              onStreamReady={handleStreamReady}
              onStreamError={handleStreamError}
              showControls={true}
              showInfo={true}
              autoStart={false}
              preferredFacingMode="environment"
              className="w-full"
            />
          )}
          
          {testMode === 'scanner-fullframe' && (
            <FullFrameBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              scannedBarcode={lastScanned}
              showControls={true}
              autoStart={false}
              showDebugInfo={true}
              className="w-full"
            />
          )}
          
          {testMode === 'scanner-zxing' && (
            <ZXingBarcodeScanner
              onBarcodeScanned={handleBarcodeScanned}
              scannedBarcode={lastScanned}
              showControls={true}
              autoStart={false}
              showDebugInfo={true}
              scanInterval={100}
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
            <Button onClick={runMirrorTest} variant="outline">
              Mark Mirror Test Complete
            </Button>
            <Button onClick={resetTests} variant="outline">
              Reset All Tests
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Test Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Front Camera Tested</span>
                <Badge variant={testResults.frontCameraTested ? "default" : "secondary"}>
                  {testResults.frontCameraTested ? "✓ Passed" : "⏳ Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Rear Camera Tested</span>
                <Badge variant={testResults.rearCameraTested ? "default" : "secondary"}>
                  {testResults.rearCameraTested ? "✓ Passed" : "⏳ Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Mirror Working</span>
                <Badge variant={testResults.mirrorWorking ? "default" : "secondary"}>
                  {testResults.mirrorWorking ? "✓ Passed" : "⏳ Pending"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Barcode Detection</span>
                <Badge variant={testResults.barcodeDetection ? "default" : "secondary"}>
                  {testResults.barcodeDetection ? "✓ Passed" : "⏳ Pending"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scanned Barcodes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Monitor className="w-5 h-5 text-blue-500" />
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
      </div>

      {/* Test Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Front Camera Test</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to front camera</li>
                <li>• Move your hand to the right</li>
                <li>• Hand should appear to move right (mirrored)</li>
                <li>• Mark test as complete if correct</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Rear Camera Test</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Switch to rear camera</li>
                <li>• Move your hand to the right</li>
                <li>• Hand should appear to move right (natural)</li>
                <li>• Mark test as complete if correct</li>
              </ul>
            </div>
          </div>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> The mirror behavior should be automatic based on camera type.
              Front camera (user) should be mirrored, rear camera (environment) should show natural view.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}


import { useRef, useEffect, useState, useCallback } from "react";
import { Scan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebcam } from "@/hooks/use-webcam";

interface BarcodeScannerProps {
  onBarcodeScanned: (studentId: string) => void;
  scannedId?: string;
}

export default function BarcodeScanner({ onBarcodeScanned, scannedId }: BarcodeScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  
  const { videoRef, isStreaming, startStream, stopStream, captureFrame } = useWebcam();

  // Simulate barcode scanning for demo purposes
  const simulateBarcodeScanning = useCallback(() => {
    if (!simulationMode) return;
    
    const mockStudentIds = ["APSIT-2021-001", "APSIT-2021-045", "APSIT-2022-089", "APSIT-2021-023"];
    const randomId = mockStudentIds[Math.floor(Math.random() * mockStudentIds.length)];
    
    setIsScanning(true);
    setTimeout(() => {
      onBarcodeScanned(randomId);
      setIsScanning(false);
    }, 1500);
  }, [simulationMode, onBarcodeScanned]);

  // Real barcode scanning would be implemented here using libraries like QuaggaJS or html5-qrcode
  const scanBarcode = useCallback(async () => {
    if (!videoRef.current || isScanning) return;

    setIsScanning(true);
    
    try {
      // Capture current frame
      const frame = captureFrame();
      if (!frame) {
        setIsScanning(false);
        return;
      }

      // In a real implementation, you would:
      // 1. Use a barcode scanning library like QuaggaJS, ZXing, or html5-qrcode
      // 2. Process the captured frame for barcode/QR code detection
      // 3. Validate the scanned data format for student IDs
      
      // For now, use simulation mode
      if (simulationMode) {
        simulateBarcodeScanning();
      } else {
        console.log("Real barcode scanning would happen here");
        // Example with html5-qrcode:
        // const html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
        // html5QrcodeScanner.render(onScanSuccess, onScanError);
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Barcode scanning error:", error);
      setIsScanning(false);
    }
  }, [videoRef, captureFrame, isScanning, simulateBarcodeScanning, simulationMode]);

  // Auto-scan for barcodes periodically when streaming
  useEffect(() => {
    if (!isStreaming || !simulationMode) return;

    const interval = setInterval(() => {
      if (!scannedId && !isScanning) {
        scanBarcode();
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [isStreaming, scanBarcode, scannedId, isScanning, simulationMode]);

  return (
    <div className="relative">
      {/* Video Feed */}
      <div className="aspect-video rounded-lg overflow-hidden relative bg-muted border-2 border-border">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          data-testid="barcode-video-feed"
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Camera feed not active</p>
              <Button onClick={startStream} data-testid="button-start-scanner-camera">
                Start Camera
              </Button>
            </div>
          </div>
        )}

        {/* Live feed overlay */}
        {isStreaming && (
          <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-md">
            <p className="text-xs text-white font-mono">SCAN MODE</p>
          </div>
        )}

        {/* Barcode scanner overlay */}
        {isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-80 h-56 border-2 border-primary rounded-lg relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
              
              {/* Scanning line animation */}
              <div className={`absolute inset-x-0 top-1/2 h-0.5 bg-primary ${isScanning ? 'animate-pulse' : ''}`}></div>
              
              <p className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-primary px-3 py-1 rounded text-sm font-semibold text-primary-foreground whitespace-nowrap">
                {scannedId ? `Scanned: ${scannedId}` : "Place ID card in frame"}
              </p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-primary px-4 py-2 rounded-lg text-primary-foreground font-medium">
              Scanning barcode...
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="mt-4 flex items-center space-x-2">
        <Button
          onClick={scanBarcode}
          disabled={!isStreaming || isScanning}
          className="flex-1"
          data-testid="button-scan-barcode"
        >
          <Scan className="w-5 h-5 mr-2" />
          {isScanning ? "Scanning..." : "Scan Barcode"}
        </Button>
        
        <Button
          variant="outline"
          onClick={simulationMode ? () => setSimulationMode(false) : () => setSimulationMode(true)}
          data-testid="button-barcode-demo"
        >
          {simulationMode ? "Disable" : "Enable"} Demo Mode
        </Button>
        
        {isStreaming ? (
          <Button variant="outline" onClick={stopStream} data-testid="button-stop-scanner">
            Stop
          </Button>
        ) : (
          <Button variant="outline" onClick={startStream} data-testid="button-start-scanner">
            Start
          </Button>
        )}
      </div>
      
      {simulationMode && (
        <p className="text-xs text-warning mt-2">
          Demo mode active - simulating barcode scanning
        </p>
      )}
    </div>
  );
}

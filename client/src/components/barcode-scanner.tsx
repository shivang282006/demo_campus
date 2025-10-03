import { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebcam } from "@/hooks/use-webcam";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from "html5-qrcode";

interface BarcodeScannerProps {
  onBarcodeScanned: (studentId: string) => void;
  scannedId?: string;
}

export default function BarcodeScanner({ onBarcodeScanned, scannedId }: BarcodeScannerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [isRealScanning, setIsRealScanning] = useState(false);
  const [lastScannedText, setLastScannedText] = useState<string>("");
  
  const { videoRef, isStreaming, startStream, stopStream, captureFrame } = useWebcam();

  // Validate and extract student ID from scanned text
  const validateStudentId = useCallback((scannedText: string): string | null => {
    // Clean the scanned text
    const cleanText = scannedText.trim();
    
    // Common student ID patterns (more flexible)
    const patterns = [
      /^APSIT-\d{4}-\d{3}$/i,     // APSIT-2021-001
      /^[A-Z]{2,4}\d{4,6}$/i,     // ABC123456
      /^\d{6,10}$/,                // 123456789
      /^[A-Z]\d{6,8}$/i,           // A1234567
      /moodle\s*(\d+)/i,           // moodle 23102050
      /^moodle\s*\d+$/i,           // moodle23102050
    ];
    
    // Check if any pattern matches
    for (const pattern of patterns) {
      if (pattern.test(cleanText)) {
        // For moodle pattern, extract just the number
        if (pattern.source.includes('moodle')) {
          const match = cleanText.match(/moodle\s*(\d+)/i);
          return match ? match[1] : cleanText;
        }
        return cleanText;
      }
    }
    
    // If no pattern matches, try to extract student ID from longer text
    const extractedId = cleanText.match(/([A-Z]{2,4}\d{4,6}|APSIT-\d{4}-\d{3}|\d{6,10}|moodle\s*\d+)/i);
    if (extractedId) {
      let result = extractedId[1];
      // If it's a moodle pattern, extract just the number
      if (result.toLowerCase().includes('moodle')) {
        const numberMatch = result.match(/\d+/);
        return numberMatch ? numberMatch[0] : result;
      }
      return result;
    }
    
    // If still no match, return the original text (let the system handle it)
    return cleanText;
  }, []);

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

  // Start real barcode scanning
  const startRealScanning = useCallback(async () => {
    if (isRealScanning) return;

    setIsRealScanning(true);
    setScanError("");

    try {
      // Check if the scanner element exists
      const scannerElement = document.getElementById("barcode-scanner");
      if (!scannerElement) {
        throw new Error("Scanner element not found");
      }
      
      console.log("Starting real barcode scanner...");
      
      const html5Qrcode = new Html5Qrcode("barcode-scanner");
      scannerRef.current = html5Qrcode;

      const config: Html5QrcodeCameraScanConfig = {
        fps: 10,
        qrbox: { width: 300, height: 200 },
        aspectRatio: 1.0,
        supportedScanFormats: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
        showFullScreenButton: true,
      };

      // Start camera scanning
      await html5Qrcode.start(
        { facingMode: "environment" }, // Use back camera
        config,
        (decodedText) => {
          console.log("Scanned text:", decodedText);
          setLastScannedText(decodedText);
          const validStudentId = validateStudentId(decodedText);
          
          if (validStudentId) {
            onBarcodeScanned(validStudentId);
            stopRealScanning();
            setScanError("");
          } else {
            // Show the actual scanned content for debugging
            setScanError(`Scanned: "${decodedText}" - Not recognized as student ID`);
            setTimeout(() => setScanError(""), 5000);
          }
        },
        (error) => {
          // Don't show every error, only meaningful ones
          if (error && !error.includes("No MultiFormat Readers")) {
            console.log("Scan error:", error);
          }
        }
      );
    } catch (error) {
      console.error("Failed to start barcode scanner:", error);
      setScanError(`Failed to start scanner: ${error.message || error}`);
      setIsRealScanning(false);
    }
  }, [isRealScanning, validateStudentId, onBarcodeScanned]);

  // Stop real barcode scanning
  const stopRealScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log("Error stopping scanner:", error);
      }
    }
    setIsRealScanning(false);
    setScanError("");
  }, []);

  // Manual scan trigger
  const scanBarcode = useCallback(async () => {
    console.log("Scan button clicked, isScanning:", isScanning, "isRealScanning:", isRealScanning, "simulationMode:", simulationMode);
    
    if (isScanning || isRealScanning) {
      console.log("Already scanning, ignoring click");
      return;
    }

    if (simulationMode) {
      console.log("Starting demo scan");
      simulateBarcodeScanning();
    } else {
      console.log("Starting real scan");
      startRealScanning();
    }
  }, [isScanning, isRealScanning, simulationMode, simulateBarcodeScanning, startRealScanning]);

  // Auto-scan for barcodes periodically when streaming (simulation mode only)
  useEffect(() => {
    if (!isStreaming || !simulationMode) return;

    const interval = setInterval(() => {
      if (!scannedId && !isScanning) {
        scanBarcode();
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isStreaming, scanBarcode, scannedId, isScanning, simulationMode]);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
        }).catch(() => {
          scannerRef.current?.clear();
        });
      }
    };
  }, []);

  return (
    <div className="relative">
      {/* Video Feed / Scanner */}
      <div className="aspect-video rounded-lg overflow-hidden relative bg-muted border-2 border-border">
        {/* Real barcode scanner - always render but hide when not active */}
        <div 
          id="barcode-scanner" 
          className={`w-full h-full ${isRealScanning ? 'block' : 'hidden'}`}
        ></div>
        
        {/* Fallback video feed for simulation mode */}
        {!isRealScanning && (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              data-testid="barcode-video-feed"
            />
            
            {!isStreaming && !isRealScanning && (
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
            {isStreaming && !isRealScanning && (
              <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-md">
                <p className="text-xs text-white font-mono">SCAN MODE</p>
              </div>
            )}

            {/* Barcode scanner overlay */}
            {isStreaming && !isRealScanning && (
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

            {isScanning && !isRealScanning && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="bg-primary px-4 py-2 rounded-lg text-primary-foreground font-medium">
                  Scanning barcode...
                </div>
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {scanError && (
          <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{scanError}</span>
          </div>
        )}

        {/* Scanner status overlay */}
        {isRealScanning && (
          <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-md">
            <p className="text-xs font-mono">REAL SCANNER ACTIVE</p>
          </div>
        )}
        
        {simulationMode && !isRealScanning && (
          <div className="absolute top-4 left-4 bg-yellow-500/90 text-yellow-900 px-3 py-2 rounded-md">
            <p className="text-xs font-mono">DEMO MODE ACTIVE</p>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="mt-4 flex items-center space-x-2">
        {!isRealScanning ? (
          <Button
            onClick={scanBarcode}
            disabled={isScanning}
            className="flex-1"
            data-testid="button-scan-barcode"
          >
            <Scan className="w-5 h-5 mr-2" />
            {isScanning ? "Scanning..." : (simulationMode ? "Demo Scan" : "Real Scan")}
          </Button>
        ) : (
          <Button
            onClick={stopRealScanning}
            variant="destructive"
            className="flex-1"
            data-testid="button-stop-real-scanner"
          >
            <Scan className="w-5 h-5 mr-2" />
            Stop Scanner
          </Button>
        )}
        
        <Button
          variant="outline"
          onClick={simulationMode ? () => setSimulationMode(false) : () => setSimulationMode(true)}
          disabled={isRealScanning}
          data-testid="button-barcode-demo"
          className={simulationMode ? "bg-yellow-100 border-yellow-300" : ""}
        >
          {simulationMode ? "Disable Demo" : "Enable Demo"} Mode
        </Button>
        
        <Button
          variant="outline"
          onClick={() => {
            const element = document.getElementById("barcode-scanner");
            console.log("Scanner element exists:", !!element);
            console.log("Scanner element:", element);
          }}
          data-testid="button-test-scanner"
        >
          Test
        </Button>
        
        {!isRealScanning && (
          isStreaming ? (
            <Button variant="outline" onClick={stopStream} data-testid="button-stop-scanner">
              Stop
            </Button>
          ) : (
            <Button variant="outline" onClick={startStream} data-testid="button-start-scanner">
              Start
            </Button>
          )
        )}
      </div>
      
      {simulationMode && !isRealScanning && (
        <p className="text-xs text-warning mt-2">
          Demo mode active - simulating barcode scanning
        </p>
      )}
      
      {isRealScanning && (
        <p className="text-xs text-success mt-2">
          Real scanner active - scan any barcode or QR code on ID cards
        </p>
      )}
      
      {lastScannedText && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
          <p className="text-xs text-muted-foreground mb-1">Last Scanned Content:</p>
          <p className="text-sm font-mono text-foreground break-all">{lastScannedText}</p>
        </div>
      )}
    </div>
  );
}

import React, { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle, Camera, CameraOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import useCameraMirror from "@/hooks/use-camera-mirror";

interface FullFrameBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
  supportedFormats?: Html5QrcodeSupportedFormats[];
  debounceMs?: number;
  showDebugInfo?: boolean;
}

export default function FullFrameBarcodeScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
  supportedFormats = [
    Html5QrcodeSupportedFormats.QR_CODE,
    Html5QrcodeSupportedFormats.CODE_128,
    Html5QrcodeSupportedFormats.CODE_39,
    Html5QrcodeSupportedFormats.EAN_13,
    Html5QrcodeSupportedFormats.EAN_8,
    Html5QrcodeSupportedFormats.UPC_A,
    Html5QrcodeSupportedFormats.UPC_E,
    Html5QrcodeSupportedFormats.CODE_93,
    Html5QrcodeSupportedFormats.CODABAR,
    Html5QrcodeSupportedFormats.DATA_MATRIX,
    Html5QrcodeSupportedFormats.AZTEC,
  ],
  debounceMs = 2000,
  showDebugInfo = false,
}: FullFrameBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    averageScanTime: 0,
  });

  // Camera mirror hook
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    cameraInfo,
    isMirrored,
    isInitialized: mirrorInitialized,
    initializeMirror,
  } = useCameraMirror({
    videoRef,
    facingMode: 'environment',
    autoDetect: true,
    enableMirror: true,
  });

  // Enhanced barcode validation
  const validateBarcode = useCallback((scannedText: string): string | null => {
    const cleanText = scannedText.trim();
    
    // Common barcode patterns
    const patterns = [
      /^APSIT-\d{4}-\d{3}$/i,     // APSIT-2021-001
      /^[A-Z]{2,4}\d{4,6}$/i,     // ABC123456
      /^\d{6,10}$/,                // 123456789
      /^[A-Z]\d{6,8}$/i,           // A1234567
      /moodle\s*(\d+)/i,           // moodle 23102050
      /^moodle\s*\d+$/i,           // moodle23102050
      /^[A-Z0-9]{4,20}$/i,         // Generic alphanumeric codes
      /^[A-Z0-9\-]{6,30}$/i,       // Extended patterns
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(cleanText)) {
        if (pattern.source.includes('moodle')) {
          const match = cleanText.match(/moodle\s*(\d+)/i);
          return match ? match[1] : cleanText;
        }
        return cleanText;
      }
    }
    
    // Extract barcode from longer text
    const extractedId = cleanText.match(/([A-Z]{2,4}\d{4,6}|APSIT-\d{4}-\d{3}|\d{6,10}|moodle\s*\d+|[A-Z0-9\-]{4,30})/i);
    if (extractedId) {
      let result = extractedId[1];
      if (result.toLowerCase().includes('moodle')) {
        const numberMatch = result.match(/\d+/);
        return numberMatch ? numberMatch[0] : result;
      }
      return result;
    }
    
    // Accept any non-empty text as valid barcode for maximum compatibility
    return cleanText.length > 0 ? cleanText : null;
  }, []);

  // Start full-frame barcode scanning
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      const scannerElement = document.getElementById("full-frame-scanner");
      if (!scannerElement) {
        throw new Error("Scanner element not found");
      }
      
      if (showDebugInfo) {
        console.log("🚀 Starting full-frame barcode scanner...");
      }
      
      const html5Qrcode = new Html5Qrcode("full-frame-scanner");
      scannerRef.current = html5Qrcode;

      // Configuration for full-frame scanning
      const config: Html5QrcodeCameraScanConfig = {
        fps: 30, // High FPS for real-time scanning
        qrbox: undefined, // Remove bounding box restriction - scan entire frame
        aspectRatio: 1.777, // 16:9 aspect ratio
        supportedScanFormats: supportedFormats,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 1,
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
        showFullScreenButton: true,
        // Performance optimizations for full-frame scanning
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        // High-resolution video constraints for better detection
        videoConstraints: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "environment",
          frameRate: { ideal: 30, min: 15 }
        }
      };

      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          const currentTime = Date.now();
          const timeSinceLastScan = currentTime - lastScanTime;
          
          // Debounce: prevent duplicate scans
          if (timeSinceLastScan < debounceMs && lastScannedText === decodedText) {
            if (showDebugInfo) {
              console.log("⏭️ Duplicate scan ignored (debounced)");
            }
            return;
          }
          
          if (showDebugInfo) {
            console.log("🎯 Barcode detected! Scanned text:", decodedText);
          }
          
          setLastScannedText(decodedText);
          setLastScanTime(currentTime);
          setScanStats(prev => ({
            ...prev,
            totalScans: prev.totalScans + 1
          }));
          
          const validBarcode = validateBarcode(decodedText);
          
          if (validBarcode) {
            // Show success animation
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 1500);
            
            // Update stats
            setScanStats(prev => ({
              ...prev,
              successfulScans: prev.successfulScans + 1
            }));
            
            // Process the scan
            onBarcodeScanned(validBarcode);
            setScanError("");
            
            // Continue scanning for next barcode
            return;
          } else {
            setScanError(`Scanned: "${decodedText}" - Not recognized as valid barcode`);
            setTimeout(() => setScanError(""), 2000);
          }
        },
        (error) => {
          if (error && !error.includes("No MultiFormat Readers")) {
            if (showDebugInfo) {
              console.log("⚠️ Scan error:", error);
            }
            
            let errorMessage = "Scanning error occurred";
            if (error.includes("Permission denied") || error.includes("NotAllowedError")) {
              errorMessage = "Camera permission denied. Please allow camera access.";
            } else if (error.includes("NotFoundError")) {
              errorMessage = "No camera found. Please check your camera connection.";
            } else if (error.includes("NotReadableError")) {
              errorMessage = "Camera is being used by another application.";
            }
            
            setScanError(errorMessage);
            onError?.(errorMessage);
          }
        }
      );
      
      setIsInitialized(true);
      
      // Get camera resolution
      const videoElement = scannerElement.querySelector('video');
      if (videoElement) {
        setCameraResolution({
          width: videoElement.videoWidth,
          height: videoElement.videoHeight
        });
      }
      
    } catch (error: any) {
      console.error("Failed to start full-frame scanner:", error);
      const errorMessage = `Failed to start scanner: ${error.message || error}`;
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, lastScannedText, lastScanTime, debounceMs, supportedFormats, validateBarcode, onBarcodeScanned, onError, onScanStart, showDebugInfo]);

  // Stop barcode scanning
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log("Error stopping scanner:", error);
      }
    }
    setIsScanning(false);
    setIsInitialized(false);
    setScanError("");
    onScanStop?.();
  }, [onScanStop]);

  // Auto-start scanning if enabled
  useEffect(() => {
    if (autoStart && !isScanning && !isInitialized) {
      const timer = setTimeout(() => {
        startScanning();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStart, isScanning, isInitialized, startScanning]);

  // Cleanup on unmount
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
    <div className={`relative ${className}`}>
      {/* Scanner Container */}
      <div className="aspect-video rounded-lg overflow-hidden relative bg-muted border-2 border-border">
        {/* Scanner Element */}
        <div 
          id="full-frame-scanner" 
          className={`w-full h-full ${isScanning ? 'block' : 'hidden'}`}
        ></div>
        
        {/* Placeholder when not scanning */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Full-Frame Barcode Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">
                Detects barcodes anywhere in the camera frame
              </p>
              {showControls && (
                <Button onClick={startScanning}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Scanner
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Full Frame Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanner Status */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" />
                <span>FULL-FRAME SCANNER</span>
              </div>
              <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              <div>Camera: {cameraInfo.facingMode} {isMirrored ? '(Mirrored)' : '(Natural)'}</div>
              <div>Scans: {scanStats.successfulScans}/{scanStats.totalScans}</div>
            </div>

            {/* Full frame scanning indicator */}
            <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-lg">
              {/* Corner indicators */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary animate-pulse"></div>
              
              {/* Scanning animation across entire frame */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-1/6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                <div className="absolute inset-x-0 top-1/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.3s'}}></div>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.6s'}}></div>
                <div className="absolute inset-x-0 top-2/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.9s'}}></div>
                <div className="absolute inset-x-0 top-5/6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '1.2s'}}></div>
              </div>
              
              {/* Center scanning indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-ping"></div>
            </div>
            
            {/* Status text */}
            <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground whitespace-nowrap shadow-lg">
              {scannedBarcode ? `✓ Scanned: ${scannedBarcode}` : "📱 Show barcode anywhere in frame"}
            </p>
          </div>
        )}

        {/* Success Animation */}
        {showSuccessAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-green-500/90 backdrop-blur-sm px-6 py-4 rounded-lg text-white font-bold text-lg animate-bounce shadow-2xl">
              ✓ Barcode Detected!
            </div>
          </div>
        )}

        {/* Error Display */}
        {scanError && (
          <div className="absolute top-4 right-4 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{scanError}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {showControls && (
        <div className="mt-4 flex items-center space-x-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="flex-1">
              <Camera className="w-5 h-5 mr-2" />
              Start Scanner
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="flex-1">
              <CameraOff className="w-5 h-5 mr-2" />
              Stop Scanner
            </Button>
          )}
        </div>
      )}
      
      {/* Status Messages */}
      {isScanning && (
        <p className="text-xs text-success mt-2">
          🔍 Full-frame scanner active - detects barcodes anywhere in the camera view
        </p>
      )}
      
      {/* Debug Info */}
      {showDebugInfo && lastScannedText && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
          <p className="text-xs text-muted-foreground mb-1">Last Scanned Content:</p>
          <p className="text-sm font-mono text-foreground break-all">{lastScannedText}</p>
        </div>
      )}
    </div>
  );
}
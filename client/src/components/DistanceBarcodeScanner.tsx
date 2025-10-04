import React, { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle, Camera, CameraOff, ZoomIn, ZoomOut, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeCameraScanConfig } from "html5-qrcode";

interface DistanceBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
  maxDistance?: number; // Maximum detection distance in meters
  minBarcodeSize?: number; // Minimum barcode size in pixels
}

export default function DistanceBarcodeScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
  maxDistance = 2, // 2 meters default
  minBarcodeSize = 50, // 50 pixels minimum
}: DistanceBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(2);
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });
  const [detectionStats, setDetectionStats] = useState({
    totalScans: 0,
    successfulScans: 0,
    averageDistance: 0,
  });

  // Enhanced barcode validation with distance considerations
  const validateBarcode = useCallback((scannedText: string): string | null => {
    const cleanText = scannedText.trim();
    
    // Enhanced patterns for distance scanning
    const patterns = [
      /^APSIT-\d{4}-\d{3}$/i,     // APSIT-2021-001
      /^[A-Z]{2,4}\d{4,6}$/i,     // ABC123456
      /^\d{6,10}$/,                // 123456789
      /^[A-Z]\d{6,8}$/i,           // A1234567
      /moodle\s*(\d+)/i,           // moodle 23102050
      /^moodle\s*\d+$/i,           // moodle23102050
      /^[A-Z0-9]{4,20}$/i,         // Generic alphanumeric codes
      /^[A-Z0-9\-]{6,30}$/i,       // Extended patterns for distance
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
    
    // Extract barcode from longer text with better distance tolerance
    const extractedId = cleanText.match(/([A-Z]{2,4}\d{4,6}|APSIT-\d{4}-\d{3}|\d{6,10}|moodle\s*\d+|[A-Z0-9\-]{4,30})/i);
    if (extractedId) {
      let result = extractedId[1];
      if (result.toLowerCase().includes('moodle')) {
        const numberMatch = result.match(/\d+/);
        return numberMatch ? numberMatch[0] : result;
      }
      return result;
    }
    
    return cleanText;
  }, []);

  // Get optimal camera settings based on device capabilities
  const getOptimalCameraSettings = useCallback(() => {
    const settings = {
      width: { ideal: 3840, min: 1920 }, // 4K preferred, Full HD minimum
      height: { ideal: 2160, min: 1080 },
      facingMode: "environment",
      frameRate: { ideal: 30, min: 15 },
      focusMode: "continuous",
      whiteBalanceMode: "continuous",
      exposureMode: "continuous",
      advanced: [
        { focusMode: "continuous" },
        { whiteBalanceMode: "continuous" },
        { exposureMode: "continuous" },
        { torch: true },
        { zoom: { min: 1, max: 5, step: 0.1 } }
      ]
    };

    // Try to get the highest resolution available
    return navigator.mediaDevices.getSupportedConstraints().then(constraints => {
      if (constraints.width && constraints.height) {
        // Request maximum available resolution
        settings.width = { ideal: 4096, min: 1920 };
        settings.height = { ideal: 2160, min: 1080 };
      }
      return settings;
    }).catch(() => settings);
  }, []);

  // Start high-resolution distance scanning
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      const scannerElement = document.getElementById("distance-scanner");
      if (!scannerElement) {
        throw new Error("Scanner element not found");
      }
      
      console.log("🚀 Starting high-resolution distance barcode scanner...");
      
      const html5Qrcode = new Html5Qrcode("distance-scanner");
      scannerRef.current = html5Qrcode;

      // Get optimal camera settings
      const cameraSettings = await getOptimalCameraSettings();

      const config: Html5QrcodeCameraScanConfig = {
        fps: 30, // High FPS for real-time scanning
        qrbox: undefined, // Full frame scanning
        aspectRatio: 1.777, // 16:9 aspect ratio
        supportedScanFormats: [
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
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: zoomLevel,
        useBarCodeDetectorIfSupported: true,
        rememberLastUsedCamera: true,
        showFullScreenButton: true,
        // Advanced decoding options for distance scanning
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        videoConstraints: cameraSettings
      };

      await html5Qrcode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          const currentTime = Date.now();
          const timeSinceLastScan = currentTime - lastScanTime;
          
          // Enhanced debounce for distance scanning
          if (timeSinceLastScan < 1500 && lastScannedText === decodedText) {
            console.log("⏭️ Duplicate scan ignored (distance debounced)");
            return;
          }
          
          console.log("🎯 Distance barcode detected! Scanned text:", decodedText);
          
          setLastScannedText(decodedText);
          setLastScanTime(currentTime);
          setDetectionStats(prev => ({
            ...prev,
            totalScans: prev.totalScans + 1
          }));
          
          const validBarcode = validateBarcode(decodedText);
          
          if (validBarcode) {
            // Show success animation
            setShowSuccessAnimation(true);
            setTimeout(() => setShowSuccessAnimation(false), 1500);
            
            // Update detection stats
            setDetectionStats(prev => ({
              ...prev,
              successfulScans: prev.successfulScans + 1
            }));
            
            // Process the scan
            onBarcodeScanned(validBarcode);
            setScanError("");
            
            console.log("✅ Distance scan successful:", validBarcode);
            return;
          } else {
            setScanError(`Scanned: "${decodedText}" - Not recognized as valid barcode`);
            setTimeout(() => setScanError(""), 2000);
          }
        },
        (error) => {
          if (error && !error.includes("No MultiFormat Readers")) {
            console.log("⚠️ Distance scan error:", error);
            
            let errorMessage = "Distance scanning error occurred";
            if (error.includes("Permission denied") || error.includes("NotAllowedError")) {
              errorMessage = "Camera permission denied. Please allow camera access.";
            } else if (error.includes("NotFoundError")) {
              errorMessage = "No camera found. Please check your camera connection.";
            } else if (error.includes("NotReadableError")) {
              errorMessage = "Camera is being used by another application.";
            } else if (error.includes("OverconstrainedError")) {
              errorMessage = "Camera resolution not supported. Trying lower resolution...";
              // Try with lower resolution
              setTimeout(() => {
                if (scannerRef.current) {
                  scannerRef.current.stop().then(() => {
                    startScanning();
                  });
                }
              }, 1000);
            }
            
            setScanError(errorMessage);
            onError?.(errorMessage);
          }
        }
      );
      
      setIsInitialized(true);
      
      // Get actual camera resolution
      const videoElement = scannerElement.querySelector('video');
      if (videoElement) {
        setCameraResolution({
          width: videoElement.videoWidth,
          height: videoElement.videoHeight
        });
      }
      
    } catch (error: any) {
      console.error("Failed to start distance barcode scanner:", error);
      const errorMessage = `Failed to start distance scanner: ${error.message || error}`;
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, lastScannedText, lastScanTime, zoomLevel, validateBarcode, onBarcodeScanned, onError, onScanStart, getOptimalCameraSettings]);

  // Stop barcode scanning
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (error) {
        console.log("Error stopping distance scanner:", error);
      }
    }
    setIsScanning(false);
    setIsInitialized(false);
    setScanError("");
    onScanStop?.();
  }, [onScanStop]);

  // Handle zoom change
  const handleZoomChange = useCallback((value: number[]) => {
    const newZoom = value[0];
    setZoomLevel(newZoom);
    
    // Apply zoom if scanner is active
    if (scannerRef.current && isScanning) {
      try {
        scannerRef.current.applyVideoConstraints({
          zoom: newZoom
        });
      } catch (error) {
        console.log("Error applying zoom:", error);
      }
    }
  }, [isScanning]);

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
          id="distance-scanner" 
          className={`w-full h-full ${isScanning ? 'block' : 'hidden'}`}
        ></div>
        
        {/* Placeholder when not scanning */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">High-Resolution Distance Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">Detects barcodes up to {maxDistance}m away</p>
              {showControls && (
                <Button onClick={startScanning}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Distance Scanner
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Distance Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Distance indicators */}
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <Focus className="w-4 h-4" />
                <span>Zoom: {zoomLevel}x</span>
              </div>
              <div className="mt-1">
                Resolution: {cameraResolution.width}x{cameraResolution.height}
              </div>
            </div>

            {/* Distance markers */}
            <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div>Max Distance: {maxDistance}m</div>
              <div>Min Size: {minBarcodeSize}px</div>
            </div>

            {/* Scanning indicator border */}
            <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-lg">
              {/* Corner indicators */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary animate-pulse"></div>
              
              {/* Enhanced scanning lines for distance detection */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-1/8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                <div className="absolute inset-x-0 top-1/4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute inset-x-0 top-3/8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.6s'}}></div>
                <div className="absolute inset-x-0 top-5/8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.8s'}}></div>
                <div className="absolute inset-x-0 top-3/4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '1.0s'}}></div>
                <div className="absolute inset-x-0 top-7/8 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '1.2s'}}></div>
              </div>
              
              {/* Center indicator */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full animate-ping"></div>
            </div>
            
            {/* Status text */}
            <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground whitespace-nowrap shadow-lg">
              {scannedBarcode ? `✓ Scanned: ${scannedBarcode}` : "📱 Show barcode anywhere in frame (up to 2m)"}
            </p>
          </div>
        )}

        {/* Success Animation */}
        {showSuccessAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-green-500/90 backdrop-blur-sm px-6 py-4 rounded-lg text-white font-bold text-lg animate-bounce shadow-2xl">
              ✓ Distance Scan Success!
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

        {/* Scanner Status */}
        {isScanning && (
          <div className="absolute top-4 left-4 bg-primary/90 text-primary-foreground px-3 py-2 rounded-md shadow-lg">
            <p className="text-xs font-mono flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              DISTANCE SCANNER ACTIVE
            </p>
          </div>
        )}
      </div>

      {/* Enhanced Controls */}
      {showControls && (
        <div className="mt-4 space-y-4">
          {/* Main Controls */}
          <div className="flex items-center space-x-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="w-5 h-5 mr-2" />
                Start Distance Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1">
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Scanner
              </Button>
            )}
          </div>

          {/* Zoom Control */}
          {isScanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Zoom Level</span>
                <span className="text-sm text-muted-foreground">{zoomLevel}x</span>
              </div>
              <div className="flex items-center space-x-2">
                <ZoomOut className="w-4 h-4" />
                <Slider
                  value={[zoomLevel]}
                  onValueChange={handleZoomChange}
                  min={1}
                  max={5}
                  step={0.1}
                  className="flex-1"
                />
                <ZoomIn className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Detection Stats */}
          {detectionStats.totalScans > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Detection Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Scans: {detectionStats.totalScans}</div>
                <div>Successful: {detectionStats.successfulScans}</div>
                <div>Success Rate: {Math.round((detectionStats.successfulScans / detectionStats.totalScans) * 100)}%</div>
                <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Status Messages */}
      {isScanning && (
        <p className="text-xs text-success mt-2">
          🔍 High-resolution distance scanner active - detects barcodes up to {maxDistance}m away
        </p>
      )}
    </div>
  );
}

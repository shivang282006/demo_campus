import React, { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle, Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrowserMultiFormatReader } from "@zxing/browser";

interface SimpleQRScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
}

export default function SimpleQRScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
}: SimpleQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });

  // Simple barcode validation - accept any text
  const validateBarcode = useCallback((scannedText: string): string | null => {
    const cleanText = scannedText.trim();
    
    // Accept any non-empty text as valid barcode
    if (cleanText.length > 0) {
      return cleanText;
    }
    
    return null;
  }, []);

  // Start ZXing-based scanning (no external APIs)
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      console.log("🚀 Starting QR Code scanner...");
      
      // Initialize ZXing reader
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error("Video element not available"));
            return;
          }

          const onLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            setCameraResolution({
              width: video.videoWidth,
              height: video.videoHeight
            });
            setIsInitialized(true);
            resolve();
          };

          const onError = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            reject(new Error("Failed to load video stream"));
          };

          video.addEventListener("loadedmetadata", onLoadedMetadata);
          video.addEventListener("error", onError);
        });
      }
      
      console.log("✅ Camera started successfully");
      
      // Start continuous scanning with proper interval
      scanIntervalRef.current = setInterval(async () => {
        if (!isScanning || !videoRef.current || !canvasRef.current) {
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }
          return;
        }
        
        try {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          
          if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;
          
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw current video frame to canvas
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Get image data for ZXing
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Try to decode QR code
          const result = await reader.decodeFromImageData(imageData);
          
          if (result) {
            const currentTime = Date.now();
            const timeSinceLastScan = currentTime - lastScanTime;
            
            // Debounce: prevent duplicate scans within 2 seconds
            if (timeSinceLastScan < 2000 && lastScannedText === result.getText()) {
              console.log("⏭️ Duplicate scan ignored");
              return;
            }
            
            console.log("🎯 QR Code detected! Scanned text:", result.getText());
            setLastScannedText(result.getText());
            setLastScanTime(currentTime);
            
            const validBarcode = validateBarcode(result.getText());
            
            if (validBarcode) {
              // Show success animation
              setShowSuccessAnimation(true);
              setTimeout(() => setShowSuccessAnimation(false), 1500);
              
              // Process the scan
              onBarcodeScanned(validBarcode);
              setScanError("");
              
              console.log("✅ QR Code scan successful:", validBarcode);
              return;
            } else {
              setScanError(`Scanned: "${result.getText()}" - Not recognized as valid QR code`);
              setTimeout(() => setScanError(""), 3000);
            }
          }
        } catch (error) {
          // ZXing throws errors when no code is found, which is normal
          // Only log actual errors
          if (error instanceof Error && !error.message.includes('No MultiFormat Readers') && !error.message.includes('NotFoundException')) {
            console.log("⚠️ Scan error:", error.message);
          }
        }
      }, 100); // Scan every 100ms
      
    } catch (error: any) {
      console.error("Failed to start QR scanner:", error);
      
      let errorMessage = "Failed to start QR Code scanner";
      
      if (error.message.includes("Permission denied") || error.message.includes("NotAllowedError")) {
        errorMessage = "Camera permission denied. Please allow camera access and try again.";
      } else if (error.message.includes("NotFoundError")) {
        errorMessage = "No camera found. Please check your camera connection.";
      } else if (error.message.includes("NotReadableError")) {
        errorMessage = "Camera is being used by another application.";
      } else if (error.message) {
        errorMessage = `Scanner error: ${error.message}`;
      }
      
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, lastScannedText, lastScanTime, validateBarcode, onBarcodeScanned, onError, onScanStart]);

  // Stop scanning
  const stopScanning = useCallback(async () => {
    try {
      // Clear scanning interval
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      
      // Reset ZXing reader
      if (readerRef.current) {
        readerRef.current.reset();
        readerRef.current = null;
      }
      
      console.log("✅ Scanner stopped successfully");
    } catch (error) {
      console.log("Error stopping scanner:", error);
    }
    
    setIsScanning(false);
    setIsInitialized(false);
    setScanError("");
    onScanStop?.();
  }, [onScanStop]);

  // Auto-start if enabled
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
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Scanner Container */}
      <div className="aspect-video rounded-lg overflow-hidden relative bg-muted border-2 border-border">
        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
        />
        
        {/* Hidden Canvas for ZXing processing */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />
        
        {/* Placeholder when not scanning */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">QR Code Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">
                Local processing - no external APIs required
              </p>
              {showControls && (
                <Button onClick={startScanning}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start QR Code Scanner
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanner Status */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Scan className="w-4 h-4" />
                <span>QR CODE SCANNER</span>
              </div>
              <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              <div>Status: {isScanning ? 'Active' : 'Inactive'}</div>
            </div>

            {/* Full-Frame Scanning Indicator */}
            <div className="absolute inset-0 pointer-events-none">
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
            </div>
            
            {/* Status text */}
            <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-primary/90 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-semibold text-primary-foreground whitespace-nowrap shadow-lg">
              {scannedBarcode ? `✓ Scanned: ${scannedBarcode}` : "📱 Show QR code in camera view"}
            </p>
          </div>
        )}

        {/* Success Animation */}
        {showSuccessAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            <div className="bg-green-500/90 backdrop-blur-sm px-6 py-4 rounded-lg text-white font-bold text-lg animate-bounce shadow-2xl">
              ✓ QR Code Detected!
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
        <div className="mt-4 space-y-2">
          <div className="flex items-center space-x-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Camera className="w-5 h-5 mr-2" />
                Start QR Code Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1">
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Scanner
              </Button>
            )}
          </div>
          
          {/* Test Button */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                console.log("🧪 Testing QR scanner with mock data...");
                const mockQR = "TEST_QR_CODE_12345";
                onBarcodeScanned(mockQR);
                setLastScannedText(mockQR);
                setShowSuccessAnimation(true);
                setTimeout(() => setShowSuccessAnimation(false), 1500);
              }}
              className="flex-1"
            >
              Test with Mock QR Code
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                console.log("🔍 Scanner Debug Info:");
                console.log("- Is scanning:", isScanning);
                console.log("- Is initialized:", isInitialized);
                console.log("- Reader ref:", readerRef.current);
                console.log("- Stream ref:", streamRef.current);
                console.log("- Scan interval:", scanIntervalRef.current);
                console.log("- Last scanned text:", lastScannedText);
                console.log("- Camera resolution:", cameraResolution);
                
                // Check video element details
                if (videoRef.current) {
                  console.log("📹 Video Element Details:");
                  console.log("- videoWidth:", videoRef.current.videoWidth);
                  console.log("- videoHeight:", videoRef.current.videoHeight);
                  console.log("- clientWidth:", videoRef.current.clientWidth);
                  console.log("- clientHeight:", videoRef.current.clientHeight);
                  console.log("- readyState:", videoRef.current.readyState);
                  console.log("- networkState:", videoRef.current.networkState);
                  console.log("- currentTime:", videoRef.current.currentTime);
                  console.log("- duration:", videoRef.current.duration);
                  console.log("- paused:", videoRef.current.paused);
                  console.log("- muted:", videoRef.current.muted);
                  console.log("- autoplay:", videoRef.current.autoplay);
                } else {
                  console.log("❌ No video element found");
                }
                
                // Check canvas element
                if (canvasRef.current) {
                  console.log("🎨 Canvas Element Details:");
                  console.log("- width:", canvasRef.current.width);
                  console.log("- height:", canvasRef.current.height);
                  console.log("- clientWidth:", canvasRef.current.clientWidth);
                  console.log("- clientHeight:", canvasRef.current.clientHeight);
                } else {
                  console.log("❌ No canvas element found");
                }
                
                // Check ZXing library
                try {
                  const reader = new BrowserMultiFormatReader();
                  console.log("✅ ZXing library loaded successfully");
                  console.log("- Reader instance:", reader);
                } catch (error) {
                  console.log("❌ ZXing library error:", error);
                }
                
                // Check camera permissions
                navigator.mediaDevices.getUserMedia({ video: true })
                  .then(stream => {
                    console.log("✅ Camera permission granted");
                    const track = stream.getVideoTracks()[0];
                    if (track) {
                      const settings = track.getSettings();
                      console.log("📷 Camera settings:", settings);
                      track.stop();
                    }
                  })
                  .catch(err => {
                    console.log("❌ Camera permission denied or error:", err);
                  });
              }}
              className="flex-1"
            >
              Debug Info
            </Button>
          </div>
        </div>
      )}
      
      {/* Status Messages */}
      {isScanning && (
        <p className="text-xs text-success mt-2">
          📱 QR Code scanner active - local processing, no external APIs required
        </p>
      )}
      
      {/* Debug Info */}
      {lastScannedText && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg border">
          <p className="text-xs text-muted-foreground mb-1">Last Scanned Content:</p>
          <p className="text-sm font-mono text-foreground break-all">{lastScannedText}</p>
        </div>
      )}
    </div>
  );
}

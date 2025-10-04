import React, { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle, Camera, CameraOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import useCameraMirror from "@/hooks/use-camera-mirror";

interface ZXingBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
  scanInterval?: number;
  showDebugInfo?: boolean;
}

export default function ZXingBarcodeScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
  scanInterval = 100, // Scan every 100ms
  showDebugInfo = false,
}: ZXingBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const readerRef = useRef<any>(null);

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

  // Initialize ZXing reader
  const initializeZXing = useCallback(async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      
      if (showDebugInfo) {
        console.log("ZXing reader initialized:", reader);
      }
      
      return reader;
    } catch (error) {
      console.error("Failed to initialize ZXing:", error);
      throw new Error("Failed to load barcode reader library");
    }
  }, [showDebugInfo]);

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

  // Process frame for barcode detection
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !readerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Try to decode barcode from the entire frame
      const result = await readerRef.current.decodeFromImageData(imageData);
      
      if (result) {
        const currentTime = Date.now();
        const timeSinceLastScan = currentTime - lastScanTime;
        
        // Debounce: prevent duplicate scans within 1 second
        if (timeSinceLastScan < 1000 && lastScannedText === result.getText()) {
          return;
        }
        
        if (showDebugInfo) {
          console.log("🎯 ZXing barcode detected:", result.getText());
        }
        
        setLastScannedText(result.getText());
        setLastScanTime(currentTime);
        setScanStats(prev => ({
          ...prev,
          totalScans: prev.totalScans + 1
        }));
        
        const validBarcode = validateBarcode(result.getText());
        
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
          
          if (showDebugInfo) {
            console.log("✅ ZXing scan successful:", validBarcode);
          }
        } else {
          setScanError(`Scanned: "${result.getText()}" - Not recognized as valid barcode`);
          setTimeout(() => setScanError(""), 2000);
        }
      }
    } catch (error) {
      // Ignore decoding errors - they're expected when no barcode is present
      if (showDebugInfo && error instanceof Error && !error.message.includes('No MultiFormat Readers')) {
        console.log("ZXing decode error:", error.message);
      }
    }
  }, [lastScannedText, lastScanTime, validateBarcode, onBarcodeScanned, showDebugInfo]);

  // Start scanning
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      // Initialize ZXing
      await initializeZXing();

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "environment",
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false,
      });

      streamRef.current = stream;

      // Attach stream to video element
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
            
            // Set camera resolution
            setCameraResolution({
              width: video.videoWidth,
              height: video.videoHeight
            });
            
            // Initialize mirror detection
            initializeMirror(mediaStream);
            
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

        // Start continuous scanning
        scanIntervalRef.current = setInterval(processFrame, scanInterval);
      }
      
    } catch (error: any) {
      console.error("Failed to start ZXing scanner:", error);
      const errorMessage = `Failed to start scanner: ${error.message || error}`;
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, initializeZXing, processFrame, scanInterval, onScanStart, onError]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (readerRef.current) {
      readerRef.current.reset();
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
      stopScanning();
    };
  }, [stopScanning]);

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
          className="w-full h-full object-cover"
        />

        {/* Hidden Canvas for Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Placeholder when not scanning */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Zap className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">ZXing Barcode Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">
                Advanced full-frame barcode detection
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

        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanner Status */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" />
                <span>ZXING SCANNER</span>
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
                <div className="absolute inset-x-0 top-1/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute inset-x-0 top-2/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.6s'}}></div>
                <div className="absolute inset-x-0 top-5/6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.8s'}}></div>
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
          🔍 ZXing scanner active - processes entire camera frame continuously
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

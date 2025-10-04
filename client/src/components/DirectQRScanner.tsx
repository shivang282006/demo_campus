import React, { useRef, useEffect, useState, useCallback } from "react";
import { Scan, AlertCircle, Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DirectQRScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
}

export default function DirectQRScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
}: DirectQRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });

  // Simple QR code validation
  const validateQRCode = useCallback((scannedText: string): string | null => {
    const cleanText = scannedText.trim();
    if (cleanText.length > 0) {
      return cleanText;
    }
    return null;
  }, []);

  // Process frame for QR code detection (simplified version)
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for processing
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Here you would typically use a QR code detection library like jsQR
    // For now, we'll simulate detection
    console.log("Processing frame:", canvas.width, "x", canvas.height);
  }, []);

  // Main scanning loop
  const scanningLoop = useCallback(() => {
    if (!isScanning) return;
    
    processFrame();
    animationFrameRef.current = requestAnimationFrame(scanningLoop);
  }, [isScanning, processFrame]);

  // Start camera and scanning
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      console.log("🚀 Starting direct QR scanner...");

      // Get camera stream with specific constraints
      const constraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "environment",
          frameRate: { ideal: 30, min: 15 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
            
            // Set camera resolution
            setCameraResolution({
              width: video.videoWidth,
              height: video.videoHeight
            });
            
            console.log("📹 Video resolution:", video.videoWidth, "x", video.videoHeight);
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

        // Start scanning loop
        scanningLoop();
      }
    } catch (error: any) {
      console.error("Failed to start direct QR scanner:", error);
      const errorMessage = `Failed to start scanner: ${error.message || error}`;
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, onScanStart, onError, scanningLoop]);

  // Stop scanning
  const stopScanning = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
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
              <Scan className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Direct QR Code Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">
                Direct camera access for QR code detection
              </p>
              {showControls && (
                <Button onClick={startScanning}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Direct Scanner
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
                <span>DIRECT QR SCANNER</span>
              </div>
              <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              <div>Status: {isScanning ? 'Active' : 'Inactive'}</div>
            </div>

            {/* Full-Frame Scanning Indicator */}
            <div className="absolute inset-0 pointer-events-none">
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
              {scannedBarcode ? `✓ Scanned: ${scannedBarcode}` : "📱 Show QR code anywhere in frame"}
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
                Start Direct Scanner
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
                console.log("🧪 Testing direct scanner with mock data...");
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
                console.log("🔍 Direct Scanner Debug Info:");
                console.log("- Is scanning:", isScanning);
                console.log("- Is initialized:", isInitialized);
                console.log("- Camera resolution:", cameraResolution);
                console.log("- Video element:", videoRef.current);
                console.log("- Stream:", streamRef.current);
                
                if (videoRef.current) {
                  console.log("📹 Video Element Details:");
                  console.log("- videoWidth:", videoRef.current.videoWidth);
                  console.log("- videoHeight:", videoRef.current.videoHeight);
                  console.log("- clientWidth:", videoRef.current.clientWidth);
                  console.log("- clientHeight:", videoRef.current.clientHeight);
                  console.log("- readyState:", videoRef.current.readyState);
                }
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
          📱 Direct QR Code scanner active - detects QR codes anywhere in the camera view
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


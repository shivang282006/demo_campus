import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { Scan, AlertCircle, Camera, CameraOff, Zap, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import SimpleQRScanner from "./SimpleQRScanner";

interface OptimizedBarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
  onError?: (error: string) => void;
  onScanStart?: () => void;
  onScanStop?: () => void;
  scannedBarcode?: string;
  className?: string;
  showControls?: boolean;
  autoStart?: boolean;
  targetFPS?: number;
  enableROI?: boolean;
  enableWorker?: boolean;
}

export default function OptimizedBarcodeScanner({
  onBarcodeScanned,
  onError,
  onScanStart,
  onScanStop,
  scannedBarcode,
  className = "",
  showControls = true,
  autoStart = false,
  targetFPS = 10,
  enableROI = true,
  enableWorker = true,
}: OptimizedBarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastProcessTimeRef = useRef<number>(0);
  const requestIdRef = useRef<number>(0);

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string>("");
  const [lastScannedText, setLastScannedText] = useState<string>("");
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });
  const [scanStats, setScanStats] = useState({
    totalFrames: 0,
    processedFrames: 0,
    successfulScans: 0,
    averageProcessTime: 0,
    fps: 0,
  });
  const [settings, setSettings] = useState({
    targetFPS,
    enableROI,
    enableWorker,
    zoom: 1,
    brightness: 0,
    contrast: 0,
  });
  const [useFallback, setUseFallback] = useState(false);

  // Initialize Web Worker
  const initializeWorker = useCallback(() => {
    if (!enableWorker || workerRef.current) return;

    try {
      const worker = new Worker(new URL('../workers/barcodeWorker.ts', import.meta.url), {
        type: 'module'
      });
      
      worker.onmessage = (e) => {
        const { requestId, success, result, error } = e.data;
        
        if (success && result) {
          const currentTime = Date.now();
          const timeSinceLastScan = currentTime - lastScanTime;
          
          // Debounce: prevent duplicate scans within 1 second
          if (timeSinceLastScan < 1000 && lastScannedText === result) {
            return;
          }
          
          console.log("🎯 Optimized barcode detected:", result);
          setLastScannedText(result);
          setLastScanTime(currentTime);
          
          // Show success animation
          setShowSuccessAnimation(true);
          setTimeout(() => setShowSuccessAnimation(false), 1000);
          
          // Process the scan
          onBarcodeScanned(result);
          setScanError("");
          
          // Update stats
          setScanStats(prev => ({
            ...prev,
            successfulScans: prev.successfulScans + 1
          }));
        } else if (error) {
          console.log("Worker error:", error);
        }
      };
      
      worker.onerror = (error) => {
        console.error("Worker error:", error);
        setScanError("Barcode processing error");
        setUseFallback(true); // Switch to fallback on worker error
      };
      
      workerRef.current = worker;
    } catch (error) {
      console.error("Failed to initialize worker:", error);
      setScanError("Failed to initialize barcode processor");
      setUseFallback(true); // Switch to fallback on worker error
    }
  }, [enableWorker, lastScannedText, lastScanTime, onBarcodeScanned]);

  // Cleanup Web Worker
  const cleanupWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // Get optimal camera settings
  const getOptimalCameraSettings = useCallback(async () => {
    const constraints = {
      video: {
        width: { ideal: 3840, min: 1920 }, // 4K preferred, Full HD minimum
        height: { ideal: 2160, min: 1080 },
        facingMode: "environment",
        frameRate: { ideal: 30, min: 15 },
        // Advanced camera controls
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
      },
      audio: false,
    };

    try {
      // Try to get the highest resolution available
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      return stream;
    } catch (error) {
      console.warn("High resolution not available, falling back to lower resolution");
      // Fallback to lower resolution
      const fallbackConstraints = {
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "environment",
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      };
      return navigator.mediaDevices.getUserMedia(fallbackConstraints);
    }
  }, []);

  // Process frame for barcode detection
  const processFrame = useCallback(async (video: HTMLVideoElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Apply image enhancements
    context.filter = `
      brightness(${100 + settings.brightness}%) 
      contrast(${100 + settings.contrast}%)
    `;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    // Update stats
    setScanStats(prev => ({
      ...prev,
      totalFrames: prev.totalFrames + 1
    }));

    if (enableWorker && workerRef.current) {
      // Use Web Worker for processing
      const requestId = ++requestIdRef.current;
      workerRef.current.postMessage({
        imageData,
        requestId,
        enableROI: settings.enableROI
      });
    } else {
      // Fallback to direct processing (not implemented in this example)
      console.log("Direct processing not implemented, use Web Worker");
    }
  }, [settings, enableWorker]);

  // Main scanning loop with frame skipping
  const scanningLoop = useCallback(() => {
    if (!isScanning || !videoRef.current) return;

    const now = Date.now();
    const timeSinceLastProcess = now - lastProcessTimeRef.current;
    const targetInterval = 1000 / settings.targetFPS; // Convert FPS to interval

    if (timeSinceLastProcess >= targetInterval) {
      const startTime = performance.now();
      
      processFrame(videoRef.current).then(() => {
        const processTime = performance.now() - startTime;
        
        // Update stats
        setScanStats(prev => ({
          ...prev,
          processedFrames: prev.processedFrames + 1,
          averageProcessTime: (prev.averageProcessTime + processTime) / 2,
          fps: Math.round(1000 / (now - lastProcessTimeRef.current))
        }));
        
        lastProcessTimeRef.current = now;
      });
    }

    // Continue the loop
    animationFrameRef.current = requestAnimationFrame(scanningLoop);
  }, [isScanning, settings.targetFPS, processFrame]);

  // Start optimized scanning
  const startScanning = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    setScanError("");
    onScanStart?.();

    try {
      // Initialize worker
      initializeWorker();

      // Get camera stream
      const stream = await getOptimalCameraSettings();
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
        lastProcessTimeRef.current = Date.now();
        scanningLoop();
      }
    } catch (error: any) {
      console.error("Failed to start optimized scanner:", error);
      const errorMessage = `Failed to start scanner: ${error.message || error}`;
      setScanError(errorMessage);
      onError?.(errorMessage);
      setIsScanning(false);
    }
  }, [isScanning, initializeWorker, getOptimalCameraSettings, scanningLoop, onScanStart, onError]);

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

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<typeof settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

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
      cleanupWorker();
    };
  }, [stopScanning, cleanupWorker]);

  // Use fallback scanner if worker failed or disabled
  if (useFallback || !enableWorker) {
    return (
      <div className={`relative ${className}`}>
        <SimpleQRScanner
          onBarcodeScanned={onBarcodeScanned}
          onError={onError}
          onScanStart={onScanStart}
          onScanStop={onScanStop}
          scannedBarcode={scannedBarcode}
          showControls={showControls}
          autoStart={autoStart}
          className="w-full"
        />
        
        {/* Fallback Notice */}
        <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs text-yellow-800">
          Using fallback scanner (Web Worker not available)
        </div>
      </div>
    );
  }

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
              <p className="text-muted-foreground mb-2">Optimized Barcode Scanner</p>
              <p className="text-sm text-muted-foreground mb-4">
                High-resolution • Frame skipping • Web Worker • ROI detection
              </p>
              {showControls && (
                <Button onClick={startScanning}>
                  <Camera className="w-5 h-5 mr-2" />
                  Start Optimized Scanner
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Scanning Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Performance Stats */}
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" />
                <span>OPTIMIZED SCANNER</span>
              </div>
              <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              <div>FPS: {scanStats.fps}</div>
              <div>Processed: {scanStats.processedFrames}/{scanStats.totalFrames}</div>
            </div>

            {/* Settings Display */}
            <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
              <div className="flex items-center gap-2 mb-1">
                <Settings className="w-4 h-4" />
                <span>SETTINGS</span>
              </div>
              <div>Target FPS: {settings.targetFPS}</div>
              <div>ROI: {settings.enableROI ? 'ON' : 'OFF'}</div>
              <div>Worker: {settings.enableWorker ? 'ON' : 'OFF'}</div>
            </div>

            {/* Scanning Indicator */}
            <div className="absolute inset-0 border-2 border-dashed border-primary/30 rounded-lg">
              {/* Corner indicators */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-primary animate-pulse"></div>
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-primary animate-pulse"></div>
              
              {/* Enhanced scanning lines */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-x-0 top-1/6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse"></div>
                <div className="absolute inset-x-0 top-1/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.4s'}}></div>
                <div className="absolute inset-x-0 top-2/3 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.6s'}}></div>
                <div className="absolute inset-x-0 top-5/6 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" style={{animationDelay: '0.8s'}}></div>
              </div>
              
              {/* Center indicator */}
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
              ⚡ Instant Detection!
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

      {/* Enhanced Controls */}
      {showControls && (
        <div className="mt-4 space-y-4">
          {/* Main Controls */}
          <div className="flex items-center space-x-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1">
                <Zap className="w-5 h-5 mr-2" />
                Start Optimized Scanner
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="destructive" className="flex-1">
                <CameraOff className="w-5 h-5 mr-2" />
                Stop Scanner
              </Button>
            )}
          </div>

          {/* Performance Settings */}
          {isScanning && (
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium">Performance Settings</h4>
              
              {/* Target FPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Target FPS</span>
                  <Badge variant="outline">{settings.targetFPS}</Badge>
                </div>
                <Slider
                  value={[settings.targetFPS]}
                  onValueChange={(value) => updateSettings({ targetFPS: value[0] })}
                  min={5}
                  max={30}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Features */}
              <div className="flex items-center space-x-4">
                <Button
                  variant={settings.enableROI ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings({ enableROI: !settings.enableROI })}
                >
                  ROI Detection
                </Button>
                <Button
                  variant={settings.enableWorker ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateSettings({ enableWorker: !settings.enableWorker })}
                >
                  Web Worker
                </Button>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          {scanStats.totalFrames > 0 && (
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-sm font-medium mb-2">Performance Statistics</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Frames: {scanStats.totalFrames}</div>
                <div>Processed: {scanStats.processedFrames}</div>
                <div>Success Rate: {Math.round((scanStats.successfulScans / scanStats.processedFrames) * 100)}%</div>
                <div>Avg Process Time: {Math.round(scanStats.averageProcessTime)}ms</div>
                <div>Current FPS: {scanStats.fps}</div>
                <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Status Messages */}
      {isScanning && (
        <p className="text-xs text-success mt-2">
          ⚡ Optimized scanner active - instant detection with high resolution and frame skipping
        </p>
      )}
    </div>
  );
}

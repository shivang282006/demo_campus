import { useRef, useEffect, useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebcam } from "@/hooks/use-webcam";
import { createWorker } from "tesseract.js";

interface WebcamFeedProps {
  onPlateDetected: (plateNumber: string) => void;
  detectedPlate?: string;
}

export default function WebcamFeed({ onPlateDetected, detectedPlate }: WebcamFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  const [ocrWorker, setOcrWorker] = useState<any>(null);
  const [isOcrReady, setIsOcrReady] = useState(false);
  const [lastOcrText, setLastOcrText] = useState<string>("");
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [ocrError, setOcrError] = useState<string>("");
  const [continuousScanning, setContinuousScanning] = useState(false);
  const [simpleMode, setSimpleMode] = useState(false);
  
  const { videoRef, isStreaming, startStream, stopStream, captureFrame } = useWebcam();

  // Initialize OCR worker with optimized settings
  useEffect(() => {
    const initOcr = async () => {
      try {
        console.log("Starting OCR worker initialization...");
        setOcrError("");
        
        const worker = await createWorker('eng', 1, {
          logger: m => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        // Configure OCR with more flexible settings
        if (!simpleMode) {
          await worker.setParameters({
            tessedit_pageseg_mode: '6', // Uniform block of text
            tessedit_ocr_engine_mode: '1', // LSTM only
          });
        } else {
          // Simple mode - use default settings
          console.log("Using simple OCR mode with default settings");
        }
        
        console.log("OCR worker created and configured...");
        setOcrWorker(worker);
        setIsOcrReady(true);
        setOcrError("");
        console.log("OCR worker initialized successfully");
      } catch (error) {
        console.error("Failed to initialize OCR worker:", error);
        setIsOcrReady(false);
        setOcrError(`OCR initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    initOcr();

    return () => {
      if (ocrWorker) {
        console.log("Terminating OCR worker...");
        ocrWorker.terminate();
      }
    };
  }, []);

  // Image preprocessing for better OCR (simplified)
  const preprocessImage = useCallback((canvas: HTMLCanvasElement): string => {
    // For now, return the original image without preprocessing
    // This will help us debug if preprocessing was causing issues
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Validate plate number format
  const validatePlateNumber = useCallback((plateNumber: string): boolean => {
    if (!plateNumber || plateNumber.trim().length < 6) return false;
    
    // Common Indian license plate patterns (more flexible)
    const patterns = [
      /^[A-Z]{2}[- ]?\d{2}[- ]?[A-Z]{2}[- ]?\d{3,4}$/i,  // MH-02-AB-1234, MH02AB1234, MH 02 AB 1234
      /^[A-Z]{2}\d{2}[A-Z]{2}\d{3,4}$/i,                 // MH02AB1234, MH02AB123
      /^[A-Z]{2}\s\d{2}\s[A-Z]{2}\s\d{3,4}$/i,           // MH 02 AB 1234
      /^[A-Z]{2}-\d{2}-[A-Z]{2}-\d{3,4}$/i,              // MH-02-AB-1234
      /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/i,                   // MH02AB1234 (exact 4 digits)
      /^[A-Z]{2}\d{2}[A-Z]{2}\d{3}$/i,                   // MH02AB123 (exact 3 digits)
    ];
    
    const cleanPlate = plateNumber.trim().toUpperCase();
    const isValid = patterns.some(pattern => pattern.test(cleanPlate));
    
    console.log("Validating plate:", cleanPlate, "Result:", isValid);
    return isValid;
  }, []);

  // Simulate plate detection for demo purposes (only when explicitly enabled)
  const simulatePlateDetection = useCallback(() => {
    if (!simulationMode) return;
    
    const mockPlates = ["MH-02-AB-1234", "MH-02-CD-5678", "MH-02-EF-3456", "MH-02-GH-7890"];
    const randomPlate = mockPlates[Math.floor(Math.random() * mockPlates.length)];
    
    setIsProcessing(true);
    setTimeout(() => {
      onPlateDetected(randomPlate);
      setIsProcessing(false);
    }, 2000);
  }, [simulationMode, onPlateDetected]);

  // Real plate detection implementation using OCR
  const detectPlate = useCallback(async () => {
    if (!videoRef.current || isProcessing) {
      console.log("Cannot detect plate: video not ready or already processing");
      return;
    }

    console.log("Starting plate detection...");
    setIsProcessing(true);
    
    try {
      if (simulationMode) {
        // Only use simulation when explicitly enabled
        console.log("Using simulation mode");
        simulatePlateDetection();
        return;
      }

      // Check if OCR is ready
      if (!isOcrReady || !ocrWorker) {
        console.log("OCR not ready yet - isOcrReady:", isOcrReady, "ocrWorker:", !!ocrWorker);
        setIsProcessing(false);
        return;
      }

      console.log("OCR is ready, capturing frame...");

      // Convert frame to canvas for OCR processing
      const canvas = canvasRef.current;
      if (!canvas) {
        console.error("Canvas not available");
        setIsProcessing(false);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error("Canvas context not available");
        setIsProcessing(false);
        return;
      }

      // Set canvas size to match video frame
      const videoWidth = videoRef.current.videoWidth;
      const videoHeight = videoRef.current.videoHeight;
      
      console.log("Video dimensions:", videoWidth, "x", videoHeight);
      
      if (videoWidth === 0 || videoHeight === 0) {
        console.error("Invalid video dimensions");
        setIsProcessing(false);
        return;
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Draw the video frame to canvas
      ctx.drawImage(videoRef.current, 0, 0, videoWidth, videoHeight);

      // Try OCR with original image first
      const originalImageData = canvas.toDataURL('image/jpeg', 0.8);
      console.log("Original image data length:", originalImageData.length);

      // Perform OCR on the original image
      console.log("Starting OCR recognition...");
      const result = await ocrWorker.recognize(originalImageData);
      const text = result.data.text;
      
      console.log("OCR result:", result);
      console.log("OCR detected text:", text);
      console.log("Text length:", text ? text.length : 0);
      setLastOcrText(text);

      if (!text || text.trim().length === 0) {
        console.log("No text detected by OCR with original image");
        
        // Try with preprocessed image as fallback
        console.log("Trying with preprocessed image...");
        const processedImageData = preprocessImage(canvas);
        const fallbackResult = await ocrWorker.recognize(processedImageData);
        const fallbackText = fallbackResult.data.text;
        
        console.log("Fallback OCR result:", fallbackText);
        setLastOcrText(fallbackText);
        
        if (!fallbackText || fallbackText.trim().length === 0) {
          console.log("No text detected with either method");
          setIsProcessing(false);
          return;
        }
        
        // Use fallback text
        const lines = fallbackText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        console.log("Fallback OCR lines:", lines);
        
        for (const line of lines) {
          const cleanLine = line.replace(/[^A-Z0-9\s-]/gi, '').trim();
          console.log("Checking fallback line:", cleanLine);
          
          if (validatePlateNumber(cleanLine)) {
            console.log("Valid license plate detected from fallback:", cleanLine);
            onPlateDetected(cleanLine);
            setIsProcessing(false);
            return;
          }
        }
        
        console.log("No valid plate found in fallback OCR");
        setIsProcessing(false);
        return;
      }

      // Extract potential license plate numbers from the OCR text
      const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      console.log("OCR lines:", lines);
      
      for (const line of lines) {
        // Clean the line and check if it matches license plate patterns
        const cleanLine = line.replace(/[^A-Z0-9\s-]/gi, '').trim();
        console.log("Checking line:", cleanLine);
        
        if (validatePlateNumber(cleanLine)) {
          console.log("Valid license plate detected:", cleanLine);
          onPlateDetected(cleanLine);
          setIsProcessing(false);
          return;
        }
      }

      // If no valid plate found, try to extract from the entire text
      const allText = text.replace(/\s+/g, ' ').trim();
      console.log("All text:", allText);
      
      const plateMatch = allText.match(/([A-Z]{2}[- ]?\d{2}[- ]?[A-Z]{2}[- ]?\d{3,4})/gi);
      console.log("Plate matches:", plateMatch);
      
      if (plateMatch && plateMatch.length > 0) {
        const potentialPlate = plateMatch[0].replace(/[- ]/g, '');
        console.log("Potential plate:", potentialPlate);
        
        if (validatePlateNumber(potentialPlate)) {
          console.log("Valid license plate extracted:", potentialPlate);
          onPlateDetected(potentialPlate);
          setIsProcessing(false);
          return;
        }
      }

      console.log("No valid license plate detected in current frame");
      setIsProcessing(false);
      
    } catch (error) {
      console.error("Plate detection error:", error);
      setOcrError(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
    }
  }, [videoRef, captureFrame, isProcessing, simulatePlateDetection, simulationMode, isOcrReady, ocrWorker, validatePlateNumber, onPlateDetected]);

  // Auto-detect plates periodically when streaming
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      if (!detectedPlate && !isProcessing) {
        detectPlate();
      }
    }, simulationMode ? 3000 : (continuousScanning ? 2000 : 5000)); // Faster scanning

    return () => clearInterval(interval);
  }, [isStreaming, detectPlate, detectedPlate, isProcessing, simulationMode, continuousScanning]);

  // Continuous scanning mode
  useEffect(() => {
    if (!continuousScanning || !isStreaming || detectedPlate) return;

    const interval = setInterval(() => {
      if (!isProcessing) {
        detectPlate();
      }
    }, 1000); // Very fast continuous scanning

    return () => clearInterval(interval);
  }, [continuousScanning, isStreaming, detectedPlate, isProcessing, detectPlate]);

  // Reinitialize OCR when mode changes
  useEffect(() => {
    if (ocrWorker) {
      console.log("Mode changed, reinitializing OCR...");
      ocrWorker.terminate();
      setOcrWorker(null);
      setIsOcrReady(false);
      
      // Reinitialize with new mode
      const initOcr = async () => {
        try {
          console.log("Reinitializing OCR with simple mode:", simpleMode);
          setOcrError("");
          
          const worker = await createWorker('eng', 1, {
            logger: m => {
              if (m.status === 'recognizing text') {
                console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
              }
            }
          });
          
          if (!simpleMode) {
            await worker.setParameters({
              tessedit_pageseg_mode: '6',
              tessedit_ocr_engine_mode: '1',
            });
          }
          
          setOcrWorker(worker);
          setIsOcrReady(true);
          setOcrError("");
          console.log("OCR reinitialized successfully");
        } catch (error) {
          console.error("Failed to reinitialize OCR worker:", error);
          setIsOcrReady(false);
          setOcrError(`OCR reinitialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };

      initOcr();
    }
  }, [simpleMode]);

  // Expose test function to global scope for debugging
  useEffect(() => {
    (window as any).testOCR = () => {
      console.log("Testing OCR functionality...");
      console.log("OCR Ready:", isOcrReady);
      console.log("OCR Worker:", !!ocrWorker);
      console.log("Video Ready:", !!videoRef.current);
      console.log("Video Dimensions:", videoRef.current?.videoWidth, "x", videoRef.current?.videoHeight);
      console.log("Simple Mode:", simpleMode);
      
      if (isOcrReady && ocrWorker && videoRef.current) {
        detectPlate();
      } else {
        console.log("OCR not ready for testing");
      }
    };
  }, [isOcrReady, ocrWorker, videoRef, detectPlate, simpleMode]);

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
          data-testid="video-feed"
        />
        
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <div className="text-center">
              <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Camera feed not active</p>
              <Button onClick={startStream} data-testid="button-start-camera">
                Start Camera
              </Button>
            </div>
          </div>
        )}

        {/* Live feed overlay */}
        {isStreaming && (
          <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-md">
            <p className="text-xs text-white font-mono">REC {new Date().toLocaleTimeString()}</p>
          </div>
        )}

        {/* Vehicle detection overlay */}
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanning area indicator - now covers more area */}
            <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-2 border-primary rounded-lg opacity-50">
              {detectedPlate && (
                <div className="absolute -top-8 left-0 bg-primary px-2 py-1 rounded text-xs font-semibold text-primary-foreground">
                  {detectedPlate}
                </div>
              )}
            </div>
            
            {/* Scanning mode indicator */}
            {!detectedPlate && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-primary px-3 py-1 rounded text-sm font-semibold text-primary-foreground">
                {simulationMode ? "Auto-scanning..." : 
                 continuousScanning ? "Continuous scanning..." : 
                 "Position vehicle anywhere in view"}
              </div>
            )}
            
            {/* Scanning area hint */}
            {!detectedPlate && !simulationMode && (
              <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border border-primary/30 rounded-lg flex items-center justify-center">
                <div className="bg-primary/20 px-2 py-1 rounded text-xs text-primary-foreground">
                  Scan Area
                </div>
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <div className="bg-primary px-4 py-2 rounded-lg text-primary-foreground font-medium">
              Processing...
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="mt-4 flex items-center space-x-2">
        <Button
          onClick={detectPlate}
          disabled={!isStreaming || isProcessing || (!isOcrReady && !simulationMode)}
          className="flex-1"
          data-testid="button-detect-plate"
        >
          <Camera className="w-5 h-5 mr-2" />
          {isProcessing ? "Processing..." : 
           !isOcrReady && !simulationMode ? "Loading OCR..." : 
           "Detect Plate"}
        </Button>
        
        <Button
          variant="outline"
          onClick={simulationMode ? () => setSimulationMode(false) : () => setSimulationMode(true)}
          data-testid="button-simulation-mode"
        >
          {simulationMode ? "Disable" : "Enable"} Demo Mode
        </Button>
        
        {!simulationMode && isOcrReady && (
          <Button
            variant="outline"
            onClick={() => setContinuousScanning(!continuousScanning)}
            data-testid="button-continuous-scan"
            className={continuousScanning ? "bg-primary text-primary-foreground" : ""}
          >
            {continuousScanning ? "Stop" : "Start"} Continuous
          </Button>
        )}
        
        {!simulationMode && isOcrReady && (
          <Button
            variant="outline"
            onClick={() => setSimpleMode(!simpleMode)}
            data-testid="button-simple-mode"
            className={simpleMode ? "bg-primary text-primary-foreground" : ""}
          >
            {simpleMode ? "Advanced" : "Simple"} Mode
          </Button>
        )}
        
        {!simulationMode && isOcrReady && (
          <Button
            variant="outline"
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            data-testid="button-debug-toggle"
          >
            {showDebugInfo ? "Hide" : "Show"} Debug
          </Button>
        )}
        
        {isStreaming ? (
          <Button variant="outline" onClick={stopStream} data-testid="button-stop-camera">
            Stop
          </Button>
        ) : (
          <Button variant="outline" onClick={startStream} data-testid="button-start-camera">
            Start
          </Button>
        )}
      </div>
      
      {simulationMode && (
        <div className="mt-2 p-2 bg-warning/10 border border-warning/20 rounded-lg">
          {/* <p className="text-xs text-warning font-medium">
            ⚠️ Demo mode active - generating random vehicle numbers for testing
          </p>
          <p className="text-xs text-warning/80 mt-1">
            Disable demo mode for real camera-based detection
          </p> */}
        </div>
      )}
      
      {!simulationMode && (
        <div className="mt-2 p-2 bg-info/10 border border-info/20 rounded-lg">
          {/* <p className="text-xs text-info font-medium">
            📷 Real camera mode - Fast scanning with image preprocessing
          </p> */}
          <p className="text-xs text-info/80 mt-1">
            Position vehicle anywhere in the camera view - no need to align with the box
          </p>
          {!isOcrReady && !ocrError && (
            <p className="text-xs text-warning/80 mt-1">
              {/* ⏳ OCR engine is loading... Please wait */}
            </p>
          )}
          {isOcrReady && !ocrError && (
            <p className="text-xs text-success/80 mt-1">
              {/* ✅ OCR engine ready - Fast scanning enabled */}
            </p>
          )}
          {ocrError && (
            <p className="text-xs text-destructive/80 mt-1">
              ❌ {ocrError}
            </p>
          )}
          
          {continuousScanning && (
            <p className="text-xs text-warning/80 mt-1">
              🔄 Continuous scanning active - Detecting plates every second
            </p>
          )}
          
          {simpleMode && (
            <p className="text-xs text-info/80 mt-1">
              🔧 Simple mode active - Using basic OCR settings for better compatibility
            </p>
          )}
          
          {/* Debug section */}
          {showDebugInfo && (
            <div className="mt-2 pt-2 border-t border-info/20">
              <div className="p-2 bg-black/5 rounded text-xs font-mono">
                <p className="text-muted-foreground mb-1">Last OCR Result:</p>
                <p className="break-all">{lastOcrText || "No text detected"}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

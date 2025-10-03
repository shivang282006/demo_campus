import { useRef, useEffect, useState, useCallback } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWebcam } from "@/hooks/use-webcam";

interface WebcamFeedProps {
  onPlateDetected: (plateNumber: string) => void;
  detectedPlate?: string;
}

export default function WebcamFeed({ onPlateDetected, detectedPlate }: WebcamFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulationMode, setSimulationMode] = useState(false);
  
  const { videoRef, isStreaming, startStream, stopStream, captureFrame } = useWebcam();

  // Simulate plate detection for demo purposes
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

  // Real plate detection would be implemented here
  const detectPlate = useCallback(async () => {
    if (!videoRef.current || isProcessing) return;

    setIsProcessing(true);
    
    try {
      // Capture current frame
      const frame = captureFrame();
      if (!frame) {
        setIsProcessing(false);
        return;
      }

      // In a real implementation, you would:
      // 1. Send frame to OCR service (like Google Vision API, AWS Textract)
      // 2. Process the response for license plate patterns
      // 3. Validate the detected text against plate number formats
      
      // For now, use simulation mode
      if (simulationMode) {
        simulatePlateDetection();
      } else {
        console.log("Real OCR processing would happen here");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Plate detection error:", error);
      setIsProcessing(false);
    }
  }, [videoRef, captureFrame, isProcessing, simulatePlateDetection, simulationMode]);

  // Auto-detect plates periodically when streaming
  useEffect(() => {
    if (!isStreaming || !simulationMode) return;

    const interval = setInterval(() => {
      if (!detectedPlate && !isProcessing) {
        detectPlate();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isStreaming, detectPlate, detectedPlate, isProcessing, simulationMode]);

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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-48 border-2 border-primary rounded-lg">
              {detectedPlate && (
                <div className="absolute -top-8 left-0 bg-primary px-2 py-1 rounded text-xs font-semibold text-primary-foreground">
                  {detectedPlate}
                </div>
              )}
            </div>
            {!detectedPlate && (
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-primary px-3 py-1 rounded text-sm font-semibold text-primary-foreground">
                Scanning for vehicles...
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
          disabled={!isStreaming || isProcessing}
          className="flex-1"
          data-testid="button-detect-plate"
        >
          <Camera className="w-5 h-5 mr-2" />
          {isProcessing ? "Processing..." : "Detect Plate"}
        </Button>
        
        <Button
          variant="outline"
          onClick={simulationMode ? () => setSimulationMode(false) : () => setSimulationMode(true)}
          data-testid="button-simulation-mode"
        >
          {simulationMode ? "Disable" : "Enable"} Demo Mode
        </Button>
        
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
        <p className="text-xs text-warning mt-2">
          Demo mode active - simulating plate detection
        </p>
      )}
    </div>
  );
}

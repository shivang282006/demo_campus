import { useRef, useState, useCallback } from "react";

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  isStreaming: boolean;
  startStream: () => Promise<void>;
  stopStream: () => void;
  captureFrame: () => string | null;
  error: string | null;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStream = useCallback(async () => {
    try {
      setError(null);

      // Check if browser supports getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access is not supported in this browser");
      }

      // Request camera access with high-resolution settings for distance scanning
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 3840, min: 1920 }, // 4K preferred, Full HD minimum
          height: { ideal: 2160, min: 1080 }, // 4K preferred, Full HD minimum
          facingMode: "environment", // Prefer back camera if available
          frameRate: { ideal: 30, min: 15 }, // Higher frame rate for better scanning
          aspectRatio: 16/9, // 16:9 aspect ratio
          // Advanced camera settings for better focus and clarity
          focusMode: "continuous", // Continuous auto-focus
          whiteBalanceMode: "continuous", // Auto white balance
          exposureMode: "continuous", // Auto exposure
          // Request specific capabilities for better barcode detection
          advanced: [
            { focusMode: "continuous" },
            { whiteBalanceMode: "continuous" },
            { exposureMode: "continuous" },
            { torch: true }, // Enable torch if available
          ]
        },
        audio: false,
      });

      // Store stream reference
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
            setIsStreaming(true);
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

      } else {
        throw new Error("Video element not available");
      }

    } catch (err: any) {
      console.error("Error starting webcam:", err);
      
      let errorMessage = "Failed to start camera";
      
      if (err.name === "NotAllowedError") {
        errorMessage = "Camera access denied. Please allow camera permissions and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please connect a camera and try again.";
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported in this browser.";
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is being used by another application.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    try {
      // Stop all tracks in the stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
        });
        streamRef.current = null;
      }

      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);
      setError(null);
    } catch (err) {
      console.error("Error stopping webcam:", err);
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    try {
      const video = videoRef.current;
      if (!video || !isStreaming) {
        console.warn("Cannot capture frame: video not available or not streaming");
        return null;
      }

      // Create canvas element
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      
      if (!context) {
        console.error("Cannot get 2D context from canvas");
        return null;
      }

      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;

      // Draw current video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64 image data
      return canvas.toDataURL("image/jpeg", 0.8);
      
    } catch (err) {
      console.error("Error capturing frame:", err);
      return null;
    }
  }, [isStreaming]);

  return {
    videoRef,
    isStreaming,
    startStream,
    stopStream,
    captureFrame,
    error,
  };
}

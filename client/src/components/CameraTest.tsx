import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Camera, CameraOff, CheckCircle } from "lucide-react";

export default function CameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>("");
  const [cameraInfo, setCameraInfo] = useState<any>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  // Get available cameras
  const getCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      console.log("📷 Available cameras:", videoDevices);
    } catch (err) {
      console.error("Error getting cameras:", err);
    }
  };

  // Test camera access
  const testCamera = async () => {
    try {
      setError("");
      console.log("🎥 Testing camera access...");

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser");
      }

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: "environment"
        },
        audio: false
      });

      console.log("✅ Camera stream obtained:", stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error("Video element not available"));
            return;
          }

          const onLoadedMetadata = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            
            console.log("📹 Video loaded - Resolution:", video.videoWidth, "x", video.videoHeight);
            setCameraInfo({
              width: video.videoWidth,
              height: video.videoHeight,
              stream: stream
            });
            setIsStreaming(true);
            resolve();
          };

          const onError = () => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            video.removeEventListener("error", onError);
            reject(new Error("Failed to load video"));
          };

          video.addEventListener("loadedmetadata", onLoadedMetadata);
          video.addEventListener("error", onError);
        });
      }
    } catch (err: any) {
      console.error("❌ Camera test failed:", err);
      setError(err.message || "Camera access failed");
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setCameraInfo(null);
    setError("");
  };

  // Check permissions
  const checkPermissions = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log("🔐 Camera permission status:", permissionStatus.state);
      return permissionStatus.state;
    } catch (err) {
      console.log("🔐 Could not check camera permissions:", err);
      return "unknown";
    }
  };

  useEffect(() => {
    getCameras();
    checkPermissions();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Camera Test & Diagnostics</h2>
      
      {/* Camera Status */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Camera Status</h3>
        <div className="flex items-center gap-2 mb-2">
          {isStreaming ? (
            <CheckCircle className="w-5 h-5 text-green-500" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500" />
          )}
          <span>{isStreaming ? "Camera Active" : "Camera Inactive"}</span>
        </div>
        
        {cameraInfo && (
          <div className="text-sm text-muted-foreground">
            <p>Resolution: {cameraInfo.width} x {cameraInfo.height}</p>
            <p>Stream ID: {cameraInfo.stream?.id}</p>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-500 mt-2">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Available Cameras */}
      <div className="mb-6 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Available Cameras</h3>
        {devices.length > 0 ? (
          <div className="space-y-2">
            {devices.map((device, index) => (
              <div key={device.deviceId} className="text-sm">
                <p><strong>Camera {index + 1}:</strong> {device.label || `Camera ${index + 1}`}</p>
                <p className="text-muted-foreground">ID: {device.deviceId}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No cameras detected</p>
        )}
      </div>

      {/* Video Preview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">Camera Preview</h3>
        <div className="aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Camera preview will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-4">
        <Button
          onClick={testCamera}
          disabled={isStreaming}
          className="flex items-center gap-2"
        >
          <Camera className="w-4 h-4" />
          Test Camera
        </Button>
        
        <Button
          onClick={stopCamera}
          disabled={!isStreaming}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <CameraOff className="w-4 h-4" />
          Stop Camera
        </Button>
        
        <Button
          onClick={getCameras}
          variant="outline"
          className="flex items-center gap-2"
        >
          Refresh Cameras
        </Button>
        
        <Button
          onClick={checkPermissions}
          variant="outline"
          className="flex items-center gap-2"
        >
          Check Permissions
        </Button>
      </div>

      {/* Browser Info */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Browser Information</h3>
        <div className="text-sm space-y-1">
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>getUserMedia Support:</strong> {navigator.mediaDevices?.getUserMedia ? "✅ Yes" : "❌ No"}</p>
          <p><strong>HTTPS:</strong> {window.location.protocol === 'https:' ? "✅ Yes" : "❌ No"}</p>
          <p><strong>Localhost:</strong> {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? "✅ Yes" : "❌ No"}</p>
        </div>
      </div>

      {/* Troubleshooting Tips */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-yellow-800">Troubleshooting Tips</h3>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>• Make sure you're using HTTPS or localhost (camera requires secure context)</li>
          <li>• Check if your browser has camera permissions enabled</li>
          <li>• Try refreshing the page and allowing camera access when prompted</li>
          <li>• Make sure no other application is using the camera</li>
          <li>• Try using a different browser (Chrome, Firefox, Edge)</li>
          <li>• Check if your camera is working in other applications</li>
        </ul>
      </div>
    </div>
  );
}


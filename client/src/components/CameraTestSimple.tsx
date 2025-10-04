import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff } from "lucide-react";

export default function CameraTestSimple() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string>("");

  const startCamera = async () => {
    try {
      setError("");
      console.log("🎥 Starting camera test...");
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        console.log("✅ Camera started successfully");
      }
    } catch (err: any) {
      console.error("❌ Camera error:", err);
      setError(err.message || "Camera access failed");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    setError("");
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Simple Camera Test</h2>
      
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={startCamera} disabled={isStreaming}>
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </Button>
          <Button onClick={stopCamera} disabled={!isStreaming} variant="destructive">
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Camera
          </Button>
        </div>

        {error && (
          <div className="p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        <div className="text-sm text-gray-600">
          <p><strong>Status:</strong> {isStreaming ? "Camera Active" : "Camera Inactive"}</p>
          <p><strong>Instructions:</strong> Click "Start Camera" to test basic camera access</p>
        </div>
      </div>
    </div>
  );
}

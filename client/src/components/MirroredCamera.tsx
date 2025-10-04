import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, CameraOff, RotateCcw, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import useCameraMirror from '@/hooks/use-camera-mirror';

interface MirroredCameraProps {
  onStreamReady?: (stream: MediaStream) => void;
  onStreamError?: (error: string) => void;
  className?: string;
  showControls?: boolean;
  showInfo?: boolean;
  autoStart?: boolean;
  preferredFacingMode?: 'user' | 'environment';
  videoConstraints?: MediaTrackConstraints;
}

export default function MirroredCamera({
  onStreamReady,
  onStreamError,
  className = '',
  showControls = true,
  showInfo = true,
  autoStart = false,
  preferredFacingMode = 'environment',
  videoConstraints = {
    width: { ideal: 1920, min: 1280 },
    height: { ideal: 1080, min: 720 },
    frameRate: { ideal: 30, min: 15 },
  },
}: MirroredCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [cameraResolution, setCameraResolution] = useState({ width: 0, height: 0 });

  const {
    cameraInfo,
    isMirrored,
    isInitialized,
    initializeMirror,
    toggleMirror,
    setMirror,
    resetMirror,
  } = useCameraMirror({
    videoRef,
    facingMode: preferredFacingMode,
    autoDetect: true,
    enableMirror: true,
  });

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError('');
      
      // Request camera with preferred facing mode
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...videoConstraints,
          facingMode: preferredFacingMode,
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current;
          if (!video) {
            reject(new Error('Video element not available'));
            return;
          }

          const onLoadedMetadata = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            
            // Set camera resolution
            setCameraResolution({
              width: video.videoWidth,
              height: video.videoHeight,
            });
            
            // Initialize mirror detection
            initializeMirror(mediaStream);
            
            resolve();
          };

          const onError = () => {
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
            reject(new Error('Failed to load video stream'));
          };

          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });

        setStream(mediaStream);
        setIsStreaming(true);
        onStreamReady?.(mediaStream);
      }
    } catch (err: any) {
      const errorMessage = `Camera error: ${err.message || err}`;
      setError(errorMessage);
      onStreamError?.(errorMessage);
      console.error('Camera initialization failed:', err);
    }
  }, [videoConstraints, preferredFacingMode, initializeMirror, onStreamReady, onStreamError]);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsStreaming(false);
    setCameraResolution({ width: 0, height: 0 });
  }, [stream]);

  // Switch camera facing mode
  const switchCamera = useCallback(async () => {
    const newFacingMode = preferredFacingMode === 'environment' ? 'user' : 'environment';
    
    // Stop current stream
    stopCamera();
    
    // Update preferred facing mode and restart
    setTimeout(async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            ...videoConstraints,
            facingMode: newFacingMode,
          },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          
          await new Promise<void>((resolve, reject) => {
            const video = videoRef.current;
            if (!video) return;

            const onLoadedMetadata = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              
              setCameraResolution({
                width: video.videoWidth,
                height: video.videoHeight,
              });
              
              initializeMirror(mediaStream);
              resolve();
            };

            const onError = () => {
              video.removeEventListener('loadedmetadata', onLoadedMetadata);
              video.removeEventListener('error', onError);
              reject(new Error('Failed to load video stream'));
            };

            video.addEventListener('loadedmetadata', onLoadedMetadata);
            video.addEventListener('error', onError);
          });

          setStream(mediaStream);
          setIsStreaming(true);
          onStreamReady?.(mediaStream);
        }
      } catch (err: any) {
        const errorMessage = `Camera switch error: ${err.message || err}`;
        setError(errorMessage);
        onStreamError?.(errorMessage);
      }
    }, 100);
  }, [preferredFacingMode, videoConstraints, stopCamera, initializeMirror, onStreamReady, onStreamError]);

  // Auto-start if enabled
  useEffect(() => {
    if (autoStart && !isStreaming) {
      startCamera();
    }
  }, [autoStart, isStreaming, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Camera Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Mirrored Camera Feed
          </CardTitle>
          <CardDescription>
            Camera automatically mirrors for front camera, shows natural view for rear camera
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="aspect-video rounded-lg overflow-hidden relative bg-muted border-2 border-border">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Camera Info Overlay */}
            {isStreaming && showInfo && (
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-xs">
                <div className="flex items-center gap-2 mb-1">
                  <Monitor className="w-4 h-4" />
                  <span>CAMERA FEED</span>
                </div>
                <div>Resolution: {cameraResolution.width}x{cameraResolution.height}</div>
                <div>Facing: {cameraInfo.facingMode}</div>
                <div>Mirrored: {isMirrored ? 'Yes' : 'No'}</div>
              </div>
            )}

            {/* Mirror Status Indicator */}
            {isStreaming && (
              <div className="absolute top-4 right-4">
                <Badge variant={isMirrored ? 'default' : 'secondary'}>
                  {isMirrored ? '🪞 Mirrored' : '📷 Natural'}
                </Badge>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="absolute bottom-4 left-4 right-4 bg-destructive/90 text-destructive-foreground px-3 py-2 rounded-md">
                <div className="flex items-center space-x-2">
                  <CameraOff className="w-4 h-4" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Placeholder when not streaming */}
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-2">Camera Feed</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {preferredFacingMode === 'environment' ? 'Rear camera' : 'Front camera'} with auto-mirroring
                  </p>
                  {showControls && (
                    <Button onClick={startCamera}>
                      <Camera className="w-5 h-5 mr-2" />
                      Start Camera
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      {showControls && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Camera Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {!isStreaming ? (
                <Button onClick={startCamera} className="flex-1">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={stopCamera} variant="destructive" className="flex-1">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Stop Camera
                  </Button>
                  
                  <Button onClick={switchCamera} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Switch Camera
                  </Button>
                  
                  <Button onClick={toggleMirror} variant="outline" className="flex-1">
                    <Monitor className="w-4 h-4 mr-2" />
                    Toggle Mirror
                  </Button>
                  
                  <Button onClick={resetMirror} variant="outline" className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset Mirror
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera Information */}
      {showInfo && isStreaming && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Camera Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Facing Mode:</strong> {cameraInfo.facingMode}
              </div>
              <div>
                <strong>Camera Type:</strong> {cameraInfo.isFrontCamera ? 'Front' : cameraInfo.isRearCamera ? 'Rear' : 'Unknown'}
              </div>
              <div>
                <strong>Resolution:</strong> {cameraResolution.width}x{cameraResolution.height}
              </div>
              <div>
                <strong>Mirrored:</strong> {isMirrored ? 'Yes' : 'No'}
              </div>
              {cameraInfo.deviceId && (
                <div className="col-span-2">
                  <strong>Device ID:</strong> {cameraInfo.deviceId}
                </div>
              )}
              {cameraInfo.label && (
                <div className="col-span-2">
                  <strong>Label:</strong> {cameraInfo.label}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


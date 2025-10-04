import { useRef, useEffect, useState, useCallback } from 'react';

interface CameraMirrorOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  facingMode?: 'user' | 'environment' | 'left' | 'right';
  autoDetect?: boolean;
  enableMirror?: boolean;
}

interface CameraInfo {
  facingMode: 'user' | 'environment' | 'unknown';
  isFrontCamera: boolean;
  isRearCamera: boolean;
  deviceId?: string;
  label?: string;
}

export function useCameraMirror({
  videoRef,
  facingMode = 'environment',
  autoDetect = true,
  enableMirror = true,
}: CameraMirrorOptions) {
  const [cameraInfo, setCameraInfo] = useState<CameraInfo>({
    facingMode: 'unknown',
    isFrontCamera: false,
    isRearCamera: false,
  });
  const [isMirrored, setIsMirrored] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Detect camera facing mode from video stream
  const detectCameraFacing = useCallback(async (stream: MediaStream): Promise<CameraInfo> => {
    try {
      // Get video track
      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found');
      }

      // Get track settings
      const settings = videoTrack.getSettings();
      const constraints = videoTrack.getConstraints();

      // Determine facing mode
      let detectedFacingMode: 'user' | 'environment' | 'unknown' = 'unknown';
      
      if (settings.facingMode) {
        detectedFacingMode = settings.facingMode as 'user' | 'environment';
      } else if (constraints.facingMode) {
        if (typeof constraints.facingMode === 'string') {
          detectedFacingMode = constraints.facingMode as 'user' | 'environment';
        } else if (constraints.facingMode.exact) {
          detectedFacingMode = constraints.facingMode.exact as 'user' | 'environment';
        } else if (constraints.facingMode.ideal) {
          detectedFacingMode = constraints.facingMode.ideal as 'user' | 'environment';
        }
      }

      // Get device info
      const deviceId = settings.deviceId;
      const label = videoTrack.label;

      const cameraInfo: CameraInfo = {
        facingMode: detectedFacingMode,
        isFrontCamera: detectedFacingMode === 'user',
        isRearCamera: detectedFacingMode === 'environment',
        deviceId,
        label,
      };

      console.log('📷 Camera detected:', {
        facingMode: detectedFacingMode,
        isFrontCamera: cameraInfo.isFrontCamera,
        isRearCamera: cameraInfo.isRearCamera,
        deviceId,
        label,
      });

      return cameraInfo;
    } catch (error) {
      console.error('Failed to detect camera facing mode:', error);
      return {
        facingMode: 'unknown',
        isFrontCamera: false,
        isRearCamera: false,
      };
    }
  }, []);

  // Apply mirror transform to video element
  const applyMirrorTransform = useCallback((shouldMirror: boolean) => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    if (shouldMirror) {
      // Apply horizontal flip for front camera
      video.style.transform = 'scaleX(-1)';
      video.style.transformOrigin = 'center';
    } else {
      // Remove mirror for rear camera
      video.style.transform = 'scaleX(1)';
      video.style.transformOrigin = 'center';
    }

    setIsMirrored(shouldMirror);
    console.log(`🪞 Mirror ${shouldMirror ? 'applied' : 'removed'} for ${cameraInfo.facingMode} camera`);
  }, [videoRef, cameraInfo.facingMode]);

  // Update mirror based on camera type
  const updateMirror = useCallback((cameraInfo: CameraInfo) => {
    if (!enableMirror) {
      applyMirrorTransform(false);
      return;
    }

    // Apply mirror logic:
    // - Front camera (user): Mirror the preview (scaleX(-1))
    // - Rear camera (environment): Don't mirror (scaleX(1))
    const shouldMirror = cameraInfo.isFrontCamera;
    applyMirrorTransform(shouldMirror);
  }, [enableMirror, applyMirrorTransform]);

  // Initialize camera mirror detection
  const initializeMirror = useCallback(async (stream: MediaStream) => {
    try {
      const detectedCameraInfo = await detectCameraFacing(stream);
      setCameraInfo(detectedCameraInfo);
      updateMirror(detectedCameraInfo);
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize camera mirror:', error);
      setIsInitialized(false);
    }
  }, [detectCameraFacing, updateMirror]);

  // Manual mirror toggle
  const toggleMirror = useCallback(() => {
    const newMirrorState = !isMirrored;
    applyMirrorTransform(newMirrorState);
  }, [isMirrored, applyMirrorTransform]);

  // Force mirror state
  const setMirror = useCallback((mirror: boolean) => {
    applyMirrorTransform(mirror);
  }, [applyMirrorTransform]);

  // Reset mirror state
  const resetMirror = useCallback(() => {
    if (cameraInfo.facingMode !== 'unknown') {
      updateMirror(cameraInfo);
    } else {
      applyMirrorTransform(false);
    }
  }, [cameraInfo, updateMirror, applyMirrorTransform]);

  // Auto-detect camera changes
  useEffect(() => {
    if (!autoDetect || !videoRef.current) return;

    const video = videoRef.current;
    
    const handleLoadedMetadata = () => {
      if (video.srcObject instanceof MediaStream) {
        initializeMirror(video.srcObject);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [autoDetect, videoRef, initializeMirror]);

  return {
    cameraInfo,
    isMirrored,
    isInitialized,
    initializeMirror,
    toggleMirror,
    setMirror,
    resetMirror,
    updateMirror,
  };
}

export default useCameraMirror;


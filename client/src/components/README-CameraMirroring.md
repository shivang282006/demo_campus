# Camera Mirroring Solution

This document describes the camera mirroring functionality that automatically handles front and rear camera previews to provide a natural user experience.

## 🎯 **Problem Solved**

**Issue**: Camera feed was mirrored for both front and rear cameras, causing:
- Confusing user experience when using front camera
- Incorrect barcode detection when using rear camera
- Inconsistent behavior across different camera types

**Solution**: Automatic camera detection and appropriate mirroring:
- **Front Camera (user)**: Apply horizontal flip (`scaleX(-1)`) for natural preview
- **Rear Camera (environment)**: No mirroring (`scaleX(1)`) for accurate detection

## 🔧 **Implementation**

### **1. useCameraMirror Hook**

**File**: `client/src/hooks/use-camera-mirror.tsx`

**Features**:
- Automatic camera facing mode detection
- Dynamic mirror application based on camera type
- Manual mirror control options
- Real-time camera information

**Usage**:
```tsx
import useCameraMirror from '@/hooks/use-camera-mirror';

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
  facingMode: 'environment',
  autoDetect: true,
  enableMirror: true,
});
```

### **2. MirroredCamera Component**

**File**: `client/src/components/MirroredCamera.tsx`

**Features**:
- Complete camera management with mirroring
- Camera switching (front/rear)
- Manual mirror controls
- Real-time camera information display
- Error handling and user feedback

**Usage**:
```tsx
import MirroredCamera from '@/components/MirroredCamera';

<MirroredCamera
  onStreamReady={handleStreamReady}
  onStreamError={handleStreamError}
  showControls={true}
  showInfo={true}
  autoStart={false}
  preferredFacingMode="environment"
  className="w-full"
/>
```

### **3. Integrated Scanner Components**

**Updated Components**:
- `FullFrameBarcodeScanner.tsx` - Now includes mirror detection
- `ZXingBarcodeScanner.tsx` - Now includes mirror detection
- `barcode-scanner.tsx` - Added mirrored camera option

**Features**:
- Automatic mirror detection in scanner components
- Real-time mirror status display
- Seamless integration with existing scanner logic

## 🚀 **How It Works**

### **Camera Detection Process**

1. **Stream Initialization**: Camera stream is requested with specific facing mode
2. **Track Analysis**: Video track settings are analyzed to determine camera type
3. **Facing Mode Detection**: `facingMode` property is extracted from track settings
4. **Mirror Application**: Appropriate mirror transform is applied based on camera type

### **Mirror Logic**

```typescript
// Front camera (user): Mirror the preview
if (cameraInfo.isFrontCamera) {
  video.style.transform = 'scaleX(-1)';
}

// Rear camera (environment): Don't mirror
if (cameraInfo.isRearCamera) {
  video.style.transform = 'scaleX(1)';
}
```

### **Camera Type Detection**

```typescript
const cameraInfo: CameraInfo = {
  facingMode: detectedFacingMode,
  isFrontCamera: detectedFacingMode === 'user',
  isRearCamera: detectedFacingMode === 'environment',
  deviceId,
  label,
};
```

## 📱 **User Experience**

### **Front Camera (User)**
- **Preview**: Mirrored for natural selfie experience
- **Movement**: Hand moves right → appears to move right
- **Barcode Detection**: May be affected by mirroring (use rear camera for scanning)

### **Rear Camera (Environment)**
- **Preview**: Natural view (not mirrored)
- **Movement**: Hand moves right → appears to move right
- **Barcode Detection**: Accurate detection for scanning

## 🎨 **Visual Features**

### **Status Display**
- **Camera Type**: Shows "user" or "environment"
- **Mirror Status**: Shows "Mirrored" or "Natural"
- **Resolution**: Displays camera resolution
- **Device Info**: Shows device ID and label

### **Controls**
- **Start/Stop Camera**: Basic camera controls
- **Switch Camera**: Toggle between front and rear
- **Toggle Mirror**: Manual mirror control
- **Reset Mirror**: Reset to automatic behavior

## 🔍 **Testing**

### **Test Component**
**File**: `client/src/components/CameraMirrorTest.tsx`

**Features**:
- Comprehensive test suite for mirror functionality
- Multiple test modes (camera only, scanner integration)
- Real-time test status tracking
- Step-by-step test instructions

### **Test Scenarios**

1. **Front Camera Test**
   - Switch to front camera
   - Move hand to the right
   - Verify hand appears to move right (mirrored)

2. **Rear Camera Test**
   - Switch to rear camera
   - Move hand to the right
   - Verify hand appears to move right (natural)

3. **Scanner Integration Test**
   - Test with FullFrameBarcodeScanner
   - Test with ZXingBarcodeScanner
   - Verify barcode detection works correctly

## 🛠 **API Reference**

### **useCameraMirror Hook**

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `videoRef` | `React.RefObject<HTMLVideoElement>` | Required | Video element reference |
| `facingMode` | `'user' \| 'environment'` | `'environment'` | Preferred camera facing mode |
| `autoDetect` | `boolean` | `true` | Enable automatic detection |
| `enableMirror` | `boolean` | `true` | Enable mirror functionality |

#### **Returns**
| Property | Type | Description |
|----------|------|-------------|
| `cameraInfo` | `CameraInfo` | Current camera information |
| `isMirrored` | `boolean` | Current mirror state |
| `isInitialized` | `boolean` | Initialization status |
| `initializeMirror` | `(stream: MediaStream) => Promise<void>` | Initialize mirror detection |
| `toggleMirror` | `() => void` | Toggle mirror state |
| `setMirror` | `(mirror: boolean) => void` | Set mirror state |
| `resetMirror` | `() => void` | Reset to automatic behavior |

### **MirroredCamera Component**

#### **Props**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onStreamReady` | `(stream: MediaStream) => void` | Optional | Stream ready callback |
| `onStreamError` | `(error: string) => void` | Optional | Error callback |
| `className` | `string` | `''` | Additional CSS classes |
| `showControls` | `boolean` | `true` | Show control buttons |
| `showInfo` | `boolean` | `true` | Show camera information |
| `autoStart` | `boolean` | `false` | Start camera automatically |
| `preferredFacingMode` | `'user' \| 'environment'` | `'environment'` | Preferred camera |
| `videoConstraints` | `MediaTrackConstraints` | Default | Video constraints |

## 🔧 **Integration Examples**

### **Basic Integration**
```tsx
import { useRef } from 'react';
import useCameraMirror from '@/hooks/use-camera-mirror';

function MyComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cameraInfo, isMirrored, initializeMirror } = useCameraMirror({
    videoRef,
    facingMode: 'environment',
  });

  // Use with your camera stream
  const handleStreamReady = (stream: MediaStream) => {
    initializeMirror(stream);
  };

  return (
    <video ref={videoRef} autoPlay playsInline muted />
  );
}
```

### **Scanner Integration**
```tsx
import FullFrameBarcodeScanner from '@/components/FullFrameBarcodeScanner';

function MyScanner() {
  return (
    <FullFrameBarcodeScanner
      onBarcodeScanned={handleBarcodeScanned}
      showControls={true}
      showDebugInfo={true}
      // Mirror detection is automatic
    />
  );
}
```

### **Custom Camera Component**
```tsx
import MirroredCamera from '@/components/MirroredCamera';

function MyCamera() {
  return (
    <MirroredCamera
      onStreamReady={handleStreamReady}
      onStreamError={handleStreamError}
      showControls={true}
      showInfo={true}
      preferredFacingMode="environment"
    />
  );
}
```

## 🚨 **Troubleshooting**

### **Common Issues**

1. **Mirror Not Working**
   - Check if `enableMirror` is set to `true`
   - Verify camera facing mode detection
   - Check browser compatibility

2. **Camera Detection Fails**
   - Ensure camera permissions are granted
   - Check if camera supports facing mode detection
   - Verify video constraints

3. **Scanner Issues**
   - Use rear camera for barcode scanning
   - Check if mirror is interfering with detection
   - Verify scanner component integration

### **Debug Mode**
Enable debug logging to see camera detection process:
```tsx
const { cameraInfo, isMirrored } = useCameraMirror({
  videoRef,
  // Debug logs will show in console
});
```

## 📱 **Browser Compatibility**

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## 🎯 **Best Practices**

1. **Use Rear Camera for Scanning**: Front camera mirroring may affect barcode detection
2. **Test Both Cameras**: Verify mirror behavior on both front and rear cameras
3. **Handle Errors Gracefully**: Provide fallbacks for unsupported browsers
4. **User Feedback**: Show clear indicators of camera type and mirror status
5. **Performance**: Initialize mirror detection only when needed

## 📄 **License**

This camera mirroring solution is part of the CCTV Check-in system and follows the same license terms.


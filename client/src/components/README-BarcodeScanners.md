# Full-Frame Barcode Scanner Components

This directory contains multiple barcode scanner implementations that detect barcodes **anywhere in the camera frame**, not just within a bounding box.

## 🎯 **Key Features**

✅ **Full-Frame Detection** - Scans entire camera view, not just a box  
✅ **Continuous Processing** - Processes entire video frame for barcodes  
✅ **Real-time Scanning** - Triggers scan events instantly when barcode appears  
✅ **Multiple Libraries** - html5-qrcode and ZXing-js support  
✅ **Reusable Components** - Works in both React and Next.js  
✅ **Optimized Performance** - Real-time scanning with minimal CPU usage  

## 📦 **Available Scanners**

### 1. **FullFrameBarcodeScanner** (Default)
- **Library**: html5-qrcode
- **Features**: Full-frame scanning with html5-qrcode
- **Best for**: General purpose, reliable detection
- **Performance**: High FPS (30fps), optimized for real-time

### 2. **ZXingBarcodeScanner** (Advanced)
- **Library**: ZXing-js (@zxing/library)
- **Features**: Advanced full-frame detection with ZXing
- **Best for**: Maximum accuracy, complex barcodes
- **Performance**: Continuous frame processing (100ms intervals)

### 3. **SimpleQRScanner** (Fallback)
- **Library**: html5-qrcode (simplified)
- **Features**: Basic QR scanning with fixed scanning box
- **Best for**: Simple use cases, maximum compatibility
- **Performance**: Lower FPS (10fps), very reliable

## 🚀 **Usage Examples**

### Basic Usage
```tsx
import FullFrameBarcodeScanner from './FullFrameBarcodeScanner';

function MyComponent() {
  const handleBarcodeScanned = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
  };

  return (
    <FullFrameBarcodeScanner
      onBarcodeScanned={handleBarcodeScanned}
      showControls={true}
      autoStart={false}
    />
  );
}
```

### Advanced Usage with ZXing
```tsx
import ZXingBarcodeScanner from './ZXingBarcodeScanner';

function MyComponent() {
  const handleBarcodeScanned = (barcode: string) => {
    console.log('Scanned barcode:', barcode);
  };

  return (
    <ZXingBarcodeScanner
      onBarcodeScanned={handleBarcodeScanned}
      showControls={true}
      autoStart={true}
      scanInterval={50} // Scan every 50ms
      showDebugInfo={true}
    />
  );
}
```

### Custom Configuration
```tsx
import FullFrameBarcodeScanner from './FullFrameBarcodeScanner';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';

function MyComponent() {
  return (
    <FullFrameBarcodeScanner
      onBarcodeScanned={handleBarcodeScanned}
      onError={handleError}
      onScanStart={handleScanStart}
      onScanStop={handleScanStop}
      scannedBarcode={currentBarcode}
      className="my-scanner"
      showControls={true}
      autoStart={false}
      supportedFormats={[
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ]}
      debounceMs={1000}
      showDebugInfo={true}
    />
  );
}
```

## 🔧 **Props Reference**

### Common Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onBarcodeScanned` | `(barcode: string) => void` | Required | Callback when barcode is detected |
| `onError` | `(error: string) => void` | Optional | Callback for errors |
| `onScanStart` | `() => void` | Optional | Callback when scanning starts |
| `onScanStop` | `() => void` | Optional | Callback when scanning stops |
| `scannedBarcode` | `string` | Optional | Currently scanned barcode |
| `className` | `string` | `""` | Additional CSS classes |
| `showControls` | `boolean` | `true` | Show start/stop controls |
| `autoStart` | `boolean` | `false` | Start scanning automatically |
| `showDebugInfo` | `boolean` | `false` | Show debug information |

### FullFrameBarcodeScanner Specific
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `supportedFormats` | `Html5QrcodeSupportedFormats[]` | All formats | Supported barcode formats |
| `debounceMs` | `number` | `2000` | Debounce time in milliseconds |

### ZXingBarcodeScanner Specific
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scanInterval` | `number` | `100` | Scan interval in milliseconds |

## 🎨 **Visual Features**

### Full-Frame Scanning Overlay
- **Corner Indicators**: Animated corner brackets showing scanning area
- **Scanning Lines**: Multiple animated lines across the frame
- **Center Indicator**: Pulsing dot in the center
- **Status Display**: Real-time scanning information
- **Success Animation**: Bounce animation when barcode detected

### Scanner Status
- **Resolution Display**: Shows camera resolution
- **Scan Statistics**: Success rate and scan count
- **Error Messages**: Clear error feedback
- **Debug Information**: Last scanned content (when enabled)

## 🔍 **How It Works**

### Full-Frame Detection Process
1. **Camera Initialization** - Requests high-resolution camera stream
2. **Frame Processing** - Continuously processes entire video frame
3. **Barcode Detection** - Uses library to detect barcodes anywhere in frame
4. **Validation** - Validates detected barcodes against patterns
5. **Event Triggering** - Immediately triggers callback when valid barcode found
6. **Continuous Scanning** - Keeps scanning until stopped

### Performance Optimizations
- **Frame Skipping** - Only processes frames at target intervals
- **Debouncing** - Prevents duplicate scans of same barcode
- **Efficient Processing** - Optimized algorithms for real-time performance
- **Memory Management** - Proper cleanup to prevent memory leaks

## 🛠 **Troubleshooting**

### Common Issues
1. **Camera Permission Denied**
   - Ensure browser has camera access
   - Check HTTPS requirement for camera access

2. **No Barcode Detection**
   - Try different scanner types
   - Ensure good lighting and barcode quality
   - Check if barcode format is supported

3. **Performance Issues**
   - Reduce scan interval for ZXing scanner
   - Lower FPS for html5-qrcode scanner
   - Check browser compatibility

### Debug Mode
Enable debug mode to see detailed logging:
```tsx
<FullFrameBarcodeScanner
  showDebugInfo={true}
  // ... other props
/>
```

## 📱 **Browser Compatibility**

### FullFrameBarcodeScanner
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+

### ZXingBarcodeScanner
- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 11+
- ✅ Edge 79+
- ⚠️ Requires ES6 modules support

## 🚀 **Performance Tips**

1. **Use FullFrameBarcodeScanner** for general purpose scanning
2. **Use ZXingBarcodeScanner** for maximum accuracy
3. **Adjust scan intervals** based on performance needs
4. **Enable debug mode** for troubleshooting
5. **Test with different barcode types** to ensure compatibility

## 📄 **License**

These components are part of the CCTV Check-in system and follow the same license terms.


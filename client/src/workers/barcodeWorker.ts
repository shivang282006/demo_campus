// Web Worker for parallel barcode processing
import { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } from '@zxing/library';

// Initialize the barcode reader with optimizations
const reader = new BrowserMultiFormatReader();

// Configure hints for better performance
const hints = new Map();
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.AZTEC,
]);

// Set additional hints for better detection
hints.set(DecodeHintType.TRY_HARDER, true);
hints.set(DecodeHintType.CHARACTER_SET, 'UTF-8');

reader.hints = hints;

// Region of Interest detection
function detectROI(imageData: ImageData): { x: number; y: number; width: number; height: number }[] {
  const { data, width, height } = imageData;
  const rois: { x: number; y: number; width: number; height: number }[] = [];
  
  // Convert to grayscale and find high-contrast areas
  const step = 20; // Check every 20 pixels for performance
  const minSize = 50; // Minimum ROI size
  
  for (let y = 0; y < height - minSize; y += step) {
    for (let x = 0; x < width - minSize; x += step) {
      // Calculate local contrast
      let contrast = 0;
      let pixelCount = 0;
      
      for (let dy = 0; dy < minSize; dy += 5) {
        for (let dx = 0; dx < minSize; dx += 5) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const gray = (r + g + b) / 3;
          
          // Calculate contrast with surrounding pixels
          if (x > 0 && y > 0 && x < width - 1 && y < height - 1) {
            const leftIdx = ((y + dy) * width + (x + dx - 1)) * 4;
            const rightIdx = ((y + dy) * width + (x + dx + 1)) * 4;
            const topIdx = ((y + dy - 1) * width + (x + dx)) * 4;
            const bottomIdx = ((y + dy + 1) * width + (x + dx)) * 4;
            
            const leftGray = (data[leftIdx] + data[leftIdx + 1] + data[leftIdx + 2]) / 3;
            const rightGray = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
            const topGray = (data[topIdx] + data[topIdx + 1] + data[topIdx + 2]) / 3;
            const bottomGray = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
            
            contrast += Math.abs(gray - leftGray) + Math.abs(gray - rightGray) + 
                      Math.abs(gray - topGray) + Math.abs(gray - bottomGray);
            pixelCount++;
          }
        }
      }
      
      const avgContrast = contrast / pixelCount;
      
      // If high contrast area found, add as ROI
      if (avgContrast > 30) { // Threshold for high contrast
        rois.push({
          x: Math.max(0, x - 10),
          y: Math.max(0, y - 10),
          width: Math.min(minSize + 20, width - x),
          height: Math.min(minSize + 20, height - y)
        });
      }
    }
  }
  
  return rois;
}

// Process image data for barcode detection
async function processImageData(imageData: ImageData): Promise<string | null> {
  try {
    // First, try full image detection
    const result = await reader.decodeFromImageData(imageData);
    if (result) {
      return result.getText();
    }
  } catch (error) {
    // If full image fails, try ROI detection
    const rois = detectROI(imageData);
    
    for (const roi of rois) {
      try {
        // Create ROI image data
        const roiImageData = new ImageData(
          new Uint8ClampedArray(
            imageData.data.slice(
              (roi.y * imageData.width + roi.x) * 4,
              ((roi.y + roi.height) * imageData.width + roi.x + roi.width) * 4
            )
          ),
          roi.width,
          roi.height
        );
        
        const roiResult = await reader.decodeFromImageData(roiImageData);
        if (roiResult) {
          return roiResult.getText();
        }
      } catch (roiError) {
        // Continue to next ROI
        continue;
      }
    }
  }
  
  return null;
}

// Listen for messages from main thread
self.onmessage = async function(e) {
  const { imageData, requestId } = e.data;
  
  try {
    const result = await processImageData(imageData);
    
    // Send result back to main thread
    self.postMessage({
      requestId,
      success: true,
      result: result
    });
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      requestId,
      success: false,
      error: error.message
    });
  }
};

// Export for TypeScript
export {};

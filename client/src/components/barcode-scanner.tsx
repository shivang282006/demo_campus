import SimpleQRScanner from "./SimpleQRScanner";

interface BarcodeScannerProps {
  onBarcodeScanned: (studentId: string) => void;
  scannedId?: string;
}

export default function BarcodeScanner({ onBarcodeScanned, scannedId }: BarcodeScannerProps) {

  // Use only the Simple QR Scanner
  return (
    <div className="relative">
      <SimpleQRScanner
        onBarcodeScanned={onBarcodeScanned}
        scannedBarcode={scannedId}
        showControls={true}
        autoStart={false}
        className="w-full"
      />
    </div>
  );

}

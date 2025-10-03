import { useState, useRef, useCallback } from "react";
import { Camera, Scan, Settings, RotateCcw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WebcamFeed from "@/components/webcam-feed";
import BarcodeScanner from "@/components/barcode-scanner";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface VerificationResult {
  student: any;
  vehicle: any;
  isValid: boolean;
  reason?: string;
  accessLog: any;
}

export default function CameraStation() {
  const [gateLocation] = useState("Gate 1");
  const [detectedPlate, setDetectedPlate] = useState<string>("");
  const [scannedStudentId, setScannedStudentId] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  const { lastMessage } = useWebSocket();

  const verifyAccessMutation = useMutation({
    mutationFn: async (data: { studentId: string; plateNumber: string; gateLocation: string }) => {
      const res = await apiRequest("POST", "/api/verify-access", data);
      return res.json() as Promise<VerificationResult>;
    },
    onSuccess: (result) => {
      setIsVerifying(false);
      
      if (result.isValid) {
        toast({
          title: "Access Granted",
          description: `Entry logged for ${result.student?.name} (${result.student?.studentId})`,
          variant: "default",
        });
      } else {
        toast({
          title: "Access Denied",
          description: result.reason || "Unauthorized access attempt",
          variant: "destructive",
        });
      }
      
      // Clear detected data after verification
      setTimeout(() => {
        setDetectedPlate("");
        setScannedStudentId("");
      }, 3000);
    },
    onError: (error) => {
      setIsVerifying(false);
      toast({
        title: "Verification Error",
        description: "Failed to verify access. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePlateDetection = useCallback((plateNumber: string) => {
    console.log("Detected plate:", plateNumber);
    setDetectedPlate(plateNumber);
    
    // Auto-verify if both plate and student ID are available
    if (scannedStudentId && plateNumber) {
      setIsVerifying(true);
      verifyAccessMutation.mutate({
        studentId: scannedStudentId,
        plateNumber,
        gateLocation,
      });
    }
  }, [scannedStudentId, gateLocation, verifyAccessMutation]);

  const handleBarcodeScanned = useCallback((studentId: string) => {
    console.log("Scanned student ID:", studentId);
    setScannedStudentId(studentId);
    
    // Auto-verify if both plate and student ID are available
    if (detectedPlate && studentId) {
      setIsVerifying(true);
      verifyAccessMutation.mutate({
        studentId,
        plateNumber: detectedPlate,
        gateLocation,
      });
    }
  }, [detectedPlate, gateLocation, verifyAccessMutation]);

  const handleManualVerify = () => {
    if (!scannedStudentId || !detectedPlate) {
      toast({
        title: "Incomplete Data",
        description: "Both student ID and vehicle plate number are required",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    verifyAccessMutation.mutate({
      studentId: scannedStudentId,
      plateNumber: detectedPlate,
      gateLocation,
    });
  };

  const handleReset = () => {
    setDetectedPlate("");
    setScannedStudentId("");
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Camera Station - {gateLocation}</h1>
              <p className="text-sm text-muted-foreground">Live vehicle and ID scanning interface</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-success/10 border border-success/20 rounded-lg">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-success">LIVE</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isVerifying}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      {/* Camera Feeds */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vehicle CCTV Feed */}
          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-semibold text-foreground">Vehicle CCTV</h3>
              </div>
              <span className="text-xs px-3 py-1 bg-red-500/10 text-red-500 rounded-full font-medium">
                RECORDING
              </span>
            </div>
            
            <CardContent className="p-6">
              <WebcamFeed
                onPlateDetected={handlePlateDetection}
                detectedPlate={detectedPlate}
              />
              
              {/* Vehicle Info Display */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Detected Vehicle</p>
                    <p className="text-lg font-bold text-foreground mt-1" data-testid="text-detected-plate">
                      {detectedPlate || "No vehicle detected"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${
                      detectedPlate 
                        ? isVerifying 
                          ? "bg-warning/10 text-warning" 
                          : "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {detectedPlate 
                        ? isVerifying 
                          ? "Verifying..." 
                          : "Detected"
                        : "Scanning..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ID Card Scanner */}
          <Card>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <h3 className="text-lg font-semibold text-foreground">ID Card Scanner</h3>
              </div>
              <span className="text-xs px-3 py-1 bg-red-500/10 text-red-500 rounded-full font-medium">
                SCANNING
              </span>
            </div>
            
            <CardContent className="p-6">
              <BarcodeScanner
                onBarcodeScanned={handleBarcodeScanned}
                scannedId={scannedStudentId}
              />
              
              {/* Student Info Display */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Scanned ID</p>
                    <p className="text-lg font-bold text-foreground mt-1" data-testid="text-scanned-id">
                      {scannedStudentId || "No ID scanned"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <span className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${
                      scannedStudentId 
                        ? isVerifying 
                          ? "bg-warning/10 text-warning" 
                          : "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {scannedStudentId 
                        ? isVerifying 
                          ? "Verifying..." 
                          : "Valid"
                        : "Scanning..."}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manual Controls */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Manual Controls</h3>
            
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleManualVerify}
                disabled={!scannedStudentId || !detectedPlate || isVerifying}
                className="flex-1"
                data-testid="button-verify"
              >
                <Scan className="w-5 h-5 mr-2" />
                {isVerifying ? "Verifying..." : "Verify Access"}
              </Button>
              
              <Button variant="outline" size="lg" data-testid="button-settings">
                <Settings className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                <strong>Instructions:</strong> 
                Position vehicle in camera view and scan student ID card. 
                System will automatically verify access when both are detected.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

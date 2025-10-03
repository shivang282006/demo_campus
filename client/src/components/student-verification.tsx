import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Car } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { StudentWithVehicle, Vehicle } from "@shared/schema";

interface VerificationData {
  student: StudentWithVehicle | null;
  vehicle: Vehicle | null;
  isValid: boolean;
  reason?: string;
}

export default function StudentVerification() {
  const [currentVerification, setCurrentVerification] = useState<VerificationData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { lastMessage } = useWebSocket();
  const { toast } = useToast();

  // Listen for real-time verification updates
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'access_log' || lastMessage.type === 'access_granted' || lastMessage.type === 'access_denied') {
        const logData = lastMessage.data;
        if (logData.student && logData.vehicle) {
          setCurrentVerification({
            student: logData.student,
            vehicle: logData.vehicle,
            isValid: logData.accessStatus === 'granted',
            reason: logData.reason,
          });
          setIsProcessing(false);
        }
      }
    }
  }, [lastMessage]);

  const grantAccessMutation = useMutation({
    mutationFn: async () => {
      if (!currentVerification?.student || !currentVerification?.vehicle) {
        throw new Error("No verification data available");
      }
      
      const res = await apiRequest("POST", "/api/grant-access", {
        studentId: currentVerification.student.studentId,
        plateNumber: currentVerification.vehicle.plateNumber,
        gateLocation: "Gate 1",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Access Granted",
        description: "Manual approval logged successfully",
        variant: "default",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to grant access",
        variant: "destructive",
      });
    },
  });

  const denyAccessMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await apiRequest("POST", "/api/deny-access", {
        studentId: currentVerification?.student?.studentId || null,
        plateNumber: currentVerification?.vehicle?.plateNumber || "Unknown",
        gateLocation: "Gate 1",
        reason,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Access Denied",
        description: "Manual denial logged successfully",
        variant: "destructive",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deny access",
        variant: "destructive",
      });
    },
  });

  const handleGrantAccess = () => {
    grantAccessMutation.mutate();
  };

  const handleDenyAccess = () => {
    denyAccessMutation.mutate("Manual denial by security officer");
  };

  if (!currentVerification) {
    return (
      <Card>
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Current Verification</h3>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12 text-center">
            <div>
              <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-foreground mb-2">No Active Verification</h4>
              <p className="text-muted-foreground">
                Scan a student ID and detect a vehicle to begin verification
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { student, vehicle, isValid, reason } = currentVerification;

  return (
    <Card>
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Current Verification</h3>
      </div>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Student Profile */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Student Profile</h4>
            
            {student ? (
              <div className="flex items-start space-x-4">
                {student.photoUrl ? (
                  <img 
                    src={student.photoUrl} 
                    alt="Student photo" 
                    className="w-20 h-20 rounded-lg object-cover border-2 border-border" 
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-muted border-2 border-border flex items-center justify-center">
                    <Shield className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-lg" data-testid="text-student-name">
                    {student.name}
                  </p>
                  <p className="text-sm text-muted-foreground" data-testid="text-student-id">
                    {student.studentId}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {student.department}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {student.year}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <XCircle className="w-12 h-12 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-medium">Student Not Found</p>
              </div>
            )}
            
            {student && (
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Roll No:</span>
                  <span className="font-medium text-foreground">{student.rollNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Division:</span>
                  <span className="font-medium text-foreground">{student.division}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Contact:</span>
                  <span className="font-medium text-foreground">{student.contactNumber}</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Vehicle Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Vehicle Details</h4>
            
            {vehicle ? (
              <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Registration Number</p>
                  <p className="text-xl font-bold text-foreground tracking-wider" data-testid="text-vehicle-plate">
                    {vehicle.plateNumber}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Vehicle Type</p>
                    <p className="text-sm font-medium text-foreground">{vehicle.vehicleType}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Color</p>
                    <p className="text-sm font-medium text-foreground">{vehicle.color || "N/A"}</p>
                  </div>
                </div>
                
                {vehicle.model && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Model</p>
                    <p className="text-sm font-medium text-foreground">{vehicle.model}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Registration Status:</span>
                    <Badge variant={vehicle.isActive ? "default" : "destructive"}>
                      {vehicle.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Car className="w-12 h-12 text-destructive mx-auto mb-2" />
                <p className="text-destructive font-medium">Vehicle Not Found</p>
              </div>
            )}
          </div>
          
          {/* Verification Status */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Verification Status</h4>
            
            <div className="space-y-3">
              {/* ID Verification */}
              <div className={`p-4 rounded-lg border ${student ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${student ? 'bg-success' : 'bg-destructive'}`}>
                    {student ? (
                      <CheckCircle className="w-6 h-6 text-success-foreground" />
                    ) : (
                      <XCircle className="w-6 h-6 text-destructive-foreground" />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${student ? 'text-success' : 'text-destructive'}`}>
                      {student ? 'ID Verified' : 'ID Not Found'}
                    </p>
                    <p className={`text-xs ${student ? 'text-success/70' : 'text-destructive/70'}`}>
                      {student ? 'Student record found' : 'No matching student'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Vehicle Verification */}
              <div className={`p-4 rounded-lg border ${vehicle ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${vehicle ? 'bg-success' : 'bg-destructive'}`}>
                    {vehicle ? (
                      <CheckCircle className="w-6 h-6 text-success-foreground" />
                    ) : (
                      <XCircle className="w-6 h-6 text-destructive-foreground" />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${vehicle ? 'text-success' : 'text-destructive'}`}>
                      {vehicle ? 'Vehicle Verified' : 'Vehicle Not Found'}
                    </p>
                    <p className={`text-xs ${vehicle ? 'text-success/70' : 'text-destructive/70'}`}>
                      {vehicle ? 'Registered vehicle' : 'No matching vehicle'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Match Status */}
              <div className={`p-4 rounded-lg border ${isValid ? 'bg-success/5 border-success/20' : 'bg-destructive/5 border-destructive/20'}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isValid ? 'bg-success' : 'bg-destructive'}`}>
                    {isValid ? (
                      <CheckCircle className="w-6 h-6 text-success-foreground" />
                    ) : (
                      <XCircle className="w-6 h-6 text-destructive-foreground" />
                    )}
                  </div>
                  <div>
                    <p className={`font-semibold ${isValid ? 'text-success' : 'text-destructive'}`}>
                      {isValid ? 'Records Match' : 'Verification Failed'}
                    </p>
                    <p className={`text-xs ${isValid ? 'text-success/70' : 'text-destructive/70'}`}>
                      {reason || (isValid ? '100% confidence' : 'Check details')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-4 space-y-2">
              <Button
                onClick={handleGrantAccess}
                disabled={grantAccessMutation.isPending}
                className="w-full bg-success text-success-foreground hover:bg-success/90"
                data-testid="button-grant-access"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                {grantAccessMutation.isPending ? "Granting..." : "GRANT ACCESS"}
              </Button>
              
              <Button
                onClick={handleDenyAccess}
                disabled={denyAccessMutation.isPending}
                variant="destructive"
                className="w-full"
                data-testid="button-deny-access"
              >
                <XCircle className="w-5 h-5 mr-2" />
                {denyAccessMutation.isPending ? "Denying..." : "DENY ACCESS"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

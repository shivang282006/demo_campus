import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload } from "lucide-react";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface StudentFormData {
  name: string;
  studentId: string;
  rollNumber: string;
  contactNumber: string;
  department: string;
  year: string;
  division: string;
  photoUrl?: string;
}

interface VehicleFormData {
  plateNumber: string;
  vehicleType: string;
  model: string;
  color: string;
}

export default function AddStudentModal({ isOpen, onClose, onSuccess }: AddStudentModalProps) {
  const [studentData, setStudentData] = useState<StudentFormData>({
    name: "",
    studentId: "",
    rollNumber: "",
    contactNumber: "",
    department: "",
    year: "",
    division: "",
    photoUrl: "",
  });

  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    plateNumber: "",
    vehicleType: "",
    model: "",
    color: "",
  });

  const { toast } = useToast();

  const addStudentMutation = useMutation({
    mutationFn: async (data: { student: StudentFormData; vehicle: VehicleFormData }) => {
      const res = await apiRequest("POST", "/api/students", {
        student: {
          ...data.student,
          isActive: true,
        },
        vehicle: {
          ...data.vehicle,
          isActive: true,
        },
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Student Added",
        description: "Student and vehicle information saved successfully",
        variant: "default",
      });
      resetForm();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStudentData({
      name: "",
      studentId: "",
      rollNumber: "",
      contactNumber: "",
      department: "",
      year: "",
      division: "",
      photoUrl: "",
    });
    setVehicleData({
      plateNumber: "",
      vehicleType: "",
      model: "",
      color: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredStudentFields = ['name', 'studentId', 'rollNumber', 'contactNumber', 'department', 'year', 'division'];
    const requiredVehicleFields = ['plateNumber', 'vehicleType'];
    
    for (const field of requiredStudentFields) {
      if (!studentData[field as keyof StudentFormData]) {
        toast({
          title: "Validation Error",
          description: `${field.charAt(0).toUpperCase() + field.slice(1)} is required`,
          variant: "destructive",
        });
        return;
      }
    }
    
    for (const field of requiredVehicleFields) {
      if (!vehicleData[field as keyof VehicleFormData]) {
        toast({
          title: "Validation Error",
          description: `Vehicle ${field} is required`,
          variant: "destructive",
        });
        return;
      }
    }

    addStudentMutation.mutate({ student: studentData, vehicle: vehicleData });
  };

  const handleClose = () => {
    if (!addStudentMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Personal Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={studentData.name}
                  onChange={(e) => setStudentData({ ...studentData, name: e.target.value })}
                  placeholder="Enter student name"
                  required
                  data-testid="input-student-name"
                />
              </div>
              
              <div>
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={studentData.studentId}
                  onChange={(e) => setStudentData({ ...studentData, studentId: e.target.value })}
                  placeholder="APSIT-YYYY-XXX"
                  required
                  data-testid="input-student-id"
                />
              </div>
              
              <div>
                <Label htmlFor="rollNumber">Roll Number *</Label>
                <Input
                  id="rollNumber"
                  value={studentData.rollNumber}
                  onChange={(e) => setStudentData({ ...studentData, rollNumber: e.target.value })}
                  placeholder="Enter roll number"
                  required
                  data-testid="input-roll-number"
                />
              </div>
              
              <div>
                <Label htmlFor="contactNumber">Contact Number *</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  value={studentData.contactNumber}
                  onChange={(e) => setStudentData({ ...studentData, contactNumber: e.target.value })}
                  placeholder="+91 XXXXX XXXXX"
                  required
                  data-testid="input-contact-number"
                />
              </div>
            </div>
          </div>
          
          {/* Academic Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Academic Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="department">Department *</Label>
                <select
                  id="department"
                  value={studentData.department}
                  onChange={(e) => setStudentData({ ...studentData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  data-testid="select-department"
                >
                  <option value="">Select department</option>
                  <option value="Computer Engineering">Computer Engineering</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Civil">Civil</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="year">Year *</Label>
                <select
                  id="year"
                  value={studentData.year}
                  onChange={(e) => setStudentData({ ...studentData, year: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  data-testid="select-year"
                >
                  <option value="">Select year</option>
                  <option value="First Year">First Year</option>
                  <option value="Second Year">Second Year</option>
                  <option value="Third Year">Third Year</option>
                  <option value="Final Year">Final Year</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="division">Division *</Label>
                <select
                  id="division"
                  value={studentData.division}
                  onChange={(e) => setStudentData({ ...studentData, division: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  data-testid="select-division"
                >
                  <option value="">Select division</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Vehicle Information */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Vehicle Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plateNumber">Vehicle Number *</Label>
                <Input
                  id="plateNumber"
                  value={vehicleData.plateNumber}
                  onChange={(e) => setVehicleData({ ...vehicleData, plateNumber: e.target.value.toUpperCase() })}
                  placeholder="MH-XX-XX-XXXX"
                  required
                  data-testid="input-plate-number"
                />
              </div>
              
              <div>
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <select
                  id="vehicleType"
                  value={vehicleData.vehicleType}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicleType: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                  data-testid="select-vehicle-type"
                >
                  <option value="">Select type</option>
                  <option value="Two Wheeler">Two Wheeler</option>
                  <option value="Four Wheeler">Four Wheeler</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="model">Vehicle Model</Label>
                <Input
                  id="model"
                  value={vehicleData.model}
                  onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                  placeholder="e.g., Honda Activa 6G"
                  data-testid="input-vehicle-model"
                />
              </div>
              
              <div>
                <Label htmlFor="color">Vehicle Color</Label>
                <Input
                  id="color"
                  value={vehicleData.color}
                  onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                  placeholder="e.g., Black"
                  data-testid="input-vehicle-color"
                />
              </div>
            </div>
          </div>
          
          {/* Photo Upload */}
          <div>
            <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Student Photo
            </h4>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-foreground mb-2">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  // In a real implementation, upload to Supabase storage
                  console.log("File upload:", e.target.files?.[0]);
                  // setStudentData({ ...studentData, photoUrl: uploadedUrl });
                }}
                data-testid="input-photo-upload"
              />
            </div>
          </div>
          
          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={addStudentMutation.isPending}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={addStudentMutation.isPending}
              data-testid="button-submit"
            >
              {addStudentMutation.isPending ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Edit, Trash2, UserCircle } from "lucide-react";
import { supabaseClient, db } from "@/helper/supabase";
import { useToast } from "@/hooks/use-toast";

interface AuthorizedUser {
  unique_id: string;
  user_name: string;
  vehicle_number?: string | null;
  Department: string;
  User_Type: 'Student' | 'Staff';
  is_active: boolean;
  created_at: string;
}

export default function StudentManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<AuthorizedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string>("");
  const { toast } = useToast();

  // Form state for adding new student
  const [newStudent, setNewStudent] = useState({
    unique_id: "",
    user_name: "",
    vehicle_number: "",
    Department: "",
    User_Type: "Student" as "Student" | "Staff",
    is_active: true,
  });

  const departments = ["Computer", "Information Technology", "Data Science", "AIML", "Mechanical", "Civil"];

  // Fetch students directly from Supabase
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabaseClient
          .from('authorized_users')
          .select('unique_id, user_name, vehicle_number, Department, User_Type, is_active, created_at')
          .order('created_at', { ascending: false });

        console.log('data', data);
        
        if (error) throw error;
        setStudents(data || []);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast({
          title: "Error",
          description: "Failed to fetch students from database.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  const filteredStudents = students.filter(student =>
    student.unique_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.Department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.vehicle_number && student.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddStudent = () => {
    // Reset form
    setNewStudent({
      unique_id: "",
      user_name: "",
      vehicle_number: "",
      Department: "",
      User_Type: "Student",
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleSubmitNewStudent = async () => {
    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!newStudent.unique_id.trim() || !newStudent.user_name.trim() || !newStudent.Department.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (ID, Name, Department).",
          variant: "destructive",
        });
        return;
      }

      // Check if student ID already exists
      const { data: existingStudent } = await supabaseClient
        .from('authorized_users')
        .select('unique_id')
        .eq('unique_id', newStudent.unique_id.trim())
        .single();

      if (existingStudent) {
        toast({
          title: "Duplicate ID",
          description: "A student with this ID already exists.",
          variant: "destructive",
        });
        return;
      }

      // Insert new student
      const { data, error } = await supabaseClient
        .from('authorized_users')
        .insert([{
          unique_id: newStudent.unique_id.trim(),
          user_name: newStudent.user_name.trim(),
          vehicle_number: newStudent.vehicle_number.trim() || null,
          Department: newStudent.Department.trim(),
          User_Type: newStudent.User_Type,
          is_active: newStudent.is_active,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state
      setStudents(prev => [data, ...prev]);
      
      // Close modal and show success
      setIsAddModalOpen(false);
      toast({
        title: "Success",
        description: `User ${newStudent.user_name} has been added successfully.`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: `Failed to add user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditStudent = (studentId: string) => {
    const user = students.find(s => s.unique_id === studentId);
    if (user) {
      setEditingUser(user);
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      setIsSubmitting(true);

      // Validate required fields
      if (!editingUser.unique_id.trim() || !editingUser.user_name.trim() || !editingUser.Department.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields (ID, Name, Department).",
          variant: "destructive",
        });
        return;
      }

      // Check if student ID already exists (excluding current user)
      const { data: existingStudent } = await supabaseClient
        .from('authorized_users')
        .select('unique_id')
        .eq('unique_id', editingUser.unique_id.trim())
        .neq('unique_id', editingUser.unique_id)
        .single();

      if (existingStudent) {
        toast({
          title: "Duplicate ID",
          description: "A user with this ID already exists.",
          variant: "destructive",
        });
        return;
      }

      // Update user
      const { data, error } = await supabaseClient
        .from('authorized_users')
        .update({
          unique_id: editingUser.unique_id.trim(),
          user_name: editingUser.user_name.trim(),
          vehicle_number: editingUser.vehicle_number?.trim() || null,
          Department: editingUser.Department.trim(),
          User_Type: editingUser.User_Type,
          is_active: editingUser.is_active,
        })
        .eq('unique_id', editingUser.unique_id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setStudents(prev => prev.map(user => 
        user.unique_id === editingUser.unique_id ? data : user
      ));
      
      // Close modal and show success
      setIsEditModalOpen(false);
      setEditingUser(null);
      toast({
        title: "Success",
        description: `User ${editingUser.user_name} has been updated successfully.`,
        duration: 3000,
      });

    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: `Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = (studentId: string) => {
    setDeletingUserId(studentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    try {
      setIsSubmitting(true);

      // Delete user from database
      const { error } = await supabaseClient
        .from('authorized_users')
        .delete()
        .eq('unique_id', deletingUserId);

      if (error) throw error;

      // Remove from local state
      setStudents(prev => prev.filter(user => user.unique_id !== deletingUserId));
      
      // Close dialog and show success
      setIsDeleteDialogOpen(false);
      setDeletingUserId("");
      toast({
        title: "Success",
        description: "User has been deleted successfully.",
        duration: 3000,
      });

    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: `Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">User Database</h1>
        <p className="text-muted-foreground">Manage user records and access permissions</p>
        </div>
        
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total users</p>
              <p className="text-2xl font-semibold">{students.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-md">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-semibold text-green-600">
                {students.filter(s => s.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Inactive</p>
              <p className="text-2xl font-semibold text-muted-foreground">
                {students.filter(s => !s.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
                        <div>
              <p className="text-sm text-muted-foreground mb-1">With Vehicles</p>
              <p className="text-2xl font-semibold">
                {students.filter(s => s.vehicle_number).length}
              </p>
                        </div>
                      </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search users by ID, name, department, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-students"
            />
          </div>
          <Button onClick={handleAddStudent} data-testid="button-add-student">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </Card>

      <Card>
        <div className="p-6">
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredStudents.length} of {students.length} students
          </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>User Type</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((student) => (
                    <TableRow key={student.unique_id} data-testid={`row-student-${student.unique_id}`}>
                      <TableCell className="font-mono text-sm">{student.unique_id}</TableCell>
                      <TableCell className="font-medium">{student.user_name}</TableCell>
                      <TableCell className="text-sm">{student.Department}</TableCell>
                      <TableCell>{student.User_Type}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {student.vehicle_number || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={student.is_active ? "default" : "secondary"}>
                          {student.is_active ? "Active" : "Inactive"}
                      </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                      <Button
                        variant="ghost"
                            size="icon"
                            onClick={() => handleEditStudent(student.unique_id)}
                            data-testid={`button-edit-${student.unique_id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteStudent(student.unique_id)}
                            data-testid={`button-delete-${student.unique_id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      {/* Add User Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the authorized users database.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="unique_id">Student ID or Staff ID *</Label>
              <Input
                id="unique_id"
                placeholder="e.g., 231020XX"
                value={newStudent.unique_id}
                onChange={(e) => setNewStudent(prev => ({ ...prev, unique_id: e.target.value }))}
                data-testid="input-student-id"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="user_name">Full Name *</Label>
              <Input
                id="user_name"
                placeholder="e.g., John Doe"
                value={newStudent.user_name}
                onChange={(e) => setNewStudent(prev => ({ ...prev, user_name: e.target.value }))}
                data-testid="input-student-name"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="Department">Department *</Label>
              <Select
                value={newStudent.Department}
                onValueChange={(value) => setNewStudent(prev => ({ ...prev, Department: value }))}
              >
                <SelectTrigger data-testid="select-department">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="User_Type">User Type</Label>
              <Select
                value={newStudent.User_Type}
                onValueChange={(value: "Student" | "Staff") => 
                  setNewStudent(prev => ({ ...prev, User_Type: value }))
                }
              >
                <SelectTrigger data-testid="select-user-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Student">Student</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="vehicle_number">Vehicle Number (Optional)</Label>
              <Input
                id="vehicle_number"
                placeholder="e.g., MH12AB1234"
                value={newStudent.vehicle_number}
                onChange={(e) => setNewStudent(prev => ({ ...prev, vehicle_number: e.target.value }))}
                data-testid="input-vehicle-number"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitNewStudent}
              disabled={isSubmitting}
              data-testid="button-submit-student"
            >
              {isSubmitting ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information in the authorized users database.
            </DialogDescription>
          </DialogHeader>
          
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-unique_id">Student ID or Staff ID *</Label>
                <Input
                  id="edit-unique_id"
                  placeholder="e.g., 231020XX"
                  value={editingUser.unique_id}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, unique_id: e.target.value } : null)}
                  data-testid="input-edit-student-id"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-user_name">Full Name *</Label>
                <Input
                  id="edit-user_name"
                  placeholder="e.g., John Doe"
                  value={editingUser.user_name}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, user_name: e.target.value } : null)}
                  data-testid="input-edit-student-name"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-Department">Department *</Label>
                <Select
                  value={editingUser.Department}
                  onValueChange={(value) => setEditingUser(prev => prev ? { ...prev, Department: value } : null)}
                >
                  <SelectTrigger data-testid="select-edit-department">
                    <SelectValue placeholder="Select Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-User_Type">User Type</Label>
                <Select
                  value={editingUser.User_Type}
                  onValueChange={(value: "Student" | "Staff") => 
                    setEditingUser(prev => prev ? { ...prev, User_Type: value } : null)
                  }
                >
                  <SelectTrigger data-testid="select-edit-user-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Student">Student</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="edit-vehicle_number">Vehicle Number (Optional)</Label>
                <Input
                  id="edit-vehicle_number"
                  placeholder="e.g., MH12AB1234"
                  value={editingUser.vehicle_number || ""}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, vehicle_number: e.target.value } : null)}
                  data-testid="input-edit-vehicle-number"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-is_active"
                  checked={editingUser.is_active}
                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, is_active: e.target.checked } : null)}
                  className="rounded"
                />
                <Label htmlFor="edit-is_active">Active User</Label>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingUser(null);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={isSubmitting}
              data-testid="button-update-user"
            >
              {isSubmitting ? "Updating..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteUser}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

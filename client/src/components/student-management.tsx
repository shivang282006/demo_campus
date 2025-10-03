import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Trash2 } from "lucide-react";
import AddStudentModal from "@/components/add-student-modal";
import type { StudentWithVehicle } from "@shared/schema";

export default function StudentManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: students, refetch } = useQuery<StudentWithVehicle[]>({
    queryKey: ["/api/students", { query: searchQuery, department: selectedDepartment, year: selectedYear }],
  });

  const departments = ["Computer Engineering", "Electronics", "Mechanical", "Civil"];
  const years = ["First Year", "Second Year", "Third Year", "Final Year"];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <div className="p-8">
      <Card>
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Student Database Management</h3>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2"
            data-testid="button-add-student"
          >
            <Plus className="w-5 h-5" />
            <span>Add Student</span>
          </Button>
        </div>
        
        <CardContent className="p-6">
          {/* Search & Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by name, ID, or vehicle number..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="select-department"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 bg-muted border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              data-testid="select-year"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          
          {/* Student Records Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students?.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-muted/30 transition-colors"
                    data-testid={`student-row-${index}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt="Student photo" 
                            className="w-10 h-10 rounded-full object-cover" 
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium text-muted-foreground">
                              {student.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.year}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.studentId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.department}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                      {student.vehicle?.plateNumber || "No vehicle"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.contactNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={student.isActive ? "default" : "destructive"}>
                        {student.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary hover:text-primary/80 mr-2"
                        data-testid={`button-edit-student-${index}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive/80"
                        data-testid={`button-delete-student-${index}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {(!students || students.length === 0) && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="text-center">
                        <p className="text-muted-foreground">No students found</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {searchQuery || selectedDepartment || selectedYear
                            ? "Try adjusting your search filters"
                            : "Add students to get started"
                          }
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {students && students.length > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {students.length} student{students.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" disabled>
                  Previous
                </Button>
                <Button variant="outline" className="bg-primary text-primary-foreground">
                  1
                </Button>
                <Button variant="outline" disabled>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          refetch();
          setIsAddModalOpen(false);
        }}
      />
    </div>
  );
}

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, ilike, or, gte, lt } from "drizzle-orm";
import { 
  students, vehicles, accessLogs, alerts,
  type Student, type InsertStudent,
  type Vehicle, type InsertVehicle,
  type AccessLog, type InsertAccessLog,
  type Alert, type InsertAlert,
  type StudentWithVehicle, type AccessLogWithDetails
} from "@shared/schema";

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const db = hasDatabaseUrl ? drizzle(neon(process.env.DATABASE_URL!)) : undefined as unknown as ReturnType<typeof drizzle>;

export interface IStorage {
  // Student operations
  getStudent(id: string): Promise<Student | undefined>;
  getStudentByStudentId(studentId: string): Promise<StudentWithVehicle | undefined>;
  createStudent(student: InsertStudent): Promise<Student>;
  updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;
  searchStudents(query: string, department?: string, year?: string): Promise<StudentWithVehicle[]>;
  
  // Vehicle operations
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByPlate(plateNumber: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle>;
  
  // Access log operations
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  getRecentAccessLogs(limit?: number): Promise<AccessLogWithDetails[]>;
  getAccessLogsByStudent(studentId: string): Promise<AccessLogWithDetails[]>;
  
  // Alert operations
  createAlert(alert: InsertAlert): Promise<Alert>;
  getRecentAlerts(limit?: number): Promise<Alert[]>;
  markAlertAsRead(id: string): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalAccess: number;
    granted: number;
    denied: number;
    activeGates: number;
  }>;
  
  // Verification
  verifyStudentAndVehicle(studentId: string, plateNumber: string): Promise<{
    student: StudentWithVehicle | null;
    vehicle: Vehicle | null;
    isValid: boolean;
    reason?: string;
  }>;
}

export class DrizzleStorage implements IStorage {
  async getStudent(id: string): Promise<Student | undefined> {
    const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
    return result[0];
  }

  async getStudentByStudentId(studentId: string): Promise<StudentWithVehicle | undefined> {
    const result = await db
      .select()
      .from(students)
      .leftJoin(vehicles, eq(students.id, vehicles.studentId))
      .where(eq(students.studentId, studentId))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    const studentData = result[0].students;
    const vehicleData = result[0].vehicles;
    
    return {
      ...studentData,
      vehicle: vehicleData || undefined,
    };
  }

  async createStudent(student: InsertStudent): Promise<Student> {
    const result = await db.insert(students).values(student).returning();
    return result[0];
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const result = await db
      .update(students)
      .set(student)
      .where(eq(students.id, id))
      .returning();
    return result[0];
  }

  async deleteStudent(id: string): Promise<void> {
    await db.delete(students).where(eq(students.id, id));
  }

  async searchStudents(query: string, department?: string, year?: string): Promise<StudentWithVehicle[]> {
    let whereClause = or(
      ilike(students.name, `%${query}%`),
      ilike(students.studentId, `%${query}%`)
    );

    if (department) {
      whereClause = and(whereClause, eq(students.department, department));
    }

    if (year) {
      whereClause = and(whereClause, eq(students.year, year));
    }

    const result = await db
      .select()
      .from(students)
      .leftJoin(vehicles, eq(students.id, vehicles.studentId))
      .where(whereClause)
      .orderBy(students.name);

    const studentsMap = new Map<string, StudentWithVehicle>();
    
    for (const row of result) {
      const student = row.students;
      const vehicle = row.vehicles;
      
      if (!studentsMap.has(student.id)) {
        studentsMap.set(student.id, {
          ...student,
          vehicle: vehicle || undefined,
        });
      }
    }

    return Array.from(studentsMap.values());
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return result[0];
  }

  async getVehicleByPlate(plateNumber: string): Promise<Vehicle | undefined> {
    const result = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.plateNumber, plateNumber))
      .limit(1);
    return result[0];
  }

  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const result = await db.insert(vehicles).values(vehicle).returning();
    return result[0];
  }

  async updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const result = await db
      .update(vehicles)
      .set(vehicle)
      .where(eq(vehicles.id, id))
      .returning();
    return result[0];
  }

  async createAccessLog(log: InsertAccessLog): Promise<AccessLog> {
    const result = await db.insert(accessLogs).values(log).returning();
    return result[0];
  }

  async getRecentAccessLogs(limit = 50): Promise<AccessLogWithDetails[]> {
    const result = await db
      .select()
      .from(accessLogs)
      .leftJoin(students, eq(accessLogs.studentId, students.id))
      .leftJoin(vehicles, eq(accessLogs.vehicleId, vehicles.id))
      .orderBy(desc(accessLogs.timestamp))
      .limit(limit);

    return result.map(row => ({
      ...row.access_logs,
      student: row.students || undefined,
      vehicle: row.vehicles || undefined,
    }));
  }

  async getAccessLogsByStudent(studentId: string): Promise<AccessLogWithDetails[]> {
    const result = await db
      .select()
      .from(accessLogs)
      .leftJoin(students, eq(accessLogs.studentId, students.id))
      .leftJoin(vehicles, eq(accessLogs.vehicleId, vehicles.id))
      .where(eq(accessLogs.studentId, studentId))
      .orderBy(desc(accessLogs.timestamp));

    return result.map(row => ({
      ...row.access_logs,
      student: row.students || undefined,
      vehicle: row.vehicles || undefined,
    }));
  }

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const result = await db.insert(alerts).values(alert).returning();
    return result[0];
  }

  async getRecentAlerts(limit = 20): Promise<Alert[]> {
    const result = await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt))
      .limit(limit);
    return result;
  }

  async markAlertAsRead(id: string): Promise<void> {
    await db.update(alerts).set({ isRead: true }).where(eq(alerts.id, id));
  }

  async getDashboardStats(): Promise<{
    totalAccess: number;
    granted: number;
    denied: number;
    activeGates: number;
  }> {
    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayLogs = await db
      .select()
      .from(accessLogs)
      .where(and(
        gte(accessLogs.timestamp, today),
        lt(accessLogs.timestamp, tomorrow)
      ));

    const granted = todayLogs.filter(log => log.accessStatus === 'granted').length;
    const denied = todayLogs.filter(log => log.accessStatus === 'denied').length;

    return {
      totalAccess: todayLogs.length,
      granted,
      denied,
      activeGates: 2, // Static for now - could be dynamic based on gate status
    };
  }

  async verifyStudentAndVehicle(studentId: string, plateNumber: string): Promise<{
    student: StudentWithVehicle | null;
    vehicle: Vehicle | null;
    isValid: boolean;
    reason?: string;
  }> {
    const student = await this.getStudentByStudentId(studentId);
    const vehicle = await this.getVehicleByPlate(plateNumber);

    if (!student) {
      return {
        student: null,
        vehicle: null,
        isValid: false,
        reason: 'Student ID not found',
      };
    }

    if (!vehicle) {
      return {
        student,
        vehicle: null,
        isValid: false,
        reason: 'Vehicle not registered',
      };
    }

    if (vehicle.studentId !== student.id) {
      return {
        student,
        vehicle,
        isValid: false,
        reason: 'Vehicle does not belong to this student',
      };
    }

    if (!student.isActive || !vehicle.isActive) {
      return {
        student,
        vehicle,
        isValid: false,
        reason: 'Student or vehicle is inactive',
      };
    }

    return {
      student,
      vehicle,
      isValid: true,
    };
  }
}

// In-memory fallback storage for development without DATABASE_URL
class MemoryStorage implements IStorage {
  private students: Map<string, Student> = new Map();
  private vehicles: Map<string, Vehicle> = new Map();
  private accessLogs: Map<string, AccessLog> = new Map();
  private alerts: Map<string, Alert> = new Map();

  async getStudent(id: string): Promise<Student | undefined> {
    return this.students.get(id);
  }

  async getStudentByStudentId(studentId: string): Promise<StudentWithVehicle | undefined> {
    const student = Array.from(this.students.values()).find(s => s.studentId === studentId);
    if (!student) return undefined;
    const vehicle = Array.from(this.vehicles.values()).find(v => v.studentId === student.id);
    return { ...student, vehicle };
  }

  async createStudent(studentInput: InsertStudent): Promise<Student> {
    // ensure unique studentId
    const existing = Array.from(this.students.values()).find(s => s.studentId === studentInput.studentId);
    if (existing) throw new Error("studentId must be unique");
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const student: Student = {
      id,
      createdAt: new Date(),
      isActive: true,
      photoUrl: null as any, // will be set after spread if provided
      ...studentInput,
    } as unknown as Student;
    this.students.set(id, student);
    return student;
  }

  async updateStudent(id: string, student: Partial<InsertStudent>): Promise<Student> {
    const existing = this.students.get(id);
    if (!existing) throw new Error("Student not found");
    const updated = { ...existing, ...student } as Student;
    this.students.set(id, updated);
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    this.students.delete(id);
    // cascade delete vehicles referencing this student
    for (const [vid, v] of this.vehicles) {
      if (v.studentId === id) this.vehicles.delete(vid);
    }
  }

  async searchStudents(query: string, department?: string, year?: string): Promise<StudentWithVehicle[]> {
    const q = query.toLowerCase();
    let results = Array.from(this.students.values()).filter(s =>
      s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
    if (department) results = results.filter(s => s.department === department);
    if (year) results = results.filter(s => s.year === year);
    return results.map(s => ({
      ...s,
      vehicle: Array.from(this.vehicles.values()).find(v => v.studentId === s.id),
    }));
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async getVehicleByPlate(plateNumber: string): Promise<Vehicle | undefined> {
    return Array.from(this.vehicles.values()).find(v => v.plateNumber === plateNumber);
  }

  async createVehicle(vehicleInput: InsertVehicle): Promise<Vehicle> {
    // unique plate
    const exists = Array.from(this.vehicles.values()).some(v => v.plateNumber === vehicleInput.plateNumber);
    if (exists) throw new Error("plateNumber must be unique");
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const vehicle: Vehicle = {
      id,
      createdAt: new Date(),
      isActive: true,
      ...vehicleInput,
    } as unknown as Vehicle;
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: string, vehicle: Partial<InsertVehicle>): Promise<Vehicle> {
    const existing = this.vehicles.get(id);
    if (!existing) throw new Error("Vehicle not found");
    const updated = { ...existing, ...vehicle } as Vehicle;
    this.vehicles.set(id, updated);
    return updated;
    }

  async createAccessLog(logInput: InsertAccessLog): Promise<AccessLog> {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const log: AccessLog = {
      id,
      timestamp: new Date(),
      metadata: null as any,
      ...logInput,
    } as unknown as AccessLog;
    this.accessLogs.set(id, log);
    return log;
  }

  async getRecentAccessLogs(limit = 50): Promise<AccessLogWithDetails[]> {
    const logs = Array.from(this.accessLogs.values())
      .sort((a, b) => (new Date(b.timestamp).getTime()) - (new Date(a.timestamp).getTime()))
      .slice(0, limit);
    return logs.map(l => ({
      ...l,
      student: l.studentId ? this.students.get(l.studentId) : undefined,
      vehicle: l.vehicleId ? this.vehicles.get(l.vehicleId) : undefined,
    }));
  }

  async getAccessLogsByStudent(studentId: string): Promise<AccessLogWithDetails[]> {
    const logs = Array.from(this.accessLogs.values()).filter(l => l.studentId === studentId)
      .sort((a, b) => (new Date(b.timestamp).getTime()) - (new Date(a.timestamp).getTime()));
    return logs.map(l => ({
      ...l,
      student: l.studentId ? this.students.get(l.studentId) : undefined,
      vehicle: l.vehicleId ? this.vehicles.get(l.vehicleId) : undefined,
    }));
  }

  async createAlert(alertInput: InsertAlert): Promise<Alert> {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const alert: Alert = {
      id,
      isRead: false,
      createdAt: new Date(),
      metadata: null as any,
      ...alertInput,
    } as unknown as Alert;
    this.alerts.set(id, alert);
    return alert;
  }

  async getRecentAlerts(limit = 20): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .sort((a, b) => (new Date(b.createdAt).getTime()) - (new Date(a.createdAt).getTime()))
      .slice(0, limit);
  }

  async markAlertAsRead(id: string): Promise<void> {
    const alert = this.alerts.get(id);
    if (alert) {
      this.alerts.set(id, { ...alert, isRead: true });
    }
  }

  async getDashboardStats(): Promise<{ totalAccess: number; granted: number; denied: number; activeGates: number; }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayLogs = Array.from(this.accessLogs.values()).filter(l => {
      const t = new Date(l.timestamp).getTime();
      return t >= today.getTime() && t < tomorrow.getTime();
    });
    const granted = todayLogs.filter(l => l.accessStatus === 'granted').length;
    const denied = todayLogs.filter(l => l.accessStatus === 'denied').length;
    return { totalAccess: todayLogs.length, granted, denied, activeGates: 2 };
  }

  async verifyStudentAndVehicle(studentId: string, plateNumber: string) {
    const studentWithVehicle = await this.getStudentByStudentId(studentId);
    const vehicle = await this.getVehicleByPlate(plateNumber);
    if (!studentWithVehicle) {
      return { student: null, vehicle: null, isValid: false, reason: 'Student ID not found' };
    }
    if (!vehicle) {
      return { student: studentWithVehicle, vehicle: null, isValid: false, reason: 'Vehicle not registered' };
    }
    if (vehicle.studentId !== studentWithVehicle.id) {
      return { student: studentWithVehicle, vehicle, isValid: false, reason: 'Vehicle does not belong to this student' };
    }
    if (!studentWithVehicle.isActive || !vehicle.isActive) {
      return { student: studentWithVehicle, vehicle, isValid: false, reason: 'Student or vehicle is inactive' };
    }
    return { student: studentWithVehicle, vehicle, isValid: true };
  }
}

export const storage: IStorage = hasDatabaseUrl ? new DrizzleStorage() : new MemoryStorage();

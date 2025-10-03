import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, ilike, or } from "drizzle-orm";
import { 
  students, vehicles, accessLogs, alerts,
  type Student, type InsertStudent,
  type Vehicle, type InsertVehicle,
  type AccessLog, type InsertAccessLog,
  type Alert, type InsertAlert,
  type StudentWithVehicle, type AccessLogWithDetails
} from "@shared/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

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
        sql`${accessLogs.timestamp} >= ${today}`,
        sql`${accessLogs.timestamp} < ${tomorrow}`
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

export const storage = new DrizzleStorage();

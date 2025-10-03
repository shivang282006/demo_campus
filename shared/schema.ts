import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: text("student_id").notNull().unique(),
  name: text("name").notNull(),
  rollNumber: text("roll_number").notNull(),
  department: text("department").notNull(),
  year: text("year").notNull(),
  division: text("division").notNull(),
  contactNumber: text("contact_number").notNull(),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id).notNull(),
  plateNumber: text("plate_number").notNull().unique(),
  vehicleType: text("vehicle_type").notNull(),
  model: text("model"),
  color: text("color"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").references(() => students.id),
  vehicleId: varchar("vehicle_id").references(() => vehicles.id),
  plateNumber: text("plate_number"),
  gateLocation: text("gate_location").notNull(),
  accessStatus: text("access_status").notNull(), // 'granted' | 'denied'
  reason: text("reason"),
  timestamp: timestamp("timestamp").default(sql`now()`),
  metadata: jsonb("metadata"), // Additional data like confidence scores
});

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'unauthorized_access' | 'scan_failed' | 'system_update'
  severity: text("severity").notNull(), // 'critical' | 'warning' | 'info'
  title: text("title").notNull(),
  description: text("description").notNull(),
  gateLocation: text("gate_location"),
  metadata: jsonb("metadata"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Insert schemas
export const insertStudentSchema = createInsertSchema(students).omit({
  id: true,
  createdAt: true,
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Extended types with relations
export type StudentWithVehicle = Student & {
  vehicle?: Vehicle;
};

export type AccessLogWithDetails = AccessLog & {
  student?: Student;
  vehicle?: Vehicle;
};

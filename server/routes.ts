import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertStudentSchema, insertVehicleSchema, insertAccessLogSchema, insertAlertSchema } from "@shared/schema";

interface WebSocketMessage {
  type: string;
  data: any;
}

const connectedClients = new Set<WebSocket>();

function broadcast(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Student routes
  app.get("/api/students", async (req, res) => {
    try {
      const { query, department, year } = req.query;
      const students = await storage.searchStudents(
        (query as string) || "",
        department as string,
        year as string
      );
      res.json(students);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch students" });
    }
  });

  app.get("/api/students/:studentId", async (req, res) => {
    try {
      const student = await storage.getStudentByStudentId(req.params.studentId);
      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }
      res.json(student);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch student" });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      const studentData = insertStudentSchema.parse(req.body.student);
      const vehicleData = insertVehicleSchema.parse(req.body.vehicle);
      
      const student = await storage.createStudent(studentData);
      const vehicle = await storage.createVehicle({
        ...vehicleData,
        studentId: student.id,
      });
      
      const studentWithVehicle = { ...student, vehicle };
      
      // Broadcast new student addition
      broadcast({
        type: 'student_added',
        data: studentWithVehicle,
      });
      
      res.json(studentWithVehicle);
    } catch (error) {
      res.status(400).json({ error: "Invalid student data" });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      const studentData = insertStudentSchema.partial().parse(req.body);
      const student = await storage.updateStudent(req.params.id, studentData);
      res.json(student);
    } catch (error) {
      res.status(400).json({ error: "Invalid student data" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      await storage.deleteStudent(req.params.id);
      
      // Broadcast student deletion
      broadcast({
        type: 'student_deleted',
        data: { id: req.params.id },
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete student" });
    }
  });

  // Access verification
  app.post("/api/verify-access", async (req, res) => {
    try {
      const { studentId, plateNumber, gateLocation } = req.body;
      
      if (!studentId || !plateNumber || !gateLocation) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const verification = await storage.verifyStudentAndVehicle(studentId, plateNumber);
      const accessStatus = verification.isValid ? 'granted' : 'denied';
      
      // Log the access attempt
      const accessLog = await storage.createAccessLog({
        studentId: verification.student?.id || null,
        vehicleId: verification.vehicle?.id || null,
        plateNumber,
        gateLocation,
        accessStatus,
        reason: verification.reason,
        metadata: { confidence: 100 },
      });
      
      // Create alert if access denied
      if (!verification.isValid) {
        const alert = await storage.createAlert({
          type: 'unauthorized_access',
          severity: 'critical',
          title: 'Unauthorized Access Attempt',
          description: `${verification.reason} - Vehicle: ${plateNumber}`,
          gateLocation,
          metadata: { studentId, plateNumber },
        });
        
        // Broadcast alert
        broadcast({
          type: 'new_alert',
          data: alert,
        });
      }
      
      // Broadcast access log
      const logWithDetails = {
        ...accessLog,
        student: verification.student,
        vehicle: verification.vehicle,
      };
      
      broadcast({
        type: 'access_log',
        data: logWithDetails,
      });
      
      res.json({
        ...verification,
        accessLog: logWithDetails,
      });
    } catch (error) {
      console.error('Verification error:', error);
      res.status(500).json({ error: "Failed to verify access" });
    }
  });

  // Access logs
  app.get("/api/access-logs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getRecentAccessLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch access logs" });
    }
  });

  // Alerts
  app.get("/api/alerts", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const alerts = await storage.getRecentAlerts(limit);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.put("/api/alerts/:id/read", async (req, res) => {
    try {
      await storage.markAlertAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  // Manual access control
  app.post("/api/grant-access", async (req, res) => {
    try {
      const { studentId, plateNumber, gateLocation } = req.body;
      
      const student = await storage.getStudentByStudentId(studentId);
      const vehicle = await storage.getVehicleByPlate(plateNumber);
      
      const accessLog = await storage.createAccessLog({
        studentId: student?.id || null,
        vehicleId: vehicle?.id || null,
        plateNumber,
        gateLocation,
        accessStatus: 'granted',
        reason: 'Manual approval',
        metadata: { manual: true },
      });
      
      const logWithDetails = {
        ...accessLog,
        student,
        vehicle,
      };
      
      broadcast({
        type: 'access_granted',
        data: logWithDetails,
      });
      
      res.json({ success: true, accessLog: logWithDetails });
    } catch (error) {
      res.status(500).json({ error: "Failed to grant access" });
    }
  });

  app.post("/api/deny-access", async (req, res) => {
    try {
      const { studentId, plateNumber, gateLocation, reason } = req.body;
      
      const student = studentId ? await storage.getStudentByStudentId(studentId) : null;
      const vehicle = plateNumber ? await storage.getVehicleByPlate(plateNumber) : null;
      
      const accessLog = await storage.createAccessLog({
        studentId: student?.id || null,
        vehicleId: vehicle?.id || null,
        plateNumber: plateNumber || 'Unknown',
        gateLocation,
        accessStatus: 'denied',
        reason: reason || 'Manual denial',
        metadata: { manual: true },
      });
      
      // Create alert
      const alert = await storage.createAlert({
        type: 'unauthorized_access',
        severity: 'critical',
        title: 'Access Manually Denied',
        description: `${reason || 'Manual denial'} - Vehicle: ${plateNumber || 'Unknown'}`,
        gateLocation,
        metadata: { studentId, plateNumber, manual: true },
      });
      
      const logWithDetails = {
        ...accessLog,
        student,
        vehicle,
      };
      
      broadcast({
        type: 'access_denied',
        data: logWithDetails,
      });
      
      broadcast({
        type: 'new_alert',
        data: alert,
      });
      
      res.json({ success: true, accessLog: logWithDetails, alert });
    } catch (error) {
      res.status(500).json({ error: "Failed to deny access" });
    }
  });

  const httpServer = createServer(app);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    connectedClients.add(ws);

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      connectedClients.delete(ws);
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received WebSocket message:', message);
        
        // Handle ping/pong for connection health
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Send initial connection success
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  return httpServer;
}

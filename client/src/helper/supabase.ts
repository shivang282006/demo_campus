// @ts-ignore
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bsguvhudffrxjvcpxnte.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzZ3V2aHVkZmZyeGp2Y3B4bnRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDAwMDksImV4cCI6MjA3NTA3NjAwOX0.7ki6D6jiAA539liU0XSIbm5C4SaUHFf_1D5feBkzXdo'

export const supabaseClient = createClient(supabaseUrl, supabaseKey)

// Database schema types based on your Supabase tables
export const TABLES = {
  AUTHORIZED_USERS: 'authorized_users',
  ACCESS_LOGS: 'access_logs'
} as const

// Helper functions for common operations
export const db = {
  // Get all authorized users
  async getAuthorizedUsers() {
    const { data, error } = await supabaseClient
      .from(TABLES.AUTHORIZED_USERS)
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get user by unique_id
  async getUserById(uniqueId: string) {
    const { data, error } = await supabaseClient
      .from(TABLES.AUTHORIZED_USERS)
      .select('*')
      .eq('unique_id', uniqueId)
      .single()
    
    if (error) throw error
    return data
  },

  // Get user by vehicle number
  async getUserByVehicle(vehicleNumber: string) {
    const { data, error } = await supabaseClient
      .from(TABLES.AUTHORIZED_USERS)
      .select('*')
      .eq('vehicle_number', vehicleNumber)
      .single()
    
    if (error) throw error
    return data
  },

  // Create new access log entry
  async createAccessLog(logData: { idScanned: string; plateRecognized: string; accessGranted: boolean }) {
    const { data, error } = await supabaseClient
      .from(TABLES.ACCESS_LOGS)
      .insert([{
        timestamp: new Date().toISOString(),
        id_scanned: logData.idScanned,
        plate_recognized: logData.plateRecognized,
        access_granted: logData.accessGranted
      }])
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get access logs with pagination
  async getAccessLogs(limit = 50, offset = 0) {
    const { data, error } = await supabaseClient
      .from(TABLES.ACCESS_LOGS)
      .select(`
        *,
        authorized_users!access_logs_id_scanned_fkey (
          unique_id,
          user_name,
          vehicle_number,
          Department,
          User_Type
        )
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1)
    
    if (error) throw error
    return data
  },

  // Get recent access logs (last 24 hours)
  async getRecentAccessLogs() {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const { data, error } = await supabaseClient
      .from(TABLES.ACCESS_LOGS)
      .select(`
        *,
        authorized_users!access_logs_id_scanned_fkey (
          unique_id,
          user_name,
          vehicle_number,
          Department,
          User_Type
        )
      `)
      .gte('timestamp', yesterday.toISOString())
      .order('timestamp', { ascending: false })
    
    if (error) throw error
    return data
  },

  // Get access statistics
  async getAccessStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayLogs, error: todayError } = await supabaseClient
      .from(TABLES.ACCESS_LOGS)
      .select('access_granted')
      .gte('timestamp', today.toISOString())
    
    if (todayError) throw todayError
    
    const totalEntries = todayLogs.length
    const authorizedEntries = todayLogs.filter(log => log.access_granted).length
    const unauthorizedEntries = totalEntries - authorizedEntries
    
    return {
      totalEntries,
      authorizedEntries,
      unauthorizedEntries,
      successRate: totalEntries > 0 ? (authorizedEntries / totalEntries * 100).toFixed(1) : 0
    }
  }
}

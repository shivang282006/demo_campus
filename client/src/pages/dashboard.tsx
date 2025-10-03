import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { Shield, Users, Camera, FileText, Bell, Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import StudentVerification from "@/components/student-verification";
import AccessLogs from "@/components/access-logs";
import LiveAlerts from "@/components/live-alerts";
import StudentManagement from "@/components/student-management";

interface DashboardStats {
  totalAccess: number;
  granted: number;
  denied: number;
  activeGates: number;
}

export default function Dashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const { data: stats, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'access_log' || lastMessage.type === 'access_granted' || lastMessage.type === 'access_denied') {
        refetchStats();
      }
    }
  }, [lastMessage, refetchStats]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield, active: true },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Camera },
    { id: 'entry-logs', label: 'Entry Logs', icon: FileText },
    { id: 'students', label: 'Students Database', icon: Users },
    { id: 'alerts', label: 'Alert History', icon: Bell, badge: stats ? stats.denied : 0 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Logo & Title */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">APSIT Security</h1>
              <p className="text-xs text-muted-foreground">Access Control</p>
            </div>
          </div>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-md font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              data-testid={`nav-${item.id}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {item.badge}
                </Badge>
              )}
            </button>
          ))}
        </nav>
        
        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3 px-4 py-3">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Security Officer</p>
              <p className="text-xs text-muted-foreground">Gate Monitor</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header Bar */}
        <header className="bg-card border-b border-border px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Security Dashboard</h2>
              <p className="text-sm text-muted-foreground">Real-time campus access monitoring</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* System Status Indicator */}
              <div className="flex items-center space-x-2 px-4 py-2 bg-success/10 border border-success/20 rounded-lg">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-success">System Active</span>
              </div>
              
              {/* Date & Time */}
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{formatDate(currentTime)}</p>
                <p className="text-xs text-muted-foreground">{formatTime(currentTime)}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        {activeTab === 'dashboard' && (
          <div className="p-8 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Access Today</p>
                      <p className="text-3xl font-bold text-foreground mt-2" data-testid="total-access">
                        {stats?.totalAccess ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className="text-success">+12.5%</span>
                    <span className="text-muted-foreground ml-2">from yesterday</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Access Granted</p>
                      <p className="text-3xl font-bold text-success mt-2" data-testid="access-granted">
                        {stats?.granted ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                      <Shield className="w-6 h-6 text-success" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className="text-muted-foreground">
                      {stats?.totalAccess ? `${((stats.granted / stats.totalAccess) * 100).toFixed(1)}%` : '0%'} approval rate
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Access Denied</p>
                      <p className="text-3xl font-bold text-destructive mt-2" data-testid="access-denied">
                        {stats?.denied ?? 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center">
                      <Bell className="w-6 h-6 text-destructive" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className="text-destructive">
                      {stats?.denied ? `${stats.denied} new alerts` : 'No alerts'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Gates</p>
                      <p className="text-3xl font-bold text-foreground mt-2" data-testid="active-gates">
                        {stats?.activeGates ?? 0}/2
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Camera className="w-6 h-6 text-accent-foreground" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center text-xs">
                    <span className="text-success">All systems operational</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Current Verification */}
            <StudentVerification />

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AccessLogs />
              </div>
              <div>
                <LiveAlerts />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'students' && <StudentManagement />}
        {activeTab === 'entry-logs' && <AccessLogs />}
        {activeTab === 'alerts' && <LiveAlerts />}
        {activeTab === 'live-monitoring' && (
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Live Camera Monitoring</h3>
              <p className="text-muted-foreground">Use the camera station interface for live vehicle and ID scanning</p>
            </div>
            <div className="flex items-center justify-center p-12 bg-muted/20 rounded-lg border-2 border-dashed border-border">
              <div className="text-center">
                <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">Camera Station</h4>
                <p className="text-muted-foreground mb-4">
                  Open the camera station interface on entry point laptops for live monitoring
                </p>
                <button
                  onClick={() => window.open('/camera-station', '_blank')}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  data-testid="button-camera-station"
                >
                  Open Camera Station
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">System Settings</h3>
              <p className="text-muted-foreground">Configure system parameters and preferences</p>
            </div>
            <div className="flex items-center justify-center p-12 bg-muted/20 rounded-lg border-2 border-dashed border-border">
              <div className="text-center">
                <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">Settings Panel</h4>
                <p className="text-muted-foreground">Settings interface coming soon</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

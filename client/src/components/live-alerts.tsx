import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";
import type { Alert } from "@shared/schema";

export default function LiveAlerts() {
  const { data: alerts, refetch } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'new_alert') {
        // Invalidate and refetch alerts when new alert occurs
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      }
    }
  }, [lastMessage]);

  const getAlertIcon = (type: string, severity: string) => {
    const iconClass = "w-5 h-5";
    
    if (severity === 'critical') {
      return <AlertTriangle className={`${iconClass} text-destructive`} />;
    } else if (severity === 'warning') {
      return <AlertCircle className={`${iconClass} text-warning`} />;
    } else {
      return <Info className={`${iconClass} text-primary`} />;
    }
  };

  const getAlertBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      case 'warning':
        return <Badge className="bg-warning text-warning-foreground">Warning</Badge>;
      case 'info':
        return <Badge variant="secondary">Info</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleDateString('en-US');
  };

  const unreadCount = alerts?.filter(alert => !alert.isRead).length || 0;

  return (
    <Card>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Live Alerts</h3>
        {unreadCount > 0 && (
          <Badge variant="destructive" data-testid="badge-unread-alerts">
            {unreadCount} New
          </Badge>
        )}
      </div>
      
      <CardContent className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {alerts?.map((alert, index) => (
          <div
            key={alert.id}
            className={`p-4 rounded-lg border transition-colors ${
              alert.severity === 'critical'
                ? 'bg-destructive/5 border-destructive/20'
                : alert.severity === 'warning'
                ? 'bg-warning/5 border-warning/20'
                : 'bg-primary/5 border-primary/20'
            }`}
            data-testid={`alert-${index}`}
          >
            <div className="flex items-start space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                alert.severity === 'critical'
                  ? 'bg-destructive'
                  : alert.severity === 'warning'
                  ? 'bg-warning'
                  : 'bg-primary'
              }`}>
                {getAlertIcon(alert.type, alert.severity)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-semibold ${
                    alert.severity === 'critical'
                      ? 'text-destructive'
                      : alert.severity === 'warning'
                      ? 'text-warning'
                      : 'text-primary'
                  }`}>
                    {alert.title}
                  </p>
                  {getAlertBadge(alert.severity)}
                </div>
                
                <p className="text-xs text-muted-foreground mb-2">
                  {alert.description}
                </p>
                
                {alert.gateLocation && (
                  <p className="text-xs text-muted-foreground mb-1">
                    <span className="font-medium">Location:</span> {alert.gateLocation}
                  </p>
                )}
                
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(alert.createdAt!)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(alert.createdAt!)}
                    </p>
                  </div>
                  
                  {!alert.isRead && (
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {(!alerts || alerts.length === 0) && (
          <div className="text-center py-8">
            <Info className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No alerts</p>
            <p className="text-sm text-muted-foreground mt-1">
              System alerts will appear here
            </p>
          </div>
        )}
      </CardContent>
      
      {alerts && alerts.length > 0 && (
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="w-full"
            data-testid="button-refresh-alerts"
          >
            Refresh Alerts
          </Button>
        </div>
      )}
    </Card>
  );
}

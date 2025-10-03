import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWebSocket } from "@/hooks/use-websocket";
import { queryClient } from "@/lib/queryClient";
import type { AccessLogWithDetails } from "@shared/schema";

export default function AccessLogs() {
  const { data: logs, refetch } = useQuery<AccessLogWithDetails[]>({
    queryKey: ["/api/access-logs"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'access_log' || lastMessage.type === 'access_granted' || lastMessage.type === 'access_denied') {
        // Invalidate and refetch logs when new access event occurs
        queryClient.invalidateQueries({ queryKey: ["/api/access-logs"] });
      }
    }
  }, [lastMessage]);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'granted':
        return <Badge variant="default" className="bg-success text-success-foreground">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Recent Access Logs</h3>
        <button 
          onClick={() => refetch()}
          className="text-sm text-primary hover:text-primary/80 font-medium"
          data-testid="button-refresh-logs"
        >
          Refresh
        </button>
      </div>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Gate
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs?.map((log, index) => (
                <tr 
                  key={log.id} 
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`access-log-row-${index}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    <div>
                      <p>{formatTime(log.timestamp!)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(log.timestamp!)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                    {log.student?.name || "Unknown"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {log.student?.studentId || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                    {log.plateNumber || log.vehicle?.plateNumber || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {log.gateLocation}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(log.accessStatus)}
                    {log.reason && (
                      <p className="text-xs text-muted-foreground mt-1">{log.reason}</p>
                    )}
                  </td>
                </tr>
              ))}
              
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="text-center">
                      <p className="text-muted-foreground">No access logs found</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Access attempts will appear here
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

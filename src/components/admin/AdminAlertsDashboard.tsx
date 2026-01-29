import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Clock, Mail, RefreshCw, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ExtensionAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  details: unknown;
  user_id: string | null;
  post_id: string | null;
  is_resolved: boolean;
  email_sent: boolean;
  email_sent_at: string | null;
  created_at: string;
  resolved_at: string | null;
}

const ALERT_TYPE_ICONS: Record<string, string> = {
  linkedin_ui_changed: '🔴',
  posting_failed: '❌',
  multi_user_failure: '⚠️',
  extension_error: '🛠️',
  extension_disconnected: '🔌',
};

const SEVERITY_STYLES: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-orange-500 text-white',
  medium: 'bg-yellow-500 text-white',
};

export const AdminAlertsDashboard = () => {
  const { toast } = useToast();
  const [alerts, setAlerts] = useState<ExtensionAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('extension_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter === 'unresolved') {
        query = query.eq('is_resolved', false);
      } else if (filter === 'resolved') {
        query = query.eq('is_resolved', true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts((data || []) as ExtensionAlert[]);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      toast({
        title: 'Error',
        description: 'Failed to load alerts',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('extension_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.map(a => 
        a.id === alertId 
          ? { ...a, is_resolved: true, resolved_at: new Date().toISOString() } 
          : a
      ));

      toast({
        title: 'Alert resolved',
        description: 'The alert has been marked as resolved.',
      });
    } catch (err) {
      console.error('Error resolving alert:', err);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('extension-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'extension_alerts',
        },
        (payload) => {
          const newAlert = payload.new as ExtensionAlert;
          setAlerts(prev => [newAlert, ...prev]);
          
          toast({
            title: `🚨 ${newAlert.title}`,
            description: newAlert.message,
            variant: 'destructive',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  const unresolvedCount = alerts.filter(a => !a.is_resolved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Extension Alerts
              {unresolvedCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unresolvedCount} Active
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Critical alerts from the Chrome extension - emails sent to admins
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAlerts}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant={filter === 'unresolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unresolved')}
          >
            Active
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'resolved' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle className="w-12 h-12 mb-4 text-green-500" />
            <p className="text-lg font-medium">No alerts</p>
            <p className="text-sm">Everything is running smoothly</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-4 rounded-lg border transition-colors",
                    alert.is_resolved 
                      ? "bg-muted/50 border-border" 
                      : "bg-destructive/5 border-destructive/20"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">
                        {ALERT_TYPE_ICONS[alert.alert_type] || '⚠️'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-foreground">
                            {alert.title}
                          </span>
                          <Badge 
                            className={cn("text-xs", SEVERITY_STYLES[alert.severity])}
                          >
                            {alert.severity.toUpperCase()}
                          </Badge>
                          {alert.email_sent && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Mail className="w-3 h-3" />
                              Email Sent
                            </Badge>
                          )}
                          {alert.is_resolved && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Resolved
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.message}
                        </p>
                        {alert.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              View Details
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(alert.details, null, 2)}
                            </pre>
                          </details>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
                          </span>
                          <span className="text-muted-foreground/60">
                            {alert.alert_type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {!alert.is_resolved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => resolveAlert(alert.id)}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

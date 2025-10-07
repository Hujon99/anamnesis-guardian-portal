/**
 * This component provides a debugging view for form sessions.
 * It displays recent form sessions with their status, device info, and events.
 * Admins can use this to diagnose issues with form submissions and user experiences.
 */

import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '@/hooks/useSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Smartphone, Monitor, Tablet } from 'lucide-react';

interface FormSessionLog {
  id: string;
  session_id: string;
  entry_id: string | null;
  event_type: string;
  device_type: string;
  browser: string;
  is_touch_device: boolean;
  error_message: string | null;
  created_at: string;
  form_progress_percent: number | null;
}

interface SessionGroup {
  sessionId: string;
  logs: FormSessionLog[];
  firstEvent: FormSessionLog;
  lastEvent: FormSessionLog;
  hasError: boolean;
  wasCompleted: boolean;
}

export const FormSessionDebugView = () => {
  const { supabase } = useSupabaseClient();
  
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['form-session-logs'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase client not available');
      
      const { data, error } = await supabase
        .from('form_session_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      
      // Group by session_id
      const grouped = data.reduce((acc: Record<string, FormSessionLog[]>, log: FormSessionLog) => {
        if (!acc[log.session_id]) {
          acc[log.session_id] = [];
        }
        acc[log.session_id].push(log);
        return acc;
      }, {});
      
      const sessionGroups: SessionGroup[] = Object.entries(grouped).map(([sessionId, logs]) => {
        const sortedLogs = logs.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        return {
          sessionId,
          logs: sortedLogs,
          firstEvent: sortedLogs[0],
          lastEvent: sortedLogs[sortedLogs.length - 1],
          hasError: logs.some(l => l.event_type === 'submission_error'),
          wasCompleted: logs.some(l => l.event_type === 'submission_success')
        };
      });
      
      // Sort by most recent first
      return sessionGroups.sort((a, b) => 
        new Date(b.firstEvent.created_at).getTime() - new Date(a.firstEvent.created_at).getTime()
      ).slice(0, 50);
    }
  });
  
  const getStatusBadge = (session: SessionGroup) => {
    if (session.wasCompleted) {
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Slutförd</Badge>;
    }
    if (session.hasError) {
      return <Badge variant="destructive">Fel uppstod</Badge>;
    }
    return <Badge variant="secondary">Påbörjad</Badge>;
  };
  
  const getDeviceIcon = (deviceType: string) => {
    if (deviceType === 'mobile') return <Smartphone className="h-4 w-4" />;
    if (deviceType === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };
  
  const getDuration = (session: SessionGroup) => {
    const start = new Date(session.firstEvent.created_at).getTime();
    const end = new Date(session.lastEvent.created_at).getTime();
    const seconds = Math.round((end - start) / 1000);
    
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    return `${Math.round(seconds / 3600)}h`;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Laddar sessioner...</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Formulärsessioner (Senaste 50)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Spåra hur användare interagerar med formulär och identifiera problem
        </p>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Enhet</TableHead>
                <TableHead>Starttid</TableHead>
                <TableHead>Varaktighet</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Framsteg</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions && sessions.length > 0 ? (
                sessions.map(session => (
                  <TableRow key={session.sessionId}>
                    <TableCell>{getStatusBadge(session)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getDeviceIcon(session.firstEvent.device_type)}
                        <span className="text-xs text-muted-foreground">
                          {session.firstEvent.device_type}
                        </span>
                        {session.firstEvent.is_touch_device && (
                          <span className="text-xs">📱</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(session.firstEvent.created_at), 'PPp', { locale: sv })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{getDuration(session)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{session.logs.length}</Badge>
                    </TableCell>
                    <TableCell>
                      {session.lastEvent.form_progress_percent ? (
                        <span className="text-sm">{session.lastEvent.form_progress_percent}%</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // TODO: Implement detail modal
                          console.log('Session details:', session);
                        }}
                      >
                        Detaljer
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Inga sessioner hittades ännu
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

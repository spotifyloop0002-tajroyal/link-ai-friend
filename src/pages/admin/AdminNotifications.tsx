import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bell,
  Send,
  Loader2,
  Shield,
  Users,
  User,
  Info,
  AlertTriangle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface AdminUser {
  user_id: string;
  name: string | null;
  email: string | null;
}

const AdminNotifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [notificationType, setNotificationType] = useState("info");
  const [targetAudience, setTargetAudience] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState("");

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id,
          _role: 'admin'
        });

        if (error) {
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);

        if (data === true) {
          await Promise.all([fetchNotifications(), fetchUsers()]);
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setNotifications(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.rpc('get_admin_users_data');
    if (!error && data) {
      setUsers(data.map((u: any) => ({
        user_id: u.user_id,
        name: u.name,
        email: u.email,
      })));
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in title and message",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      if (targetAudience === "all") {
        // Broadcast to all users (user_id = null means global)
        await supabase.from('notifications').insert({
          user_id: null,
          title,
          message,
          type: notificationType,
        });
      } else if (targetAudience === "selected" && selectedUserId) {
        await supabase.from('notifications').insert({
          user_id: selectedUserId,
          title,
          message,
          type: notificationType,
        });
      }

      toast({
        title: "Notification sent!",
        description: targetAudience === "all" 
          ? "Sent to all users" 
          : "Sent to selected user",
      });

      setTitle("");
      setMessage("");
      await fetchNotifications();
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({ title: "Notification deleted" });
      await fetchNotifications();
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "warning": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case "error": return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Shield className="w-16 h-16 text-muted-foreground" />
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Send notifications to users and view notification history
          </p>
        </motion.div>

        {/* Send Notification Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send New Notification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target Audience</label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          All Users
                        </div>
                      </SelectItem>
                      <SelectItem value="selected">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Specific User
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {targetAudience === "selected" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select User</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.user_id} value={user.user_id}>
                            {user.name || user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={notificationType} onValueChange={setNotificationType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="Notification title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea
                  placeholder="Notification message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              <Button onClick={handleSend} disabled={isSending} className="w-full">
                {isSending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications ({notifications.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No notifications sent yet</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifications.map((notif) => (
                      <TableRow key={notif.id}>
                        <TableCell>{getTypeIcon(notif.type)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notif.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {notif.message}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={notif.user_id ? "outline" : "secondary"}>
                            {notif.user_id ? "Individual" : "All Users"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(notif.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(notif.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminNotifications;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Loader2,
  Shield,
  Database,
  Users,
  Bot,
  FileText,
  Bell,
  Lock,
  RefreshCw,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";

const AdminSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStats, setDbStats] = useState({
    users: 0,
    agents: 0,
    posts: 0,
    notifications: 0,
  });
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

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
          await fetchDbStats();
          
          // Check if super admin
          const { data: superAdminData } = await supabase.rpc('is_super_admin', {
            _user_id: user.id
          });
          setIsSuperAdmin(superAdminData === true);
        }
      } catch (err) {
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const fetchDbStats = async () => {
    const [usersRes, agentsRes, postsRes, notifRes] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('agents').select('*', { count: 'exact', head: true }),
      supabase.from('posts').select('*', { count: 'exact', head: true }),
      supabase.from('notifications').select('*', { count: 'exact', head: true }),
    ]);

    setDbStats({
      users: usersRes.count || 0,
      agents: agentsRes.count || 0,
      posts: postsRes.count || 0,
      notifications: notifRes.count || 0,
    });
  };

  const handleRefreshStats = async () => {
    toast({ title: "Refreshing stats..." });
    await fetchDbStats();
    toast({ title: "Stats refreshed!" });
  };

  const handleCreateAdmin = async () => {
    if (!newAdminEmail || !newAdminPassword) {
      toast({ title: "Please enter email and password", variant: "destructive" });
      return;
    }

    if (newAdminPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setIsCreatingAdmin(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-admin-user', {
        body: { email: newAdminEmail, password: newAdminPassword },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to create admin");
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({ title: "Admin user created successfully!" });
      setNewAdminEmail("");
      setNewAdminPassword("");
      await fetchDbStats();
    } catch (error: any) {
      toast({ 
        title: "Failed to create admin", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsCreatingAdmin(false);
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
            <Settings className="w-8 h-8 text-primary" />
            Admin Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure platform settings and view system status
          </p>
        </motion.div>

        {/* Database Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Overview
                </CardTitle>
                <CardDescription>Current record counts in the database</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefreshStats}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{dbStats.users}</p>
                  <p className="text-xs text-muted-foreground">User Profiles</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Bot className="w-6 h-6 mx-auto mb-2 text-secondary" />
                  <p className="text-2xl font-bold">{dbStats.agents}</p>
                  <p className="text-xs text-muted-foreground">Agents</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <FileText className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <p className="text-2xl font-bold">{dbStats.posts}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <Bell className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                  <p className="text-2xl font-bold">{dbStats.notifications}</p>
                  <p className="text-xs text-muted-foreground">Notifications</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                System Status
              </CardTitle>
              <CardDescription>Current platform health and status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span>Database Connection</span>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  Connected
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span>Authentication Service</span>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                  <span>Edge Functions</span>
                </div>
                <Badge variant="outline" className="text-green-500 border-green-500">
                  Running
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Create Admin - Only for Super Admins */}
        {isSuperAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Create Admin User
                </CardTitle>
                <CardDescription>Add a new admin with email and password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="admin-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 6 characters"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={handleCreateAdmin} 
                  disabled={isCreatingAdmin}
                  className="w-full"
                >
                  {isCreatingAdmin ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Admin
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Security Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security Settings
              </CardTitle>
              <CardDescription>Platform security configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Row Level Security (RLS)</Label>
                  <p className="text-sm text-muted-foreground">
                    All tables have RLS enabled for data protection
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Admin Role Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Admin access requires role verification via has_role function
                  </p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Auto-Confirm</Label>
                  <p className="text-sm text-muted-foreground">
                    New users are automatically confirmed (development mode)
                  </p>
                </div>
                <Badge variant="secondary">Development</Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Filter,
  Loader2,
  Shield,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Linkedin,
  Phone,
  Mail,
  Building2,
  Eye,
  Crown,
  AlertCircle,
  Bot,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { AdminNotificationSender } from "@/components/admin/AdminNotificationSender";
import { AdminAlertsDashboard } from "@/components/admin/AdminAlertsDashboard";
import { AdminScheduledPosts } from "@/components/admin/AdminScheduledPosts";

interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  phone_number: string | null;
  linkedin_profile_url: string | null;
  city: string | null;
  country: string | null;
  role: string | null;
  company_name: string | null;
  industry: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  posts_created_count: number;
  posts_scheduled_count: number;
  posts_published_count: number;
  followers_count: number;
  created_at: string;
  last_active_at: string | null;
  onboarding_completed: boolean;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [totalAgents, setTotalAgents] = useState(0);

  // Check if current user is admin
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        // Check admin role using the is_admin function (includes super_admin)
        const { data, error } = await supabase.rpc('is_admin', {
          _user_id: user.id
        });

        if (error) {
          console.error("Role check error:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data === true);

        if (data === true) {
          // Fetch all users data and agents count in parallel
          await fetchAdminData();
        }
      } catch (err) {
        console.error("Admin check error:", err);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAccess();
  }, [navigate]);

  const fetchAdminData = async () => {
    try {
      // Fetch users and agents count in parallel
      const [usersRes, agentsRes] = await Promise.all([
        supabase.rpc('get_admin_users_data'),
        supabase.from('agents').select('*', { count: 'exact', head: true }),
      ]);

      if (usersRes.error) {
        console.error("Fetch users error:", usersRes.error);
        toast({
          title: "Failed to load users",
          description: usersRes.error.message,
          variant: "destructive",
        });
        return;
      }

      setUsers(usersRes.data || []);
      setFilteredUsers(usersRes.data || []);
      setTotalAgents(agentsRes.count || 0);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  // Filter users based on search and filters
  useEffect(() => {
    let filtered = [...users];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name?.toLowerCase().includes(query) ||
          u.email?.toLowerCase().includes(query) ||
          u.company_name?.toLowerCase().includes(query) ||
          u.city?.toLowerCase().includes(query)
      );
    }

    // Plan filter
    if (planFilter !== "all") {
      filtered = filtered.filter((u) => u.subscription_plan === planFilter);
    }

    // Country filter
    if (countryFilter !== "all") {
      filtered = filtered.filter((u) => u.country === countryFilter);
    }

    setFilteredUsers(filtered);
  }, [searchQuery, planFilter, countryFilter, users]);

  // Get unique countries for filter
  const countries = [...new Set(users.map((u) => u.country).filter(Boolean))];

  // Calculate stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => {
    if (!u.last_active_at) return false;
    const lastActive = new Date(u.last_active_at);
    const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceActive <= 7;
  }).length;
  const paidUsers = users.filter((u) => u.subscription_plan !== "free").length;
  const totalPosts = users.reduce((sum, u) => sum + (u.posts_published_count || 0), 0);
  const totalScheduled = users.reduce((sum, u) => sum + (u.posts_scheduled_count || 0), 0);

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
          <p className="text-muted-foreground">You don't have permission to access the admin panel.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, view analytics, and monitor platform activity
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-6 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{totalUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active (7 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold">{activeUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Paid Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-warning" />
                <span className="text-2xl font-bold">{paidUsers}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-secondary" />
                <span className="text-2xl font-bold">{totalAgents}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Posts Published</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                <span className="text-2xl font-bold">{totalPosts}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold">{totalScheduled}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Sender */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <AdminNotificationSender 
            users={users.map(u => ({ 
              user_id: u.user_id, 
              name: u.name, 
              email: u.email 
            }))} 
          />
        </motion.div>

        {/* Extension Alerts Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <AdminAlertsDashboard />
        </motion.div>

        {/* Scheduled Posts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <AdminScheduledPosts />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or company..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
          <Select value={countryFilter} onValueChange={setCountryFilter}>
            <SelectTrigger className="w-40">
              <MapPin className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((country) => (
                <SelectItem key={country} value={country!}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Posts</TableHead>
                <TableHead className="text-center">Followers</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-muted-foreground" />
                      <p className="text-muted-foreground">No users found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.name || "Unknown"}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        {user.company_name && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {user.company_name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.city || user.country ? (
                        <span className="text-sm">
                          {[user.city, user.country].filter(Boolean).join(", ")}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.subscription_plan === "free" ? "secondary" : "default"}
                        className="capitalize"
                      >
                        {user.subscription_plan || "free"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col text-sm">
                        <span>{user.posts_published_count || 0} published</span>
                        <span className="text-xs text-muted-foreground">
                          {user.posts_scheduled_count || 0} scheduled
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.followers_count || 0}
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? format(new Date(user.created_at), "MMM d, yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUser(user)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </motion.div>

        {/* User Details Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Details
              </DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{selectedUser.name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {selectedUser.email || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selectedUser.phone_number || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">LinkedIn</p>
                    {selectedUser.linkedin_profile_url ? (
                      <a
                        href={selectedUser.linkedin_profile_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Linkedin className="w-3 h-3" />
                        View Profile
                      </a>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>

                {/* Location & Company */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {[selectedUser.city, selectedUser.country].filter(Boolean).join(", ") || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {selectedUser.company_name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium capitalize">{selectedUser.industry || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role/Profession</p>
                    <p className="font-medium">{selectedUser.role || "—"}</p>
                  </div>
                </div>

                {/* Subscription */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Subscription</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plan</p>
                      <Badge
                        variant={selectedUser.subscription_plan === "free" ? "secondary" : "default"}
                        className="capitalize mt-1"
                      >
                        {selectedUser.subscription_plan || "free"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Expires</p>
                      <p className="font-medium">
                        {selectedUser.subscription_expires_at
                          ? format(new Date(selectedUser.subscription_expires_at), "MMM d, yyyy")
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">Activity</h4>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedUser.posts_created_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Created</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedUser.posts_scheduled_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedUser.posts_published_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Published</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{selectedUser.followers_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Followers</p>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Signup Date</p>
                    <p className="font-medium">
                      {selectedUser.created_at
                        ? format(new Date(selectedUser.created_at), "PPpp")
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Active</p>
                    <p className="font-medium">
                      {selectedUser.last_active_at
                        ? format(new Date(selectedUser.last_active_at), "PPpp")
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPage;

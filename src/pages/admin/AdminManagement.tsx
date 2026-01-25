import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Loader2,
  UserPlus,
  Users,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  UserCog,
  Crown,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  role: 'admin' | 'super_admin';
  created_at: string;
}

const AdminManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [newAdminRole, setNewAdminRole] = useState<'admin' | 'super_admin'>('admin');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    checkSuperAdminAndLoad();
  }, []);

  const checkSuperAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: superAdminCheck } = await supabase.rpc('is_super_admin', {
        _user_id: user.id
      });

      if (!superAdminCheck) {
        toast({
          title: "Access Denied",
          description: "Only Super Admins can manage other admins",
          variant: "destructive",
        });
        navigate("/admin");
        return;
      }

      setIsSuperAdmin(true);
      await loadAdmins();
    } catch (error) {
      console.error("Error checking super admin:", error);
      navigate("/admin");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      // Get all admin roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .in('role', ['admin', 'super_admin']);

      if (rolesError) throw rolesError;

      // Get user details for each admin
      const adminDetails: AdminUser[] = [];
      for (const role of roles || []) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email, name')
          .eq('user_id', role.user_id)
          .single();

        adminDetails.push({
          id: role.id,
          user_id: role.user_id,
          email: profile?.email || null,
          name: profile?.name || null,
          role: role.role as 'admin' | 'super_admin',
          created_at: role.created_at,
        });
      }

      setAdmins(adminDetails);
    } catch (error) {
      console.error("Error loading admins:", error);
      toast({
        title: "Error",
        description: "Failed to load admin users",
        variant: "destructive",
      });
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      // First, check if user exists by looking up in user_profiles
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('email', newAdminEmail.trim().toLowerCase())
        .single();

      let userId: string;

      if (existingProfile) {
        // User exists, just add role
        userId = existingProfile.user_id;

        // Check if already has admin role
        const { data: existingRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .in('role', ['admin', 'super_admin'])
          .single();

        if (existingRole) {
          toast({
            title: "Already Admin",
            description: "This user already has admin privileges",
            variant: "destructive",
          });
          return;
        }
      } else {
        // Create new user via signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: newAdminEmail.trim(),
          password: newAdminPassword,
          options: {
            emailRedirectTo: window.location.origin,
          }
        });

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error("Failed to create user");

        userId = signUpData.user.id;

        // Create user profile
        await supabase.from('user_profiles').insert({
          user_id: userId,
          email: newAdminEmail.trim().toLowerCase(),
          onboarding_completed: true,
        });
      }

      // Add admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newAdminRole,
        });

      if (roleError) throw roleError;

      toast({
        title: "Admin Created",
        description: `Successfully created ${newAdminRole} account for ${newAdminEmail}`,
      });

      setIsCreateDialogOpen(false);
      setNewAdminEmail("");
      setNewAdminPassword("");
      setNewAdminRole('admin');
      await loadAdmins();
    } catch (error: any) {
      console.error("Error creating admin:", error);
      // Provide specific error messages for common issues
      let errorMessage = error.message || "Failed to create admin user";
      if (error.message?.includes("already been registered") || error.code === "email_exists") {
        errorMessage = "A user with this email already exists. Try adding them as admin using their existing account.";
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', selectedAdmin.id);

      if (error) throw error;

      toast({
        title: "Admin Removed",
        description: `Successfully removed admin access for ${selectedAdmin.email || selectedAdmin.user_id}`,
      });

      setIsDeleteDialogOpen(false);
      setSelectedAdmin(null);
      await loadAdmins();
    } catch (error: any) {
      console.error("Error deleting admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin access",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-500" />
              Admin Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage admin users and their access levels
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadAdmins}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-red-600 hover:bg-red-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-red-500" />
                    Create New Admin
                  </DialogTitle>
                  <DialogDescription>
                    Add a new administrator to the platform
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password (for new users)</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                        className="pl-10 pr-10"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Leave blank if user already exists
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newAdminRole} onValueChange={(v) => setNewAdminRole(v as 'admin' | 'super_admin')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <UserCog className="w-4 h-4" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="super_admin">
                          <div className="flex items-center gap-2">
                            <Crown className="w-4 h-4 text-yellow-500" />
                            Super Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? (
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
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-red-500/10">
                  <Users className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{admins.length}</p>
                  <p className="text-sm text-muted-foreground">Total Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-yellow-500/10">
                  <Crown className="w-6 h-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {admins.filter(a => a.role === 'super_admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Super Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <UserCog className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {admins.filter(a => a.role === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Regular Admins</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Admin List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin Users
              </CardTitle>
              <CardDescription>
                All users with administrative access
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-muted-foreground">No admin users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    admins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">
                          {admin.email || admin.user_id.slice(0, 8) + '...'}
                        </TableCell>
                        <TableCell>{admin.name || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={admin.role === 'super_admin' ? 'default' : 'secondary'}
                            className={admin.role === 'super_admin' ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : ''}
                          >
                            {admin.role === 'super_admin' && <Crown className="w-3 h-3 mr-1" />}
                            {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(admin.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedAdmin(admin);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove admin access for{" "}
                <strong>{selectedAdmin?.email || selectedAdmin?.user_id}</strong>?
                They will lose all administrative privileges.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAdmin}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Removing...
                  </>
                ) : (
                  "Remove Access"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminManagement;

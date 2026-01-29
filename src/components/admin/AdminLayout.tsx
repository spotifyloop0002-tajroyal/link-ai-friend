import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  Bell,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  ArrowLeft,
  Tag,
  CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: BarChart3, label: "Analytics", path: "/admin/analytics" },
  { icon: Tag, label: "Coupons", path: "/admin/coupons" },
  { icon: CreditCard, label: "Payments", path: "/admin/payments" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
  { icon: Shield, label: "Admin Management", path: "/admin/management", superAdminOnly: true },
];

const AdminLayout = ({ children }: AdminLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.rpc('is_super_admin', { _user_id: user.id });
        setIsSuperAdmin(data === true);
      }
    };
    checkSuperAdmin();
  }, []);

  const handleLogout = async () => {
    // Clear extension data before logout for security
    window.postMessage({ type: 'CLEAR_USER_SESSION' }, '*');
    
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  // Filter nav items based on super admin status
  const visibleNavItems = adminNavItems.filter(
    item => !item.superAdminOnly || isSuperAdmin
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Admin Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 text-white transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">Admin Panel</span>
              <p className="text-xs text-slate-400">LinkedBot</p>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide">
            {visibleNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-red-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Back to Dashboard */}
          <div className="p-4 border-t border-slate-700">
            <Button
              variant="outline"
              className="w-full justify-start gap-2 bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Admin section */}
          <div className="p-4 border-t border-slate-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-slate-800 transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-red-600 text-white">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">Admin</p>
                    <p className="text-xs text-slate-400">Super Admin</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  User Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-6 h-16">
            <button
              className="lg:hidden p-2 -ml-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-600" />
              <span className="font-semibold text-foreground">Admin Mode</span>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="hidden sm:flex"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Exit Admin
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;

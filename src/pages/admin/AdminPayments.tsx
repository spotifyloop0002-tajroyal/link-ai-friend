import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  CreditCard, 
  Loader2,
  IndianRupee,
  TrendingUp,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Tag,
  Calendar,
  Eye,
  Crown,
  Sparkles,
  Gift,
} from "lucide-react";
import { format, isAfter } from "date-fns";

interface Payment {
  id: string;
  user_id: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  coupon_code: string | null;
  discount_amount: number;
  final_amount: number;
  payment_method: string | null;
  created_at: string;
}

interface UserWithBilling {
  id: string;
  user_id: string;
  email: string | null;
  name: string | null;
  subscription_plan: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  last_active_at: string | null;
  // Payment info (from latest successful payment)
  payment_type: 'free' | 'coupon' | 'full_payment';
  amount_paid: number;
  payment_method: string | null;
  payment_status: string | null;
  coupon_code: string | null;
  coupon_discount: number;
  plan_start_date: string | null;
}

const AdminPaymentsPage = () => {
  const [activeTab, setActiveTab] = useState<"payments" | "users">("payments");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [users, setUsers] = useState<UserWithBilling[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
  const [couponUsedFilter, setCouponUsedFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithBilling | null>(null);
  const [userPayments, setUserPayments] = useState<Payment[]>([]);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    freeUsers: 0,
    paidUsers: 0,
    couponUsers: 0,
  });

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const paymentsData = data || [];
      setPayments(paymentsData);
      
      // Calculate stats
      const successful = paymentsData.filter(p => p.status === "success");
      const couponPayments = successful.filter(p => p.coupon_code && p.final_amount === 0);
      const fullPayments = successful.filter(p => p.final_amount > 0);
      
      setStats(prev => ({
        ...prev,
        totalRevenue: successful.reduce((acc, p) => acc + (p.final_amount || 0), 0),
        successfulPayments: successful.length,
        pendingPayments: paymentsData.filter(p => p.status === "pending").length,
        failedPayments: paymentsData.filter(p => p.status === "failed").length,
        couponUsers: couponPayments.length,
        paidUsers: fullPayments.length,
      }));
      
      return paymentsData;
    } catch (err: any) {
      toast.error("Failed to fetch payments");
      console.error(err);
      return [];
    }
  };

  const fetchUsers = async (paymentsData: Payment[]) => {
    try {
      // Get all user profiles
      const { data: profiles, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map payments by user_id for quick lookup
      const paymentsByUser = new Map<string, Payment[]>();
      paymentsData.forEach(p => {
        const existing = paymentsByUser.get(p.user_id) || [];
        paymentsByUser.set(p.user_id, [...existing, p]);
      });
      
      // Build user billing data
      const usersWithBilling: UserWithBilling[] = (profiles || []).map(profile => {
        const userPayments = paymentsByUser.get(profile.user_id) || [];
        const successfulPayment = userPayments.find(p => p.status === "success");
        
        let paymentType: 'free' | 'coupon' | 'full_payment' = 'free';
        let amountPaid = 0;
        let couponCode: string | null = null;
        let couponDiscount = 0;
        let paymentMethod: string | null = null;
        let paymentStatus: string | null = null;
        let planStartDate: string | null = null;
        
        if (successfulPayment) {
          if (successfulPayment.final_amount === 0 && successfulPayment.coupon_code) {
            paymentType = 'coupon';
          } else if (successfulPayment.final_amount > 0) {
            paymentType = 'full_payment';
          }
          amountPaid = successfulPayment.final_amount;
          couponCode = successfulPayment.coupon_code;
          couponDiscount = successfulPayment.discount_amount || 0;
          paymentMethod = successfulPayment.payment_method;
          paymentStatus = successfulPayment.status;
          planStartDate = successfulPayment.created_at;
        }
        
        return {
          id: profile.id,
          user_id: profile.user_id,
          email: profile.email,
          name: profile.name,
          subscription_plan: profile.subscription_plan,
          subscription_expires_at: profile.subscription_expires_at,
          created_at: profile.created_at,
          last_active_at: profile.last_active_at,
          payment_type: paymentType,
          amount_paid: amountPaid,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          coupon_code: couponCode,
          coupon_discount: couponDiscount,
          plan_start_date: planStartDate,
        };
      });
      
      setUsers(usersWithBilling);
      
      // Update free users count
      const freeUsers = usersWithBilling.filter(u => u.payment_type === 'free').length;
      setStats(prev => ({ ...prev, freeUsers }));
      
    } catch (err: any) {
      toast.error("Failed to fetch users");
      console.error(err);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    const paymentsData = await fetchPayments();
    await fetchUsers(paymentsData);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleViewUser = async (user: UserWithBilling) => {
    setSelectedUser(user);
    
    // Fetch user's payment history
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", user.user_id)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setUserPayments(data);
    }
    
    setIsUserDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Success
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string | null) => {
    switch (plan) {
      case "pro":
        return (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            <Sparkles className="w-3 h-3 mr-1" />
            Pro
          </Badge>
        );
      case "business":
        return (
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
            <Crown className="w-3 h-3 mr-1" />
            Business
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Free
          </Badge>
        );
    }
  };

  const getPaymentTypeBadge = (type: 'free' | 'coupon' | 'full_payment') => {
    switch (type) {
      case "full_payment":
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <CreditCard className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "coupon":
        return (
          <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
            <Gift className="w-3 h-3 mr-1" />
            Coupon
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Free
          </Badge>
        );
    }
  };

  const getPlanStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { label: 'Active', isActive: true };
    const isExpired = !isAfter(new Date(expiresAt), new Date());
    return isExpired 
      ? { label: 'Expired', isActive: false }
      : { label: 'Active', isActive: true };
  };

  // Filter payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.razorpay_order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.razorpay_payment_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.coupon_code?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPlan = planFilter === "all" || 
      (planFilter === "free" && (user.subscription_plan === "free" || !user.subscription_plan)) ||
      user.subscription_plan === planFilter;
    
    const matchesPaymentType = paymentTypeFilter === "all" || user.payment_type === paymentTypeFilter;
    
    const matchesCoupon = couponUsedFilter === "all" ||
      (couponUsedFilter === "yes" && !!user.coupon_code) ||
      (couponUsedFilter === "no" && !user.coupon_code);
    
    return matchesSearch && matchesPlan && matchesPaymentType && matchesCoupon;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-primary" />
            Billing & Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage payments and user subscriptions
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center">
                <IndianRupee className="w-5 h-5" />
                {stats.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Successful
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.successfulPayments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failedPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                Free Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.freeUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-500" />
                Paid Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paidUsers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Gift className="w-4 h-4 text-orange-500" />
                Coupon Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.couponUsers}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "payments" | "users")}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="payments">
                <CreditCard className="w-4 h-4 mr-2" />
                Payments
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-2" />
                User Subscriptions
              </TabsTrigger>
            </TabsList>

            {/* Search and Filters */}
            <div className="flex gap-4 flex-wrap my-4">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "payments" ? "Search orders, payments..." : "Search users..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {activeTab === "users" && (
                <>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Payment Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="coupon">Coupon Only</SelectItem>
                      <SelectItem value="full_payment">Full Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={couponUsedFilter} onValueChange={setCouponUsedFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Coupon Used" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="yes">Coupon Used</SelectItem>
                      <SelectItem value="no">No Coupon</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>

            {/* Payments Tab */}
            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle>Payment History</CardTitle>
                  <CardDescription>
                    {filteredPayments.length} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : filteredPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No payments yet
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Final</TableHead>
                          <TableHead>Coupon</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="text-sm">
                              {format(new Date(payment.created_at), "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {payment.razorpay_order_id?.slice(-12) || payment.id.slice(0, 8)}
                              </code>
                            </TableCell>
                            <TableCell>
                              {getPlanBadge(payment.plan)}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center">
                                <IndianRupee className="w-3 h-3" />
                                {payment.amount}
                              </span>
                            </TableCell>
                            <TableCell>
                              {payment.discount_amount > 0 ? (
                                <span className="text-green-600 flex items-center">
                                  -<IndianRupee className="w-3 h-3" />
                                  {payment.discount_amount}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium flex items-center">
                                <IndianRupee className="w-3 h-3" />
                                {payment.final_amount}
                              </span>
                            </TableCell>
                            <TableCell>
                              {payment.coupon_code ? (
                                <Badge variant="outline" className="font-mono text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {payment.coupon_code}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(payment.status)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>User Subscriptions</CardTitle>
                  <CardDescription>
                    {filteredUsers.length} of {users.length} users
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No users match your filters
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment Type</TableHead>
                          <TableHead>Amount Paid</TableHead>
                          <TableHead>Coupon</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => {
                          const planStatus = getPlanStatus(user.subscription_expires_at);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{user.name || 'Unknown'}</p>
                                  <p className="text-sm text-muted-foreground">{user.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getPlanBadge(user.subscription_plan)}
                              </TableCell>
                              <TableCell>
                                <Badge variant={planStatus.isActive ? "default" : "destructive"}>
                                  {planStatus.label}
                                </Badge>
                                {user.subscription_expires_at && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {planStatus.isActive ? 'Expires' : 'Expired'}: {format(new Date(user.subscription_expires_at), "MMM d, yyyy")}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                {getPaymentTypeBadge(user.payment_type)}
                              </TableCell>
                              <TableCell>
                                {user.amount_paid > 0 ? (
                                  <span className="flex items-center font-medium">
                                    <IndianRupee className="w-3 h-3" />
                                    {user.amount_paid}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">₹0</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {user.coupon_code ? (
                                  <div>
                                    <Badge variant="outline" className="font-mono text-xs">
                                      {user.coupon_code}
                                    </Badge>
                                    {user.coupon_discount > 0 && (
                                      <p className="text-xs text-green-600 mt-1">
                                        -₹{user.coupon_discount}
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(user.created_at), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* User Detail Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                {selectedUser?.email}
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedUser.name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedUser.email || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Current Plan</p>
                    <div className="mt-1">{getPlanBadge(selectedUser.subscription_plan)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Payment Type</p>
                    <div className="mt-1">{getPaymentTypeBadge(selectedUser.payment_type)}</div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Paid</p>
                    <p className="font-medium flex items-center">
                      <IndianRupee className="w-4 h-4" />
                      {selectedUser.amount_paid}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {format(new Date(selectedUser.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>

                {/* Coupon Info */}
                {selectedUser.coupon_code && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm font-medium mb-2">Coupon Used</p>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="font-mono">
                        {selectedUser.coupon_code}
                      </Badge>
                      <span className="text-green-600 font-medium">
                        -₹{selectedUser.coupon_discount} discount
                      </span>
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div>
                  <p className="text-sm font-medium mb-3">Payment History</p>
                  {userPayments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No payment history</p>
                  ) : (
                    <div className="space-y-2">
                      {userPayments.map((payment) => (
                        <div 
                          key={payment.id} 
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            {getStatusBadge(payment.status)}
                            {getPlanBadge(payment.plan)}
                          </div>
                          <div className="text-right">
                            <p className="font-medium flex items-center justify-end">
                              <IndianRupee className="w-3 h-3" />
                              {payment.final_amount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(payment.created_at), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;

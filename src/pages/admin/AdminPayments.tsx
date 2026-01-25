import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";
import { format } from "date-fns";

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

const AdminPaymentsPage = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    successfulPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
  });

  const fetchPayments = async () => {
    setIsLoading(true);
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
      setStats({
        totalRevenue: successful.reduce((acc, p) => acc + (p.final_amount || 0), 0),
        successfulPayments: successful.length,
        pendingPayments: paymentsData.filter(p => p.status === "pending").length,
        failedPayments: paymentsData.filter(p => p.status === "failed").length,
      });
    } catch (err: any) {
      toast.error("Failed to fetch payments");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

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
            Payment History
          </h1>
          <p className="text-muted-foreground mt-1">
            View all payment transactions
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-4 gap-4"
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Total Revenue
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
        </motion.div>

        {/* Payments Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Payments</CardTitle>
              <CardDescription>Complete payment transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : payments.length === 0 ? (
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
                    {payments.map((payment) => (
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
                          <Badge variant="secondary" className="capitalize">
                            {payment.plan}
                          </Badge>
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
        </motion.div>
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentsPage;

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Plus, 
  Tag, 
  Loader2, 
  Trash2, 
  Edit2,
  Percent,
  IndianRupee,
  Calendar,
  Users,
  Wand2,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
import { format, isAfter, isBefore } from "date-fns";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  plan: string | null;
  duration_days: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

// Generate a random coupon code
function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const prefixes = ['SAVE', 'DEAL', 'PROMO', 'LINK', 'BOT', 'VIP'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

// Get coupon status
function getCouponStatus(coupon: Coupon): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } {
  if (!coupon.is_active) {
    return { label: 'Disabled', variant: 'secondary' };
  }
  
  if (coupon.valid_until && isBefore(new Date(coupon.valid_until), new Date())) {
    return { label: 'Expired', variant: 'destructive' };
  }
  
  if (coupon.max_uses && coupon.current_uses >= coupon.max_uses) {
    return { label: 'Maxed Out', variant: 'outline' };
  }
  
  return { label: 'Active', variant: 'default' };
}

const AdminCouponsPage = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    type: "percentage" as string,
    value: 0,
    plan: "any",
    duration_days: 30,
    max_uses: "",
    valid_until: "",
  });

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch coupons");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetForm = () => {
    setFormData({
      code: "",
      type: "percentage",
      value: 0,
      plan: "any",
      duration_days: 30,
      max_uses: "",
      valid_until: "",
    });
    setEditingCoupon(null);
  };

  const handleOpenDialog = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        plan: coupon.plan || "any",
        duration_days: coupon.duration_days,
        max_uses: coupon.max_uses?.toString() || "",
        valid_until: coupon.valid_until ? coupon.valid_until.split("T")[0] : "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleAutoGenerate = () => {
    setFormData(prev => ({ ...prev, code: generateCouponCode() }));
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Coupon code copied!");
  };

  const handleSave = async () => {
    if (!formData.code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    if (formData.value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    if (formData.type === "percentage" && formData.value > 100) {
      toast.error("Percentage discount cannot exceed 100%");
      return;
    }

    setIsSaving(true);
    try {
      const couponData = {
        code: formData.code.toUpperCase(),
        type: formData.type,
        value: formData.value,
        plan: formData.plan === "any" ? null : formData.plan,
        duration_days: formData.duration_days,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_until: formData.valid_until || null,
      };

      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast.success("Coupon updated successfully");
      } else {
        const { error } = await supabase
          .from("coupons")
          .insert(couponData);
        if (error) throw error;
        toast.success("Coupon created successfully");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || "Failed to save coupon");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
      if (error) throw error;
      toast.success(coupon.is_active ? "Coupon deactivated" : "Coupon activated");
      fetchCoupons();
    } catch (err: any) {
      toast.error("Failed to update coupon");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    
    try {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Coupon deleted");
      fetchCoupons();
    } catch (err: any) {
      toast.error("Failed to delete coupon");
    }
  };

  // Filter coupons
  const filteredCoupons = coupons.filter(coupon => {
    const matchesSearch = coupon.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === "all") return matchesSearch;
    
    const status = getCouponStatus(coupon);
    if (statusFilter === "active" && status.label === "Active") return matchesSearch;
    if (statusFilter === "expired" && status.label === "Expired") return matchesSearch;
    if (statusFilter === "disabled" && status.label === "Disabled") return matchesSearch;
    if (statusFilter === "maxed" && status.label === "Maxed Out") return matchesSearch;
    
    return false;
  });

  // Stats
  const activeCoupons = coupons.filter(c => getCouponStatus(c).label === "Active").length;
  const expiredCoupons = coupons.filter(c => getCouponStatus(c).label === "Expired").length;
  const totalRedemptions = coupons.reduce((acc, c) => acc + c.current_uses, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Tag className="w-8 h-8 text-primary" />
              Coupon Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Create and manage discount coupons
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                <DialogDescription>
                  {editingCoupon ? "Update coupon details" : "Create a new discount coupon"}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g., SUMMER2025"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAutoGenerate}
                      className="shrink-0"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Discount Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(val: "percentage" | "fixed") => setFormData({ ...formData, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Value</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                        className="pl-8"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {formData.type === "percentage" ? (
                          <Percent className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <IndianRupee className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Applicable Plan</Label>
                  <Select
                    value={formData.plan}
                    onValueChange={(val) => setFormData({ ...formData, plan: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">All Plans</SelectItem>
                      <SelectItem value="pro">Pro Only (₹999)</SelectItem>
                      <SelectItem value="business">Business Only (₹1999)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration (days)</Label>
                    <Input
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Max Uses (optional)</Label>
                    <Input
                      type="number"
                      placeholder="Unlimited"
                      value={formData.max_uses}
                      onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Expires On (optional)</Label>
                  <Input
                    type="date"
                    value={formData.valid_until}
                    onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  />
                </div>

                {/* Preview */}
                {formData.value > 0 && (
                  <div className="bg-muted/50 rounded-lg p-4 border">
                    <p className="text-sm font-medium mb-2">Preview</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">
                        {formData.code || "CODE"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">→</span>
                      <span className="text-sm font-medium text-green-600">
                        {formData.type === "percentage" 
                          ? `${formData.value}% off` 
                          : `₹${formData.value} off`}
                      </span>
                      {formData.plan !== "any" && (
                        <Badge variant="secondary" className="capitalize">
                          {formData.plan}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {editingCoupon ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              <CardTitle className="text-sm font-medium">Total Coupons</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{coupons.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeCoupons}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Expired
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredCoupons}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Redemptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalRedemptions}</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex gap-4 flex-wrap"
        >
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search coupons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="disabled">Disabled</SelectItem>
              <SelectItem value="maxed">Maxed Out</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Coupons Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Coupons</CardTitle>
              <CardDescription>
                {filteredCoupons.length} of {coupons.length} coupons
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : filteredCoupons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {coupons.length === 0 
                    ? "No coupons yet. Create your first coupon!"
                    : "No coupons match your filters"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCoupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                        <TableRow key={coupon.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono">
                                {coupon.code}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleCopyCode(coupon.code)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            {coupon.type === "percentage" ? (
                              <span className="flex items-center gap-1 font-medium text-green-600">
                                <Percent className="w-3 h-3" />
                                {coupon.value}%
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 font-medium text-green-600">
                                <IndianRupee className="w-3 h-3" />
                                {coupon.value}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant={coupon.plan ? "secondary" : "outline"}>
                              {coupon.plan?.toUpperCase() || "All"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {coupon.current_uses}
                              {coupon.max_uses ? `/${coupon.max_uses}` : ""}
                            </span>
                          </TableCell>
                          <TableCell>
                            {coupon.valid_until ? (
                              <span className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(coupon.valid_until), "MMM d, yyyy")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={status.variant}>{status.label}</Badge>
                              <Switch
                                checked={coupon.is_active}
                                onCheckedChange={() => handleToggleActive(coupon)}
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(coupon)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(coupon.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

export default AdminCouponsPage;

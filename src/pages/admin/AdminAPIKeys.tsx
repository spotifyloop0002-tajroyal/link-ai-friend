import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Save,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface APIKeyConfig {
  name: string;
  envKey: string;
  description: string;
  docsUrl: string;
  icon: string;
  category: "ai" | "communication" | "search" | "payment";
}

const API_KEYS: APIKeyConfig[] = [
  {
    name: "Hugging Face",
    envKey: "HUGGINGFACE_API_KEY",
    description: "Used for AI image generation (Stable Diffusion XL). Free tier: ~30k characters/month.",
    docsUrl: "https://huggingface.co/settings/tokens",
    icon: "🤗",
    category: "ai",
  },
  {
    name: "Tavily",
    envKey: "TAVILY_API_KEY",
    description: "Used for agent web research & content gathering. Free tier: 1,000 API calls/month.",
    docsUrl: "https://app.tavily.com/home",
    icon: "🔍",
    category: "search",
  },
  {
    name: "Resend",
    envKey: "RESEND_API_KEY",
    description: "Used for sending emails (payment confirmations, critical alerts). Free tier: 100 emails/day.",
    docsUrl: "https://resend.com/api-keys",
    icon: "📧",
    category: "communication",
  },
  {
    name: "Razorpay Key ID",
    envKey: "RAZORPAY_KEY_ID",
    description: "Public key for Razorpay payment gateway integration.",
    docsUrl: "https://dashboard.razorpay.com/app/keys",
    icon: "💳",
    category: "payment",
  },
  {
    name: "Razorpay Key Secret",
    envKey: "RAZORPAY_KEY_SECRET",
    description: "Secret key for Razorpay payment verification & order creation.",
    docsUrl: "https://dashboard.razorpay.com/app/keys",
    icon: "🔐",
    category: "payment",
  },
];

const categoryLabels: Record<string, string> = {
  ai: "AI & Image Generation",
  search: "Search & Research",
  communication: "Email & Communication",
  payment: "Payment Gateway",
};

const AdminAPIKeys = () => {
  const [keyStatuses, setKeyStatuses] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [editingKey, setEditingKey] = useState<APIKeyConfig | null>(null);
  const [newValue, setNewValue] = useState("");
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    checkKeyStatuses();
  }, []);

  const checkKeyStatuses = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-api-keys", {
        body: { keys: API_KEYS.map((k) => k.envKey) },
      });

      if (error) throw error;
      setKeyStatuses(data?.statuses || {});
    } catch (err) {
      console.error("Failed to check API key statuses:", err);
      // Default all to unknown
      const fallback: Record<string, boolean> = {};
      API_KEYS.forEach((k) => (fallback[k.envKey] = false));
      setKeyStatuses(fallback);
    } finally {
      setIsLoading(false);
      setIsChecking(false);
    }
  };

  const handleSave = async () => {
    if (!editingKey || !newValue.trim()) return;

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-api-key", {
        body: { key: editingKey.envKey, value: newValue.trim() },
      });

      if (error) throw error;

      if (data?.success === false && data?.message) {
        toast.info(data.message, { duration: 8000 });
      } else {
        toast.success(`${editingKey.name} API key updated successfully!`);
      }
      
      setEditingKey(null);
      setNewValue("");
      setShowValue(false);
      await checkKeyStatuses();
    } catch (err: any) {
      toast.error(err.message || "Failed to update API key");
    } finally {
      setIsSaving(false);
    }
  };

  // Group keys by category
  const groupedKeys = API_KEYS.reduce((acc, key) => {
    if (!acc[key.category]) acc[key.category] = [];
    acc[key.category].push(key);
    return acc;
  }, {} as Record<string, APIKeyConfig[]>);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold">API Keys</h1>
              </div>
              <p className="text-muted-foreground">
                Manage third-party API keys used by the platform. Update keys when free tier limits are exceeded.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={checkKeyStatuses}
              disabled={isChecking}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? "animate-spin" : ""}`} />
              Refresh Status
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[200px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          Object.entries(groupedKeys).map(([category, keys], catIdx) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * catIdx }}
            >
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">
                {categoryLabels[category] || category}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {keys.map((apiKey) => {
                  const isConfigured = keyStatuses[apiKey.envKey];
                  return (
                    <Card key={apiKey.envKey} className="relative overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{apiKey.icon}</span>
                            <div>
                              <CardTitle className="text-base">{apiKey.name}</CardTitle>
                              <code className="text-xs text-muted-foreground">{apiKey.envKey}</code>
                            </div>
                          </div>
                          <Badge variant={isConfigured ? "default" : "destructive"} className="gap-1">
                            {isConfigured ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3 h-3" />
                                Missing
                              </>
                            )}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="mb-4">{apiKey.description}</CardDescription>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingKey(apiKey);
                              setNewValue("");
                              setShowValue(false);
                            }}
                          >
                            <Key className="w-3.5 h-3.5 mr-1.5" />
                            {isConfigured ? "Update Key" : "Add Key"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={apiKey.docsUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                              Get Key
                            </a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          ))
        )}

        {/* Edit Key Dialog */}
        <Dialog open={!!editingKey} onOpenChange={(open) => !open && setEditingKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-xl">{editingKey?.icon}</span>
                Update {editingKey?.name} Key
              </DialogTitle>
              <DialogDescription>
                Enter the new API key value. This will be securely stored as a backend secret.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showValue ? "text" : "password"}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={`Enter ${editingKey?.name} API key...`}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowValue(!showValue)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your key from:{" "}
                <a
                  href={editingKey?.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  {editingKey?.docsUrl}
                </a>
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingKey(null)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !newValue.trim()}>
                {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Key
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminAPIKeys;

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Bell } from "lucide-react";

interface AdminNotificationSenderProps {
  users: Array<{ user_id: string; name: string | null; email: string | null }>;
}

export const AdminNotificationSender = ({ users }: AdminNotificationSenderProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"admin" | "system">("admin");
  const [target, setTarget] = useState<"all" | "selected">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({
        title: "Missing fields",
        description: "Please fill in both title and message.",
        variant: "destructive",
      });
      return;
    }

    if (target === "selected" && !selectedUserId) {
      toast({
        title: "No user selected",
        description: "Please select a user to send the notification to.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      if (target === "all") {
        // Send to all users by creating a global notification (user_id = null)
        const { error } = await supabase
          .from("notifications")
          .insert({
            user_id: null,
            title: title.trim(),
            message: message.trim(),
            type,
          });

        if (error) throw error;

        toast({
          title: "Notification sent",
          description: "Broadcast notification sent to all users.",
        });
      } else {
        // Send to specific user
        const { error } = await supabase
          .from("notifications")
          .insert({
            user_id: selectedUserId,
            title: title.trim(),
            message: message.trim(),
            type,
          });

        if (error) throw error;

        const targetUser = users.find(u => u.user_id === selectedUserId);
        toast({
          title: "Notification sent",
          description: `Notification sent to ${targetUser?.name || targetUser?.email || "user"}.`,
        });
      }

      // Reset form
      setTitle("");
      setMessage("");
      setSelectedUserId("");
    } catch (err) {
      console.error("Error sending notification:", err);
      toast({
        title: "Failed to send",
        description: "Could not send the notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Send Notification
        </CardTitle>
        <CardDescription>
          Broadcast notifications to all users or send to specific users
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Target Audience</Label>
            <Select value={target} onValueChange={(v) => setTarget(v as "all" | "selected")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users (Broadcast)</SelectItem>
                <SelectItem value="selected">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "selected" && (
            <div>
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.user_id} value={user.user_id}>
                      {user.name || user.email || user.user_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Notification Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "admin" | "system")}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">📢 Admin Announcement</SelectItem>
                <SelectItem value="system">⚙️ System Notice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notif-title">Title</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              className="mt-1.5"
              maxLength={100}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notif-message">Message</Label>
          <Textarea
            id="notif-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your notification message..."
            className="mt-1.5 min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {message.length}/500 characters
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSend} disabled={isSending} className="gap-2">
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send Notification
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

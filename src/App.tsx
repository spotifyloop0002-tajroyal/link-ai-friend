import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useExtensionEvents } from "@/hooks/useExtensionEvents";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Agents from "./pages/Agents";
import AgentChat from "./pages/AgentChat";
import CalendarPage from "./pages/CalendarPage";
import Analytics from "./pages/Analytics";
import LinkedInConnection from "./pages/LinkedInConnection";
import LinkedInProfile from "./pages/LinkedInProfile";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Inner component that uses hooks
const AppContent = () => {
  // Listen for extension events globally
  useExtensionEvents();

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/agents" element={<Agents />} />
          <Route path="/dashboard/agents/chat" element={<AgentChat />} />
          <Route path="/dashboard/calendar" element={<CalendarPage />} />
          <Route path="/dashboard/analytics" element={<Analytics />} />
          <Route path="/dashboard/linkedin" element={<LinkedInConnection />} />
          <Route path="/dashboard/profile" element={<LinkedInProfile />} />
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/billing" element={<Billing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

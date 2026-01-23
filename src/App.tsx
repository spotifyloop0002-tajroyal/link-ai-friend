import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
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
          <Route path="/dashboard/settings" element={<Settings />} />
          <Route path="/dashboard/billing" element={<Billing />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useExtensionEvents } from "@/hooks/useExtensionEvents";
import { startAnalyticsCron } from "@/lib/analytics-cron";
import { Loader2 } from "lucide-react";

// Eagerly load critical pages
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy load all other pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LinkedInConnection = lazy(() => import("./pages/LinkedInConnection"));
const LinkedInProfile = lazy(() => import("./pages/LinkedInProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement"));
const AdminAPIKeys = lazy(() => import("./pages/admin/AdminAPIKeys"));
const NotFound = lazy(() => import("./pages/NotFound"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const GDPR = lazy(() => import("./pages/legal/GDPR"));
const Documentation = lazy(() => import("./pages/resources/Documentation"));
const Blog = lazy(() => import("./pages/resources/Blog"));
const HelpCenter = lazy(() => import("./pages/resources/HelpCenter"));
const Community = lazy(() => import("./pages/resources/Community"));
const ChromeExtension = lazy(() => import("./pages/product/ChromeExtension"));
const API = lazy(() => import("./pages/product/API"));

// Lazy-loaded AdminRoute wrapper
const AdminRoute = lazy(() => import("./components/admin/AdminRoute"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Inner component that uses hooks
const AppContent = () => {
  // Listen for extension events globally
  useExtensionEvents();
  
  // Start analytics cron job (runs every 2 hours)
  useEffect(() => {
    startAnalyticsCron();
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
            {/* Admin Login - public */}
            <Route path="/admin/login" element={<AdminLogin />} />
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/management" element={<AdminRoute requireSuperAdmin><AdminManagement /></AdminRoute>} />
            <Route path="/admin/api-keys" element={<AdminRoute requireSuperAdmin><AdminAPIKeys /></AdminRoute>} />
            {/* Public pages */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<PricingPage />} />
            {/* Legal pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/gdpr" element={<GDPR />} />
            {/* Resource pages */}
            <Route path="/docs" element={<Documentation />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/community" element={<Community />} />
            {/* Product pages */}
            <Route path="/extension" element={<ChromeExtension />} />
            <Route path="/api" element={<API />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
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

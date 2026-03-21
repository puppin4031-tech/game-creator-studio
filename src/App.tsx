import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";
import MainDashboard from "./pages/admin/MainDashboard";
import GlobalMapView from "./pages/admin/GlobalMapView";
import UserManagement from "./pages/admin/UserManagement";
import ApprovalManagement from "./pages/admin/ApprovalManagement";
import SubRegionMap from "./pages/admin/SubRegionMap";
import CreateMission from "./pages/admin/CreateMission";
import MyMissions from "./pages/admin/MyMissions";
import ThemeManagement from "./pages/admin/ThemeManagement";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoutes() {
  const { isMainAdmin, isSubAdmin, isLoading } = useAuth();
  if (isLoading) return null;

  return (
    <Routes>
      {isMainAdmin && (
        <>
          <Route index element={<MainDashboard />} />
          <Route path="map" element={<GlobalMapView />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="approvals" element={<ApprovalManagement />} />
        </>
      )}
      {isSubAdmin && (
        <>
          <Route index element={<SubRegionMap />} />
          <Route path="create-mission" element={<CreateMission />} />
          <Route path="my-missions" element={<MyMissions />} />
        </>
      )}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="*" element={<AdminRoutes />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

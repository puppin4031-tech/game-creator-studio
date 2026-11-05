import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { loginUrlFor } from "@/lib/authNavigation";
import GoogleMapsProvider from "@/components/GoogleMapsProvider";
import Index from "./pages/Index";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";
import ExodusLayout from "./layouts/ExodusLayout";
import MainDashboard from "./pages/admin/MainDashboard";
import GlobalMapView from "./pages/admin/GlobalMapView";
import UserManagement from "./pages/admin/UserManagement";
import SpriteAssets from "./pages/admin/SpriteAssets";
import ItemCatalog from "./pages/admin/ItemCatalog";
import SupportInbox from "./pages/admin/SupportInbox";
import ApprovalManagement from "./pages/admin/ApprovalManagement";
import SubRegionMap from "./pages/admin/SubRegionMap";
import CreateMission from "./pages/admin/CreateMission";
import MyMissions from "./pages/admin/MyMissions";
import ThemeManagement from "./pages/admin/ThemeManagement";
import ThemeDetail from "./pages/admin/ThemeDetail";
import ExodusDashboard from "./pages/admin/exodus/ExodusDashboard";
import StagesTimeline from "./pages/admin/exodus/StagesTimeline";
import NPCEncyclopedia from "./pages/admin/exodus/NPCEncyclopedia";
import ItemPresets from "./pages/admin/exodus/ItemPresets";
import PuzzleQuizMaker from "./pages/admin/exodus/PuzzleQuizMaker";
import SpotManagement from "./pages/admin/exodus/SpotManagement";
import Lobby from "./pages/play/Lobby";
import GameRoom from "./pages/play/GameRoom";
import PuzzleSimulator from "./pages/play/PuzzleSimulator";
import TagSimulator from "./pages/play/TagSimulator";
import TreasureSimulator from "./pages/play/TreasureSimulator";
import SurvivalSimulator from "./pages/play/SurvivalSimulator";
import SurvivalCheck from "./pages/dev/SurvivalCheck";
import MobileFrame from "./layouts/MobileFrame";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!user) return <Navigate to={loginUrlFor(`${location.pathname}${location.search}`)} replace />;
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
          <Route path="sprites" element={<SpriteAssets />} />
          <Route path="items" element={<ItemCatalog />} />
          <Route path="support" element={<SupportInbox />} />
          <Route path="approvals" element={<ApprovalManagement />} />
          <Route path="themes" element={<ThemeManagement />} />
          <Route path="themes/:themeId" element={<ThemeDetail />} />
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
    <GoogleMapsProvider>
      <TooltipProvider>
        <Toaster />
        {/* Compact top notices so pickups never cover the bottom action panels. */}
        <Sonner position="top-center" visibleToasts={2} duration={2200} offset="calc(env(safe-area-inset-top) + 64px)" />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/world" element={<ProtectedRoute><SurvivalSimulator realGps /></ProtectedRoute>} />
              <Route path="/exodus" element={<Index />} />
              <Route element={<MobileFrame />}>
                <Route path="/play" element={<Lobby />} />
                <Route path="/play/:roomCode" element={<GameRoom />} />
                <Route path="/play/puzzle-sim" element={<PuzzleSimulator />} />
                <Route path="/play/tag-sim" element={<TagSimulator />} />
                <Route path="/play/treasure-sim" element={<TreasureSimulator />} />
                <Route path="/play/survival-sim" element={<SurvivalSimulator />} />
                <Route path="/play/survival" element={<SurvivalSimulator realGps />} />
              </Route>
              <Route path="/dev/survival-check" element={<SurvivalCheck />} />
              <Route path="/login" element={<Login />} />
              <Route
                path="/admin/exodus"
                element={
                  <ProtectedRoute>
                    <ExodusLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<ExodusDashboard />} />
                <Route path="stages" element={<StagesTimeline />} />
                <Route path="npcs" element={<NPCEncyclopedia />} />
                <Route path="items" element={<ItemPresets />} />
                <Route path="puzzle-maker" element={<PuzzleQuizMaker />} />
                <Route path="spots" element={<SpotManagement />} />
              </Route>
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
    </GoogleMapsProvider>
  </QueryClientProvider>
);

export default App;

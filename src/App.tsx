import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { supabase } from "./lib/supabase";
import { useStore } from "./store";
import { LangProvider } from "./context/LangContext";
import AmbientBreath from "./components/AmbientBreath";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import OnboardPage from "./pages/OnboardPage";
import PlazaPage from "./pages/PlazaPage";
import CreatePage from "./pages/CreatePage";
import ChatPage from "./pages/ChatPage";
import MemoryPage from "./pages/MemoryPage";
import BondPage from "./pages/BondPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const { setUser, setSession, setCompanion, user, companion } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        const confirmed = !!session.user.email_confirmed_at;
        setUser({
          id: session.user.id,
          email: session.user.email || undefined,
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: session.user.updated_at || new Date().toISOString(),
        });
        if (confirmed) {
          supabase
            .from("companions")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("is_active", true)
            .single()
            .then(({ data }) => {
              if (data) setCompanion(data);
            });
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "SIGNED_IN" && session?.user) {
        const confirmed = !!session.user.email_confirmed_at;
        if (confirmed) {
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
          });
          supabase
            .from("companions")
            .select("*")
            .eq("user_id", session.user.id)
            .eq("is_active", true)
            .single()
            .then(({ data }) => {
              if (data) setCompanion(data);
            });
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setCompanion(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) return <Navigate to="/auth" replace />;
    return <>{children}</>;
  };

  const CompanionRoute = ({ children }: { children: React.ReactNode }) => {
    if (!user) return <Navigate to="/auth" replace />;
    if (!companion) return <Navigate to="/onboard" replace />;
    return <>{children}</>;
  };

  return (
    <LangProvider>
      <BrowserRouter>
        <div className="relative min-h-screen bg-black text-white overflow-hidden">
          <AmbientBreath />
          <div className="relative z-10 h-screen">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/onboard"
                element={
                  <ProtectedRoute>
                    <OnboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/plaza"
                element={
                  <ProtectedRoute>
                    <PlazaPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/create"
                element={
                  <ProtectedRoute>
                    <CreatePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <CompanionRoute>
                    <ChatPage />
                  </CompanionRoute>
                }
              />
              <Route
                path="/memory"
                element={
                  <CompanionRoute>
                    <MemoryPage />
                  </CompanionRoute>
                }
              />
              <Route
                path="/bond"
                element={
                  <CompanionRoute>
                    <BondPage />
                  </CompanionRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </LangProvider>
  );
}

export default App;

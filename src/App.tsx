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
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import MemoryPage from "./pages/MemoryPage";
import BondPage from "./pages/BondPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const { setUser, setSession, setCompanion, user, companion } = useStore();

  useEffect(() => {
    // Safe session getter that doesn't throw on invalid refresh tokens
    const initSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          // If refresh token is invalid, clear local state and stay logged out
          if (error.message?.includes("refresh_token") || error.message?.includes("Refresh Token")) {
            console.warn("Invalid refresh token, clearing auth state");
            setSession(null);
            setUser(null);
            return;
          }
          console.warn("getSession error:", error.message);
        }

        if (session?.user) {
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
          });
          if (session.user.email_confirmed_at) {
            fetchCompanion(session.user.id);
          }
        }
      } catch (err: any) {
        console.warn("Auth init error:", err?.message || err);
        setSession(null);
        setUser(null);
      }
    };

    const fetchCompanion = async (uid: string) => {
      try {
        const { data, error } = await supabase
          .from("companions")
          .select("*")
          .eq("user_id", uid)
          .eq("is_active", true)
          .single();
        if (error) {
          // Table doesn't exist yet or RLS issue - don't crash
          if (error.code === "406" || error.code === "409" || error.code === "42P01") {
            console.warn("Companion table not ready yet:", error.message);
            return;
          }
          console.warn("Fetch companion error:", error.message);
        }
        if (data) setCompanion(data);
      } catch (err: any) {
        console.warn("Companion fetch exception:", err?.message || err);
      }
    };

    initSession();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        if (session.user.email_confirmed_at) {
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
          });
          fetchCompanion(session.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setSession(null);
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
        <div className="relative h-screen bg-black text-white overflow-hidden">
          <AmbientBreath />
          <div className="relative z-10 h-screen">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboard" element={<ProtectedRoute><OnboardPage /></ProtectedRoute>} />
              <Route path="/plaza" element={<ProtectedRoute><PlazaPage /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreatePage /></ProtectedRoute>} />
              <Route path="/home" element={<CompanionRoute><HomePage /></CompanionRoute>} />
              <Route path="/chat" element={<CompanionRoute><ChatPage /></CompanionRoute>} />
              <Route path="/memory" element={<CompanionRoute><MemoryPage /></CompanionRoute>} />
              <Route path="/bond" element={<CompanionRoute><BondPage /></CompanionRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </LangProvider>
  );
}

export default App;

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("getSession:", error.message);
          setSession(null); setUser(null);
          setChecking(false);
          return;
        }

        if (session?.user) {
          setSession(session);
          setUser({
            id: session.user.id,
            email: session.user.email || undefined,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
          });

          // Fetch companion if email verified
          if (session.user.email_confirmed_at) {
            try {
              const { data, error: ce } = await supabase
                .from("companions")
                .select("*")
                .eq("user_id", session.user.id)
                .eq("is_active", true)
                .maybeSingle();
              if (ce && ce.code !== "PGRST116") {
                console.warn("companion fetch:", ce.message);
              }
              if (data) setCompanion(data);
            } catch (e: any) {
              console.warn("companion exception:", e?.message);
            }
          }
        }
      } catch (err: any) {
        console.warn("auth init:", err?.message);
        setSession(null); setUser(null);
      }
      setChecking(false);
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setSession(session);
        setUser({
          id: session.user.id,
          email: session.user.email || undefined,
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: session.user.updated_at || new Date().toISOString(),
        });
        // Don't auto-fetch companion here - let App render handle redirect
      } else if (event === "SIGNED_OUT") {
        setUser(null); setSession(null); setCompanion(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (checking) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF1493]/30 border-t-[#FF1493] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <LangProvider>
      <BrowserRouter>
        <div className="relative h-screen bg-black text-white overflow-hidden">
          <AmbientBreath />
          <div className="relative z-10 h-screen">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/onboard" element={user ? (companion ? <Navigate to="/home" replace /> : <OnboardPage />) : <Navigate to="/auth" replace />} />
              <Route path="/plaza" element={user ? <PlazaPage /> : <Navigate to="/auth" replace />} />
              <Route path="/create" element={user ? <CreatePage /> : <Navigate to="/auth" replace />} />
              <Route path="/home" element={user && companion ? <HomePage /> : <Navigate to={user ? "/onboard" : "/auth"} replace />} />
              <Route path="/chat" element={user && companion ? <ChatPage /> : <Navigate to={user ? "/onboard" : "/auth"} replace />} />
              <Route path="/memory" element={user && companion ? <MemoryPage /> : <Navigate to={user ? "/onboard" : "/auth"} replace />} />
              <Route path="/bond" element={user && companion ? <BondPage /> : <Navigate to={user ? "/onboard" : "/auth"} replace />} />
              <Route path="/settings" element={user ? <SettingsPage /> : <Navigate to="/auth" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </LangProvider>
  );
}

export default App;

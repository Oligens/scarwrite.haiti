import React, { useState, useEffect, Component, ReactNode, ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoadingSplash from "./components/LoadingSplash";

// Pages existantes
import Welcome from "./pages/Welcome";
import Dashboard from "./pages/Dashboard";
import SalesCalendar from "./pages/SalesCalendar";
import DayDetail from "./pages/DayDetail";
import Products from "./pages/Products";
import Reports from "./pages/Reports";
import MonthlyReport from "./pages/MonthlyReport";
import AnnualReport from "./pages/AnnualReport";
import Settings from "./pages/Settings";
import Fiscality from "./pages/Fiscality";
import Transfers from "./pages/Transfers";
import TransfersCalendar from "./pages/TransfersCalendar";
import TransferDayDetail from "./pages/TransferDayDetail";
import TransferReports from "./pages/TransferReports";
import TransferMonthlyReport from "./pages/TransferMonthlyReport";
import TransferAnnualReport from "./pages/TransferAnnualReport";
import Accounting from "./pages/Accounting";
import TestSimulation from "./pages/TestSimulation";
import Suppliers from "./pages/Suppliers";
import NotFound from "./pages/NotFound";
import Donations from "./pages/Donations";
import Members from "./pages/Members";
import Projects from "./pages/Projects";
import Clients from "./pages/Clients";

const queryClient = new QueryClient();

// ErrorBoundary amélioré pour capturer les erreurs de Silos
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRASH SCARWRITE:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-6xl">⚠️</div>
            <h1 className="text-2xl font-bold">Erreur de Rendu Critique</h1>
            <p className="text-muted-foreground italic">
              Le changement d'entité a provoqué une désynchronisation du DOM.
            </p>
            <button
              onClick={() => {
                localStorage.clear(); // Nettoyage de secours
                window.location.href = "/";
              }}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold shadow-lg"
            >
              Réinitialiser et Reconnecter
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeEntity, setActiveEntity] = useState(localStorage.getItem("scarwrite_active_entity") || "SA");

  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    
    // Listener pour détecter le changement d'entité en temps réel
    const handleEntityChange = () => {
      const entity = localStorage.getItem("scarwrite_active_entity") || "SA";
      setActiveEntity(entity);
    };

    window.addEventListener("storage", handleEntityChange);
    return () => {
      clearTimeout(t);
      window.removeEventListener("storage", handleEntityChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* La clé activeEntity ici force React à détruire/reconstruire l'arbre DOM proprement */}
      <ErrorBoundary key={activeEntity}>
        <Toaster />
        <Sonner />
        {showSplash && <LoadingSplash />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<SalesCalendar />} />
            <Route path="/day/:date" element={<DayDetail />} />
            <Route path="/products" element={<Products />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/reports/month/:monthYear" element={<MonthlyReport />} />
            <Route path="/reports/annual/:year" element={<AnnualReport />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/fiscality" element={<Fiscality />} />
            <Route path="/accounting" element={<Accounting />} />
            <Route path="/test-simulation" element={<TestSimulation />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/transfers/calendar" element={<TransfersCalendar />} />
            <Route path="/transfers/day/:date" element={<TransferDayDetail />} />
            <Route path="/transfers/reports" element={<TransferReports />} />
            <Route path="/transfers/reports/month/:monthYear" element={<TransferMonthlyReport />} />
            <Route path="/transfers/reports/annual/:year" element={<TransferAnnualReport />} />
            <Route path="/donations" element={<Donations />} />
            <Route path="/members" element={<Members />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;

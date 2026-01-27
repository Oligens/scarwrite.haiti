import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Component, ReactNode, ErrorInfo } from "react";
import LoadingSplash from "./components/LoadingSplash";
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

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">⚠️ Une erreur est survenue</h1>
            <p className="text-muted-foreground mb-4">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Recharger l'application
            </button>
            <details className="mt-6 text-left bg-muted p-4 rounded-md">
              <summary className="cursor-pointer font-semibold text-foreground">Détails de l'erreur</summary>
              <pre className="mt-2 text-xs text-muted-foreground overflow-auto max-h-48">
                {this.state.error?.stack}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App = () => {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
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
            {/* Nouvelles pages pour entités sociales */}
            <Route path="/donations" element={<Donations />} />
            <Route path="/members" element={<Members />} />
            <Route path="/projects" element={<Projects />} />
            {/* Nouvelles pages pour entreprises */}
            <Route path="/clients" element={<Clients />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;

import { getSettings } from "@/lib/storage";
import { User, Menu, X } from "@/lib/lucide-react";

interface AppHeaderProps {
  title?: string;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function AppHeader({ title, onToggleSidebar, sidebarCollapsed }: AppHeaderProps) {
  const settings = getSettings();
  const currentYear = new Date().getFullYear();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-navy-light bg-navy-deep px-4 md:px-8 shadow-sm">
      {/* Left Section - Logo + Toggle Button (Desktop & Mobile) */}
      <div className="flex items-center gap-3">
        {/* Toggle Sidebar Button - UNIVERSAL (Desktop & Mobile) */}
        <button
          className="inline-flex items-center justify-center h-10 w-10 rounded-md text-white hover:text-amber-400 hover:bg-navy-light border border-yellow-500/50 shadow-md transition-all duration-200"
          onClick={onToggleSidebar}
          aria-label={sidebarCollapsed ? "Open menu" : "Close menu"}
          title={sidebarCollapsed ? "Ouvrir" : "Fermer"}
        >
          {sidebarCollapsed ? <Menu className="h-5 w-5 text-white" /> : <X className="h-5 w-5 text-white" />}
        </button>

        {/* ScarWrite Logo + Title */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-500/20 border border-yellow-500/40">
            <img src="/scarwrite.png" alt="ScarWrite" className="h-6 w-6 object-contain" />
          </div>
          <span className="font-display text-lg font-semibold text-white hidden md:inline">
            ScarWrite
          </span>
        </div>
      </div>

      {/* Center - Title if provided */}
      {title && (
        <div className="flex items-center">
          <h1 className="text-luxury-title text-white">{title}</h1>
        </div>
      )}

      {/* Right - Company info */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {settings.restaurant_name}
          </p>
          <p className="text-xs text-gray-300">
            Année fiscale {currentYear}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-500/40">
          <User className="h-5 w-5 text-yellow-400" />
        </div>
      </div>
    </header>
  );
}

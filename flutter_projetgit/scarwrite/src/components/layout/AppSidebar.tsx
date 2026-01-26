import { Link, useLocation } from "react-router-dom";
import React from 'react';
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ArrowRightLeft,
  Package,
  Users,
  Briefcase,
  Heart,
  FolderOpen,
  Calendar,
  Settings,
  FileText,
  Calculator,
} from "@/lib/lucide-react";
import { cn } from "@/lib/utils";
import { getCompanyType } from "@/lib/storage";

interface MenuItem {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  path: string;
}

interface AppSidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function AppSidebar({ onClose, isMobile }: AppSidebarProps) {
  const location = useLocation();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMenuItems = async () => {
      const companyType = await getCompanyType();
      const isSocial = ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType || '');

      const baseItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
      ];

      const companyItems: MenuItem[] = [
        { icon: ArrowRightLeft, label: "Transactions", path: "/transfers" },
        { icon: Package, label: "Produits", path: "/products" },
        { icon: Users, label: "Clients", path: "/clients" },
        { icon: Briefcase, label: "Fournisseurs", path: "/suppliers" },
      ];

      const socialItems: MenuItem[] = [
        { icon: Heart, label: "Dons et Apports", path: "/donations" },
        { icon: Users, label: "Membres", path: "/members" },
        { icon: FolderOpen, label: "Projets", path: "/projects" },
      ];

      const commonItems: MenuItem[] = [
        { icon: Calendar, label: "Calendrier", path: "/calendar" },
        { icon: Calculator, label: "Comptabilité", path: "/accounting" },
        { icon: FileText, label: "Fiscalité", path: "/fiscality" },
        { icon: Settings, label: "Paramètres", path: "/settings" },
      ];

      const items = isSocial
        ? [...baseItems, ...socialItems, ...commonItems]
        : [...baseItems, ...companyItems, ...commonItems];

      setMenuItems(items);
      setLoading(false);
    };

    loadMenuItems();
  }, []);

  if (loading) {
    return (
      <aside className={cn(
        // Mobile: full height/full width; parent will control positioning
        isMobile ? "h-screen w-full overflow-y-auto" : "h-screen w-64",
        isMobile ? "bg-slate-900 border-slate-800" : "sidebar-gradient border-sidebar-border"
      )} />
    );
  }

  return (
    <aside className={cn(
      // Mobile: full height/full width; parent handles fixed positioning
      isMobile ? "h-screen w-full overflow-y-auto" : "h-screen",
      "bg-navy-deep border-r border-navy-light flex flex-col"
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6 sticky top-0 z-10 bg-navy-deep border-navy-light">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-yellow-500/20 border-yellow-500/40 flex-shrink-0">
          <img src="/scarwrite.png" alt="ScarWrite" className="h-8 w-8 object-contain" />
        </div>
        <span className="font-display text-xl font-bold text-white">
          ScarWrite
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-4 pb-24">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
          
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onClose && onClose()}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-sans font-medium transition-all duration-200 w-full text-left",
                isActive
                  ? "bg-yellow-500/20 text-yellow-400 border-l-2 border-yellow-400 shadow-sm"
                  : "text-gray-300 hover:bg-navy-light hover:text-white"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 flex-shrink-0",
                isActive ? "text-yellow-400" : "text-gray-400"
              )} />
              <span className="font-sans font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t p-4 mt-auto bg-navy-deep border-navy-light">
        <div className="rounded-lg p-3 bg-emerald-900/30 border border-emerald-700/50">
          <p className="text-xs font-sans font-medium text-emerald-300">Mode hors ligne</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs font-sans font-medium text-emerald-400">Actif</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

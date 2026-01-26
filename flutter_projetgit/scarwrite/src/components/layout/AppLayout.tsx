import React, { ReactNode, useState, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children?: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps): JSX.Element {
  // Desktop: collapsed by default true (opened), Mobile: collapsed true (closed)
  const [isDesktop, setIsDesktop] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Detect screen size on mount
  useEffect(() => {
    const checkDesktop = () => {
      const isDesktopScreen = window.innerWidth >= 768;
      setIsDesktop(isDesktopScreen);
      // On desktop: default open (collapsed=false), on mobile: default closed (collapsed=true)
      setSidebarCollapsed(!isDesktopScreen);
    };
    
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const closeSidebar = () => {
    setSidebarCollapsed(true);
  };

  return (
    <div className={`min-h-screen bg-star-dust flex ${!isDesktop && !sidebarCollapsed ? 'overflow-hidden' : ''}`}>
      {/* Sidebar - Desktop: inline, Mobile: overlay with backdrop */}
      {/* Desktop container */}
      <div
        className={`hidden md:block transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-0' : 'w-64'
        } overflow-hidden`}
      >
        <AppSidebar onClose={closeSidebar} isMobile={false} />
      </div>

      {/* Mobile overlay/backdrop when open */}
      {(!isDesktop && !sidebarCollapsed) ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeSidebar} />
          <div className="fixed inset-0 left-0 z-50 w-full">
            <AppSidebar onClose={closeSidebar} isMobile={true} />
          </div>
        </>
      ) : null}

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out`}>
        <AppHeader 
          title={title} 
          onToggleSidebar={toggleSidebar} 
          sidebarCollapsed={sidebarCollapsed}
        />

        <main className="p-4 md:p-8 bg-gray-50 flex-1 overflow-auto">
          {(children as React.ReactNode)}
        </main>
      </div>
    </div>
  );
}

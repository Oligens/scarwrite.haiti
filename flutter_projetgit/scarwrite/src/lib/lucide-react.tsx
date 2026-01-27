import React from 'react';

// SVG Icon components for better visibility and clarity
const createIcon = (pathData: string, viewBox = "0 0 24 24") => {
  return (props: React.SVGProps<SVGSVGElement>) => (
    <svg
      viewBox={viewBox}
      xmlns="http://www.w3.org/2000/svg"
      fill="currentColor"
      {...props}
    >
      <path d={pathData} />
    </svg>
  );
};

// Navigation and UI icons
export const Menu = createIcon("M3 12h18M3 6h18M3 18h18");
export const LayoutDashboard = createIcon("M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z");
export const X = createIcon("M18 6L6 18M6 6l12 12");
export const Search = createIcon("M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z");
export const ChevronLeft = createIcon("M15 19l-7-7 7-7");
export const ChevronRight = createIcon("M9 5l7 7-7 7");
export const ChevronDown = createIcon("M6 9l6 6 6-6");
export const ChevronUp = createIcon("M6 15l6-6 6 6");
export const Plus = createIcon("M12 5v14m-7-7h14");
export const PlusCircle = createIcon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z");
export const Download = createIcon("M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-4l-4 4m0 0l-4-4m4 4V4");
export const Upload = createIcon("M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-8l-4-4m0 0l-4 4m4-4v12");
export const Pencil = createIcon("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7");
export const Trash2 = createIcon("M3 6h18m2 0v2m-4 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8h-3m4-4h4a1 1 0 011 1v1H7V3a1 1 0 011-1z");
export const Trash = Trash2;
export const Save = createIcon("M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z");
export const MoreHorizontal = createIcon("M12 5a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4zm0 7a2 2 0 110-4 2 2 0 010 4z");
export const Edit = createIcon("M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7");
export const Printer = createIcon("M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2");
export const PanelLeft = createIcon("M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h4m0-18v18m0-18h10a2 2 0 012 2v14a2 2 0 01-2 2h-10");
export const User = createIcon("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 110 8 4 4 0 010-8z");
export const GripVertical = createIcon("M9 3h2m0 0h2M9 3v2m0 0v2M9 9h2m0 0h2M9 9v2m0 0v2M15 3h2m0 0h2m-2 0v2m0 0v2m0 4h2m0 0h2m-2 0v2m0 0v2");
export const Dot = createIcon("M12 12a1 1 0 110-2 1 1 0 010 2z");
export const Circle = createIcon("M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
export const Check = createIcon("M5 13l4 4L19 7");
export const Globe = createIcon("M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9");
export const HelpCircle = createIcon("M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z");
export const AlertCircle = createIcon("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z");

// Financial and transaction icons
export const Calendar = createIcon("M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM9 9h6");
export const CalendarDays = createIcon("M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z");
export const CalendarIcon = createIcon("M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z");
export const BarChart3 = createIcon("M3 3v16a2 2 0 002 2h14a2 2 0 002-2V8.343M15 3h6v6M9 13h4m-8 0h4m-8 4h16M3 3l6 6");
export const Calculator = createIcon("M7 2h10v20H7V2zm2 2v4h6V4H9zm0 6v6h6V10H9z");
export const DollarSign = createIcon("M12 1v6m0 6v6M6.51 5.11c.78-.45 1.76-.89 3.49-.89 2.7 0 3.59 1.36 3.59 2.73 0 1.8-1.08 2.3-2.86 3l-2.22 1.2M6.51 17.89c.78.45 1.76.89 3.49.89 2.7 0 3.59-1.36 3.59-2.73 0-1.8-1.08-2.3-2.86-3l-2.22-1.2");
export const TrendingUp = createIcon("M23 6l-9.5 9.5-5-5L1 18m7-7h5v5");
export const CreditCard = createIcon("M3 10h18a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2v-8a2 2 0 012-2zm0-4h18a2 2 0 012 2v2a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2z");
export const Receipt = createIcon("M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002-2 2 2 0 012 2m0 0h2m-7 8h4m-4 4h4");
export const FileText = createIcon("M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M10 9h4m-4 3h4m-4 3h4");
export const Share2 = createIcon("M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8m-6-6l-4-4m0 0L8 4m0 0v5m8-7l4 4m0 0l-4 4m4-4v5");
export const PiggyBank = createIcon("M12 8c0-1.105.895-2 2-2s2 .895 2 2v3h1a3 3 0 013 3v5a3 3 0 01-3 3H4a3 3 0 01-3-3v-5a3 3 0 013-3h1V8a4 4 0 014-4zm-4 2v4H4a1 1 0 00-1 1v5a1 1 0 001 1h12a1 1 0 001-1v-5a1 1 0 00-1-1h-4v-4a2 2 0 00-4 0z");
export const Wallet = createIcon("M17 8H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 00-2-2h-3V8a2 2 0 00-2-2zM16 15h2");
export const Banknote = createIcon("M3 7a2 2 0 012-2h14a2 2 0 012 2M3 7v10a2 2 0 002 2h14a2 2 0 002-2V7M12 9v2m-6 0h12");
export const Package = createIcon("M20.55 13.51a9.003 9.003 0 01-18.08-2c0-.3.015-.599.045-.897.119-.822.569-1.579 1.273-2.073l6.637-4.807a3 3 0 013.5 0l6.637 4.807c.704.494 1.154 1.25 1.273 2.073.03.298.045.597.045.897zM8 16h8m-8-3h8");
export const Smartphone = createIcon("M9 1h6a2 2 0 012 2v18a2 2 0 01-2 2H9a2 2 0 01-2-2V3a2 2 0 012-2zm6 18H9m3-4h.01");
export const Lock = createIcon("M12 1C6.48 1 2 5.48 2 11s4.48 10 10 10 10-4.48 10-10S17.52 1 12 1zm-2 15h4v-6h-4v6zm6-11H8v4h8V5z");
export const Unlock = createIcon("M13 16a1 1 0 11-2 0 1 1 0 012 0zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z");
export const ArrowRight = createIcon("M5 12h14M12 5l7 7-7 7");
export const ArrowLeft = createIcon("M19 12H5m7-7l-7 7 7 7");
export const ArrowRightLeft = createIcon("M7 16V4m0 0L3 8m4-4l4 4m10 0v12m0 0l4-4m-4 4l-4-4");
export const Heart = createIcon("M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z");
export const Users = createIcon("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M16 3.13a4 4 0 0 1 0 7.75M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z");
export const Briefcase = createIcon("M20 6h-3V3h-2v3h-8V3H5v3H2v14h18V6zM6 9h12v8H6V9z");
export const FolderOpen = createIcon("M22 19a2 2 0 0 1-2.414-1.80078125L19.458008 5a2 2 0 0 0-2-1.99609375H10a2 2 0 0 0-2 2v-.5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14.4");
export const Settings = createIcon("M12 1v6m0 6v6M4.22 4.22l-4.24 4.24m0 0l4.24 4.24M16.78 16.78l4.24 4.24m0 0l-4.24-4.24M1 12h6m6 0h6M7 19.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm9-9a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0z");

// Aliases for consistency
export const LucideIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => <svg {...props} />;

export default { Menu, X, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Plus, PlusCircle, Download, Upload, Pencil, Trash2, Save, MoreHorizontal, Edit, Printer, PanelLeft, User, GripVertical, Dot, Circle, Check, Globe, HelpCircle, AlertCircle, Calendar, CalendarDays, CalendarIcon, BarChart3, Calculator, DollarSign, TrendingUp, CreditCard, Receipt, FileText, Share2, PiggyBank, Wallet, Banknote, Package, Smartphone, Lock, Unlock, ArrowRight, ArrowLeft, ArrowRightLeft, Heart, Users, Briefcase, FolderOpen, Settings, LayoutDashboard };

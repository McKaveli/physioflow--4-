import type { Role } from "../lib/authStore";
import { Home, Activity, Dumbbell, CalendarDays, MessageCircle, User, Users, ClipboardList, BarChart3, Settings, Wallet, Building2, Package } from "lucide-react";
import type { ComponentType } from "react";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PATIENT: [
    { label: "Home", to: "/", icon: Home },
    { label: "My Recovery", to: "/recovery", icon: Activity },
    { label: "Exercises", to: "/exercises", icon: Dumbbell },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Messages", to: "/messages", icon: MessageCircle },
    { label: "Profile", to: "/profile", icon: User },
  ],
  PHYSIOTHERAPIST: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Treatment Plans", to: "/treatment-plans", icon: ClipboardList },
    { label: "Exercises", to: "/exercises", icon: Dumbbell },
    { label: "Inventory", to: "/inventory", icon: Package },
    { label: "Messages", to: "/messages", icon: MessageCircle },
    { label: "Reports", to: "/reports", icon: BarChart3 },
  ],
  CLINIC_ADMIN: [
    { label: "Overview", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Staff", to: "/staff", icon: Building2 },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Reports", to: "/reports", icon: BarChart3 },
  ],
  MANAGER: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Staff", to: "/staff", icon: Building2 },
    { label: "Treatment Plans", to: "/treatment-plans", icon: ClipboardList },
    { label: "Exercises", to: "/exercises", icon: Dumbbell },
    { label: "Inventory", to: "/inventory", icon: Package },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Messages", to: "/messages", icon: MessageCircle },
    { label: "Reports", to: "/reports", icon: BarChart3 },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
};

export const MOBILE_NAV_BY_ROLE: Record<Role, NavItem[]> = {
  PATIENT: [
    { label: "Home", to: "/", icon: Home },
    { label: "Recovery", to: "/recovery", icon: Activity },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Messages", to: "/messages", icon: MessageCircle },
    { label: "Profile", to: "/profile", icon: User },
  ],
  PHYSIOTHERAPIST: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Messages", to: "/messages", icon: MessageCircle },
  ],
  CLINIC_ADMIN: [
    { label: "Overview", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Reports", to: "/reports", icon: BarChart3 },
  ],
  MANAGER: [
    { label: "Dashboard", to: "/", icon: Home },
    { label: "Patients", to: "/patients", icon: Users },
    { label: "Appointments", to: "/appointments", icon: CalendarDays },
    { label: "Payments", to: "/payments", icon: Wallet },
    { label: "Settings", to: "/settings", icon: Settings },
  ],
};

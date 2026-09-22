import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { Activity, Menu, X } from "lucide-react";
import { useAuthStore } from "../lib/authStore";
import { NAV_BY_ROLE } from "./navConfig";
import { useClinic } from "../features/clinics/hooks";
import { useUnreadMessageCount } from "../features/notifications/hooks";
import { TopBar } from "./TopBar";

export function AppShell() {
  const { role, clinicId } = useAuthStore();
  const { data: clinic } = useClinic(clinicId);
  const { data: unreadMessages } = useUnreadMessageCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (!role) return null;
  const navItems = NAV_BY_ROLE[role];

  const navigation = (isCollapsed = false) => (
    <nav className={clsx("flex-1 overflow-y-auto px-3 py-4", isCollapsed && "px-2")}>
      <div className="flex flex-col gap-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            title={isCollapsed ? item.label : undefined}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              clsx(
                "group relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isCollapsed && "justify-center px-2",
                isActive ? "bg-white/12 text-white shadow-[inset_3px_0_0_var(--color-teal-500)]" : "text-brand-200 hover:bg-white/8 hover:text-white"
              )
            }
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className={clsx("flex-1 truncate", isCollapsed && "hidden")}>{item.label}</span>
            {item.to === "/messages" && !!unreadMessages && unreadMessages > 0 ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-urgent-500 text-[10px] font-semibold text-white">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </nav>
  );

  const footer = (isCollapsed = false) => (
    <div className="mt-auto border-t border-white/10 p-3">
      {clinic ? (
        <div className={clsx("mb-3 flex items-center gap-2.5 rounded-xl bg-white/8 px-3 py-2.5", isCollapsed && "justify-center px-2")}>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-700 text-xs font-bold text-white">{clinic.name.charAt(0)}</div>
          <div className={clsx("min-w-0", isCollapsed && "hidden")}>
            <p className="truncate text-sm font-semibold text-white">{clinic.name}</p>
            <p className="truncate text-xs text-brand-300">{clinic.city ?? "Care workspace"}</p>
          </div>
        </div>
      ) : null}
    </div>
  );

  const brand = (isCollapsed = false) => (
    <div className={clsx("flex items-center gap-3 px-5 py-6", isCollapsed && "justify-center px-2")}>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-brand-950 shadow-[0_0_0_5px_rgb(44_155_154_/_0.15)]"><Activity className="size-4.5" strokeWidth={2.5} /></div>
      <div className={clsx(isCollapsed && "hidden")}>
        <p className="text-lg font-semibold leading-tight tracking-tight text-white">PhysioFlow</p>
        <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.18em] text-brand-300">Care command center</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] md:flex">
      <aside className={clsx("sticky top-0 hidden h-screen shrink-0 flex-col border-r border-white/10 bg-[#0b0f14] text-white transition-[width] duration-200 md:flex", collapsed ? "w-[76px]" : "w-[260px]")}>
        {brand(collapsed)}
        {navigation(collapsed)}
        {footer(collapsed)}
        <button onClick={() => setCollapsed((value) => !value)} className="absolute -right-3 top-24 hidden size-6 items-center justify-center rounded-full border border-border bg-white text-xs text-ink-500 shadow-sm md:flex" aria-label="Toggle sidebar">{collapsed ? ">" : "<"}</button>
      </aside>

      {mobileOpen ? <button className="fixed inset-0 z-30 bg-brand-950/40 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
      <aside className={clsx("fixed inset-y-0 left-0 z-40 flex w-[min(88vw,19rem)] flex-col bg-brand-950 text-white shadow-[var(--shadow-raised)] transition-transform duration-200 md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <div className="flex items-center justify-between">{brand()}<button onClick={() => setMobileOpen(false)} className="mr-4 rounded-lg p-2 text-brand-200 hover:bg-white/10" aria-label="Close navigation"><X className="size-5" /></button></div>
        {navigation()}
        {footer()}
      </aside>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <div className="relative">
          <button onClick={() => setMobileOpen(true)} className="absolute left-3 top-2.5 z-10 flex size-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden" aria-label="Open navigation"><Menu className="size-5" /></button>
          <TopBar />
        </div>
        <main className="flex-1 pb-6 md:pb-0">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

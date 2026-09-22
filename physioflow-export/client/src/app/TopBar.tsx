import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Search, Bell, MessageCircle, ChevronDown, LogOut, User as UserIcon, Activity } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../lib/authStore";
import { useLogout } from "../features/auth/hooks";
import { useMyNotifications, useMarkNotificationRead, useUnreadMessageCount } from "../features/notifications/hooks";
import { CommandPalette } from "./CommandPalette";
import { NAV_BY_ROLE } from "./navConfig";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const { data: notifications } = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative flex size-9 items-center justify-center rounded-full text-ink-500 hover:bg-surface-sunken hover:text-ink-900"
        aria-label="Notifications"
      >
        <Bell className="size-4.5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-urgent-500 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="absolute right-0 top-11 z-30 w-80 rounded-[var(--radius-card)] border border-border bg-white shadow-[var(--shadow-raised)]">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink-900">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-400">You're all caught up.</p>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.readAt && markRead.mutate(n.id)}
                  className={clsx(
                    "flex w-full flex-col items-start gap-0.5 border-b border-border px-4 py-3 text-left last:border-0 hover:bg-surface-sunken",
                    !n.readAt && "bg-brand-50/50"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
                    {!n.readAt && <span className="size-1.5 shrink-0 rounded-full bg-brand-600" />}
                    <span className="text-sm font-medium text-ink-900">{n.title}</span>
                  </div>
                  <span className="text-xs text-ink-500">{n.body}</span>
                  <span className="text-[11px] text-ink-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));
  const { fullName, role } = useAuthStore();
  const logout = useLogout();

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setIsOpen((v) => !v)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-surface-sunken">
        <div className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
          {fullName?.charAt(0) ?? "?"}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-medium leading-tight text-ink-900">{fullName}</p>
          <p className="text-xs capitalize leading-tight text-ink-500">{role?.replace("_", " ").toLowerCase()}</p>
        </div>
        <ChevronDown className="size-3.5 text-ink-400" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-11 z-30 w-48 rounded-[var(--radius-card)] border border-border bg-white py-1 shadow-[var(--shadow-raised)]">
          <Link
            to="/profile"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-surface-sunken"
          >
            <UserIcon className="size-4" /> Profile
          </Link>
          <button
            onClick={() => logout.mutate()}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-urgent-700 hover:bg-surface-sunken"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unreadMessages } = useUnreadMessageCount();
  const role = useAuthStore((state) => state.role);
  const quickLinks = role ? NAV_BY_ROLE[role].slice(0, 4) : [];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-20 mx-3 mt-3 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2.5 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.3)] backdrop-blur-md md:mx-6 md:px-5">
      <Link to="/" className="hidden shrink-0 items-center gap-2 md:flex">
        <span className="flex size-8 items-center justify-center rounded-full bg-teal-500 text-brand-950"><Activity className="size-4" /></span>
        <span className="text-sm font-bold tracking-tight text-slate-900">PhysioFlow</span>
      </Link>
      <nav className="hidden items-center gap-1 lg:flex" aria-label="Quick navigation">
        {quickLinks.map((item) => <Link key={item.to} to={item.to} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900">{item.label}</Link>)}
      </nav>
      <button
        onClick={() => setIsSearchOpen(true)}
        className="flex flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-400 transition-colors hover:border-teal-500/60 sm:max-w-md"
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left sm:block">Search patients, exercises...</span>
        <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-400 sm:block">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          onClick={() => navigate("/messages")}
          className="relative flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Messages"
        >
          <MessageCircle className="size-4.5" />
          {!!unreadMessages && unreadMessages > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-urgent-500 text-[10px] font-semibold text-white">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </button>
        <NotificationBell />
        <div className="ml-1 h-6 w-px bg-slate-200" />
        <UserMenu />
      </div>

      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  );
}

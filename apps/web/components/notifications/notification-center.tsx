"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2, X } from "lucide-react";
import { useNotifications } from "@/hooks/use-launch";
import type { OfferOSNotification } from "@/lib/types";
import { Button } from "@/components/ui/button";

export function NotificationBell() {
  const notifications = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  return <div className="relative" ref={containerRef}>
    <button aria-expanded={open} aria-label={`Notifications${notifications.unreadCount ? `, ${notifications.unreadCount} unread` : ""}`} className="relative flex size-9 items-center justify-center rounded-lg border border-slate-700/45 bg-slate-900/30 text-slate-400 transition hover:text-white" onClick={() => setOpen((value) => !value)} type="button">
      <Bell className="size-4" />
      {notifications.unreadCount ? <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold leading-4 text-white">{Math.min(99, notifications.unreadCount)}</span> : null}
    </button>
    {open ? <div aria-label="Notification center" className="fixed inset-x-3 top-16 z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-xl border border-slate-700/45 bg-[var(--surface)] shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[380px]" role="dialog">
      <div className="flex items-center justify-between border-b border-slate-700/35 px-4 py-3"><div><h2 className="font-semibold text-white">Notifications</h2><p className="text-xs text-slate-500">{notifications.unreadCount} unread</p></div><div className="flex items-center gap-1">{notifications.unreadCount ? <button aria-label="Mark all notifications as read" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800/50 hover:text-white" onClick={() => void notifications.markAllRead()} type="button"><CheckCheck className="size-4" /></button> : null}<button aria-label="Close notifications" className="rounded-lg p-2 text-slate-400 hover:text-white" onClick={() => setOpen(false)} type="button"><X className="size-4" /></button></div></div>
      <div className="max-h-[60dvh] overflow-y-auto"><NotificationList items={notifications.items.slice(0, 8)} loading={notifications.loading} onRead={notifications.markRead} /></div>
      <Link className="block border-t border-slate-700/35 px-4 py-3 text-center text-sm font-medium text-indigo-200 hover:bg-slate-800/30" href="/notifications" onClick={() => setOpen(false)}>View all notifications</Link>
    </div> : null}
  </div>;
}

export function NotificationWorkspace() {
  const notifications = useNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const items = filter === "unread" ? notifications.items.filter((item) => !item.readAt) : notifications.items;
  return <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-lg border border-slate-700/45 bg-slate-900/25 p-1">{(["all", "unread"] as const).map((value) => <button className={`rounded-md px-3 py-1.5 text-sm capitalize ${filter === value ? "bg-indigo-400/12 text-indigo-100" : "text-slate-500"}`} key={value} onClick={() => setFilter(value)} type="button">{value}</button>)}</div>{notifications.unreadCount ? <Button onClick={() => void notifications.markAllRead()} variant="secondary"><CheckCheck className="size-4" />Mark all read</Button> : null}</div><section className="overflow-hidden rounded-xl border border-slate-700/35 bg-[var(--surface)]"><NotificationList items={items} loading={notifications.loading} onRead={notifications.markRead} /></section></div>;
}

function NotificationList({ items, loading, onRead }: { items: OfferOSNotification[]; loading: boolean; onRead: (id: string) => Promise<OfferOSNotification> }) {
  if (loading && !items.length) return <div className="flex items-center justify-center gap-2 px-5 py-12 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" />Loading notifications...</div>;
  if (!items.length) return <div className="px-6 py-12 text-center"><Bell className="mx-auto size-6 text-indigo-300" /><p className="mt-3 text-sm font-medium text-slate-200">You are caught up</p><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">Important analysis results, deadlines, follow-ups, and interview completions will appear here.</p></div>;
  const groups = groupNotifications(items);
  return <div>{groups.map(([label, values]) => <section key={label}><h3 className="border-b border-slate-700/25 bg-slate-900/20 px-4 py-2 text-xs font-semibold uppercase text-slate-500">{label}</h3>{values.map((item) => <article className={`border-b border-slate-700/25 px-4 py-3 last:border-b-0 ${item.readAt ? "" : "bg-indigo-300/[0.035]"}`} key={item.id}><div className="flex gap-3"><span aria-label={item.readAt ? "Read" : "Unread"} className={`mt-2 size-2 shrink-0 rounded-full ${item.readAt ? "bg-slate-700" : "bg-indigo-400"}`} /><div className="min-w-0 flex-1"><div className="flex justify-between gap-3"><h4 className="text-sm font-medium text-slate-200">{item.title}</h4><time className="shrink-0 text-[11px] text-slate-600">{relativeTime(item.createdAt)}</time></div><p className="mt-1 text-xs leading-5 text-slate-500">{item.message}</p><div className="mt-2 flex items-center gap-3">{item.actionUrl ? <Link className="text-xs font-medium text-indigo-200" href={item.actionUrl} onClick={() => { if (!item.readAt) void onRead(item.id); }}>{item.actionLabel || "Open"}</Link> : null}{!item.readAt ? <button className="text-xs text-slate-500 hover:text-slate-300" onClick={() => void onRead(item.id)} type="button">Mark read</button> : null}</div></div></div></article>)}</section>)}</div>;
}

function groupNotifications(items: OfferOSNotification[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const groups: Record<string, OfferOSNotification[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items) {
    const value = new Date(item.createdAt);
    const label = value >= today ? "Today" : value >= yesterday ? "Yesterday" : "Earlier";
    groups[label].push(item);
  }
  return Object.entries(groups).filter(([, values]) => values.length);
}
function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  if (minutes < 1_440) return `${Math.round(minutes / 60)}h`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

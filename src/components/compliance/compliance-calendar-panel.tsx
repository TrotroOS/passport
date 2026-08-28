"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  RefreshCw,
  ShieldAlert,
  Truck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type {
  CalendarEventType,
  ComplianceCalendarEvent,
  ComplianceCalendarSummary,
} from "@/lib/compliance/compliance-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";

const EVENT_TYPES: CalendarEventType[] = [
  "task_due",
  "task_overdue",
  "tracking",
  "clearance_target",
  "screening_review",
];

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function EventIcon({ type }: { type: CalendarEventType }) {
  switch (type) {
    case "task_due":
    case "task_overdue":
      return <Clock className="h-4 w-4" />;
    case "tracking":
      return <Truck className="h-4 w-4" />;
    case "screening_review":
      return <ShieldAlert className="h-4 w-4" />;
    default:
      return <Calendar className="h-4 w-4" />;
  }
}

function urgencyStyles(urgency: ComplianceCalendarEvent["urgency"], isOverdue: boolean) {
  if (isOverdue || urgency === "overdue") {
    return "border-destructive/40 bg-destructive/5";
  }
  if (urgency === "urgent") {
    return "border-amber-500/40 bg-amber-500/5";
  }
  return "border-border bg-card";
}

function priorityVariant(priority?: string) {
  switch (priority) {
    case "urgent":
    case "critical":
      return "destructive" as const;
    case "high":
      return "default" as const;
    default:
      return "secondary" as const;
  }
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthGrid(year: number, month: number): Array<Date | null> {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  return cells;
}

function relativeDayLabel(dayKey: string, t: ReturnType<typeof useTranslations>): string {
  const today = new Date();
  const target = new Date(`${dayKey}T12:00:00`);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const targetStart = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const diff = Math.round((targetStart.getTime() - todayStart.getTime()) / (24 * 60 * 60 * 1000));

  if (diff === 0) return t("today");
  if (diff === 1) return t("tomorrow");
  if (diff === -1) return t("yesterday");
  if (diff < 0) return t("daysAgo", { count: Math.abs(diff) });
  return t("inDays", { count: diff });
}

export function ComplianceCalendarPanel() {
  const t = useTranslations("calendar");
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(toDayKey(today.toISOString()));
  const [activeTypes, setActiveTypes] = useState<Set<CalendarEventType>>(new Set(EVENT_TYPES));
  const [events, setEvents] = useState<ComplianceCalendarEvent[]>([]);
  const [summary, setSummary] = useState<ComplianceCalendarSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/compliance/calendar?month=${viewMonth}&year=${viewYear}`
      );
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [viewMonth, viewYear]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredEvents = useMemo(
    () => events.filter((ev) => activeTypes.has(ev.event_type)),
    [events, activeTypes]
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ComplianceCalendarEvent[]>();
    for (const ev of filteredEvents) {
      const day = toDayKey(ev.due_at);
      const list = map.get(day) ?? [];
      list.push(ev);
      map.set(day, list);
    }
    return map;
  }, [filteredEvents]);

  const monthGrid = useMemo(
    () => buildMonthGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(new Date(viewYear, viewMonth, 1));

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewMonth(next.getMonth());
    setViewYear(next.getFullYear());
    setSelectedDay(null);
  }

  function toggleType(type: CalendarEventType) {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  const agendaDays = useMemo(() => {
    const keys = Array.from(eventsByDay.keys()).sort();
    if (selectedDay && eventsByDay.has(selectedDay)) {
      return [selectedDay];
    }
    return keys;
  }, [eventsByDay, selectedDay]);

  const overdueEvents = filteredEvents.filter((e) => e.is_overdue);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={viewMode === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("month")}
          >
            <CalendarDays className="me-2 h-4 w-4" />
            {t("viewMonth")}
          </Button>
          <Button
            variant={viewMode === "agenda" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setViewMode("agenda");
              setSelectedDay(null);
            }}
          >
            <List className="me-2 h-4 w-4" />
            {t("viewAgenda")}
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("me-2 h-4 w-4", loading && "animate-spin")} />
            {t("refresh")}
          </Button>
        </div>
      </div>

      {summary ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className={summary.overdue > 0 ? "border-destructive/40" : undefined}>
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertTriangle
                className={cn(
                  "h-8 w-8",
                  summary.overdue > 0 ? "text-destructive" : "text-muted-foreground"
                )}
              />
              <div>
                <p className="text-2xl font-bold">{summary.overdue}</p>
                <p className="text-xs text-muted-foreground">{t("kpiOverdue")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Clock className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{summary.this_week}</p>
                <p className="text-xs text-muted-foreground">{t("kpiThisWeek")}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary.total}</p>
                <p className="text-xs text-muted-foreground">{t("kpiTotal")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {EVENT_TYPES.map((type) => {
          const count = summary?.by_type[type] ?? 0;
          const active = activeTypes.has(type);
          return (
            <Button
              key={type}
              variant={active ? "default" : "outline"}
              size="sm"
              className="h-8"
              onClick={() => toggleType(type)}
            >
              {t(`type.${type}`)}
              {count > 0 ? (
                <Badge variant="secondary" className="ms-2 px-1.5 py-0 text-xs">
                  {count}
                </Badge>
              ) : null}
            </Button>
          );
        })}
      </div>

      <div className={cn("grid gap-6", viewMode === "month" && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
        {viewMode === "month" ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base">{monthLabel}</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setViewMonth(today.getMonth());
                    setViewYear(today.getFullYear());
                    setSelectedDay(toDayKey(today.toISOString()));
                  }}
                >
                  {t("today")}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2 grid grid-cols-7 gap-1">
                {WEEKDAY_KEYS.map((key) => (
                  <div
                    key={key}
                    className="py-1 text-center text-xs font-medium uppercase text-muted-foreground"
                  >
                    {t(`weekday.${key}`)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((date, idx) => {
                  if (!date) {
                    return <div key={`pad-${idx}`} className="aspect-square" />;
                  }

                  const dayKey = toDayKey(date.toISOString());
                  const dayEvents = eventsByDay.get(dayKey) ?? [];
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDay === dayKey;
                  const hasOverdue = dayEvents.some((e) => e.is_overdue);

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => setSelectedDay(dayKey)}
                      className={cn(
                        "flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition",
                        isSelected && "border-primary bg-primary/10 ring-1 ring-primary",
                        !isSelected && isToday && "border-primary/50 bg-primary/5",
                        !isSelected && !isToday && "hover:bg-accent"
                      )}
                    >
                      <span className={cn("font-medium", isToday && "text-primary")}>
                        {date.getDate()}
                      </span>
                      {dayEvents.length > 0 ? (
                        <span className="mt-1 flex gap-0.5">
                          {hasOverdue ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                          ) : null}
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                          {dayEvents.length > 1 ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                          ) : null}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedDay
                ? `${relativeDayLabel(selectedDay, t)} · ${formatDate(`${selectedDay}T12:00:00`)}`
                : t("upcoming")}
            </CardTitle>
            {selectedDay ? (
              <CardDescription>
                <button
                  type="button"
                  className="text-primary hover:underline"
                  onClick={() => setSelectedDay(null)}
                >
                  {t("showAll")}
                </button>
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-md bg-muted" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <div className="space-y-6">
                {!selectedDay && overdueEvents.length > 0 ? (
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {t("overdueSection")} ({overdueEvents.length})
                    </h3>
                    <ul className="space-y-2">
                      {overdueEvents.map((ev) => (
                        <EventRow key={ev.id} event={ev} t={t} />
                      ))}
                    </ul>
                  </section>
                ) : null}

                {agendaDays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("emptyDay")}</p>
                ) : (
                  agendaDays.map((day) => {
                    const dayEvents = eventsByDay.get(day) ?? [];
                    const visibleEvents = selectedDay
                      ? dayEvents
                      : dayEvents.filter((e) => !e.is_overdue);

                    if (visibleEvents.length === 0) return null;

                    return (
                      <section key={day}>
                        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                          {relativeDayLabel(day, t)} · {formatDate(`${day}T12:00:00`)}
                        </h3>
                        <ul className="space-y-2">
                          {visibleEvents.map((ev) => (
                            <EventRow key={ev.id} event={ev} t={t} />
                          ))}
                        </ul>
                      </section>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EventRow({
  event,
  t,
}: {
  event: ComplianceCalendarEvent;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <li>
      <Link
        href={`/shipments/${event.shipment_id}`}
        className={cn(
          "flex items-start gap-3 rounded-md border p-3 transition hover:shadow-sm",
          urgencyStyles(event.urgency, event.is_overdue)
        )}
      >
        <span
          className={cn(
            "mt-0.5",
            event.is_overdue ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <EventIcon type={event.event_type} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{event.title}</span>
            <Badge variant="outline">{event.shipment_ref}</Badge>
            <Badge variant="secondary" className="text-xs">
              {t(`type.${event.event_type}`)}
            </Badge>
            {event.priority ? (
              <Badge variant={priorityVariant(event.priority)} className="text-xs capitalize">
                {event.priority}
              </Badge>
            ) : null}
            {event.is_overdue ? (
              <Badge variant="destructive" className="text-xs">
                {t("overdue")}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
        </div>
      </Link>
    </li>
  );
}

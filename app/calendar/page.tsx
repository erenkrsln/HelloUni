"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuery } from "convex/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EventFormModal } from "@/components/event-form-modal";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { parseTerminStartDate, parseTerminEndDate } from "@/lib/utils";

type Event = {
    _id: Id<"events">;
    title: string;
    description?: string;
    startTime: number;
    endTime: number;
    location?: string;
    createdBy: Id<"users">;
    isPrivate?: boolean;
    workspaceId?: string;
};

export default function CalendarPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { currentUser, isLoading: isAuthLoading } = useCurrentUser();
    const [viewMode, setViewMode] = useState("my");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activeFilters, setActiveFilters] = useState<Record<string, boolean>>({
        personal: true,
        group: true,
        public: true,
        termin: true,
    });

    const toggleFilter = (key: string) => {
        setActiveFilters(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const myEvents = useQuery(
        api.events.listByUser,
        currentUser ? { userId: currentUser._id } : "skip"
    );
    const publicEvents = useQuery(api.events.listPublic, {});
    const semesterTermine = useQuery(api.queries.getSemesterTermineCache)?.termine ?? [];

    const events = viewMode === "my" ? (currentUser ? myEvents : []) : publicEvents;

    const upcomingEvents = useMemo(() => {
        if (!events) return [];
        return events.filter(e => {
            const ed = new Date(e.startTime);
            const isGroupEvent = !!e.workspaceId;
            const type = isGroupEvent ? "group" : e.isPrivate ? "personal" : "public";
            if (!activeFilters[type]) return false;
            return ed.getMonth() === currentDate.getMonth() && ed.getFullYear() === currentDate.getFullYear();
        }).sort((a, b) => a.startTime - b.startTime);
    }, [events, currentDate, activeFilters]);

    const isLoading = viewMode === "my"
        ? isAuthLoading || (!!currentUser && myEvents === undefined)
        : publicEvents === undefined;

    const searchParams = useSearchParams();
    const workspaceParam = searchParams.get("workspace") ?? "";
    const myConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
    const groupOptions = useMemo(
        () => (myConversations || []).filter((conv) => (conv as any).isGroup),
        [myConversations]
    );

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedDate, setSelectedDate] = useState("");
    const [selectedDayEvents, setSelectedDayEvents] = useState<{
        dateLabel: string;
        dateStr: string;
        events: Event[];
        termine: any[];
    } | null>(null);

    const openEdit = (e: Event) => {
        setEditingEvent(e);
    };

    const monthTermine = useMemo(() => {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        return semesterTermine.filter(t => {
            const start = parseTerminStartDate(t.date);
            const end = parseTerminEndDate(t.date);
            if (!start || !end) return false;
            const effectiveEnd = end.getFullYear() === 9999 ? start : end;
            return start <= monthEnd && effectiveEnd >= monthStart;
        });
    }, [semesterTermine, currentDate]);

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const renderCalendarGrid = () => {
        const days = [];
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[4rem] bg-muted/30 border-b border-r border-border last:border-r-0" />);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const isToday =
                i === new Date().getDate() &&
                currentDate.getMonth() === new Date().getMonth() &&
                currentDate.getFullYear() === new Date().getFullYear();

            const dayEvents = events?.filter(e => {
                const ed = new Date(e.startTime);
                return ed.getDate() === i && ed.getMonth() === currentDate.getMonth() && ed.getFullYear() === currentDate.getFullYear();
            }) || [];

            const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            const dayTermine = semesterTermine.filter(t => {
                const start = parseTerminStartDate(t.date);
                const end = parseTerminEndDate(t.date);
                if (!start || !end) return false;
                const effectiveEnd = end.getFullYear() === 9999 ? start : end;
                return start <= day && effectiveEnd >= day;
            });

            const combinedItems = [
                ...dayTermine.map((t, idx) => ({
                    id: `t-${idx}`,
                    title: t.description || "Semestertermin",
                    colorClass: "bg-[#F78D57]/10 text-[#b55018] border border-[#F78D57]/20",
                    isTermin: true,
                    type: "termin" as const,
                    eventObj: null
                })),
                ...dayEvents.map(e => {
                    const isGroupEvent = !!e.workspaceId;
                    const type = isGroupEvent ? ("group" as const) : e.isPrivate ? ("personal" as const) : ("public" as const);
                    return {
                        id: e._id,
                        title: e.title || "Event",
                        colorClass: isGroupEvent
                            ? "bg-blue-50 text-blue-700 border border-blue-100/70 dark:bg-blue-950/30 dark:text-blue-300"
                            : e.isPrivate
                                ? "bg-purple-50 text-purple-700 border border-purple-100/70 dark:bg-purple-950/30 dark:text-purple-300"
                                : "bg-amber-50 text-amber-700 border border-amber-100/70 dark:bg-amber-950/30 dark:text-amber-300",
                        isTermin: false,
                        type,
                        eventObj: e
                    };
                })
            ].filter(item => activeFilters[item.type]);

            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const dateLabel = new Date(currentDate.getFullYear(), currentDate.getMonth(), i).toLocaleDateString("de-DE", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric"
            });

            const handleDayCellClick = () => {
                setSelectedDate(dateStr);
                if (combinedItems.length > 1) {
                    setSelectedDayEvents({
                        dateLabel,
                        dateStr,
                        events: dayEvents.filter(e => {
                            const isGroupEvent = !!e.workspaceId;
                            const type = isGroupEvent ? "group" : e.isPrivate ? "personal" : "public";
                            return activeFilters[type];
                        }),
                        termine: dayTermine.filter(() => activeFilters.termin)
                    });
                } else {
                    setIsCreateOpen(true);
                }
            };

            const visibleItems = combinedItems.slice(0, 2);
            const remainingCount = combinedItems.length - 2;

            days.push(
                <div key={i}
                    className={`min-h-[4.8rem] md:min-h-[6.8rem] bg-background border-b border-r border-border last:border-r-0 p-1 relative active:bg-muted transition-colors cursor-pointer flex flex-col gap-1 overflow-hidden ${isToday ? 'bg-blue-50/10 dark:bg-blue-950/20 font-bold' : ''}`}
                    onClick={handleDayCellClick}
                >
                    <div className="flex justify-between items-center w-full mb-0.5">
                        <div className={`text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full select-none ${isToday ? 'bg-black text-white shadow-sm' : 'text-muted-foreground'}`}>
                            {i}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1 w-full flex-1 justify-start overflow-hidden">
                        {visibleItems.map(item => (
                            <div key={item.id}
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate w-full select-none ${item.colorClass}`}
                                title={item.title}
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    if (!item.isTermin && item.eventObj) {
                                        openEdit(item.eventObj);
                                    } else {
                                        handleDayCellClick();
                                    }
                                }}
                            >
                                {item.title}
                            </div>
                        ))}
                        {remainingCount > 0 && (
                            <div
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    handleDayCellClick();
                                }}
                                className="text-[9px] font-extrabold text-muted-foreground hover:text-foreground pl-1 select-none w-full text-left"
                            >
                                +{remainingCount} mehr
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    const filterItems = [
        { key: "personal", label: "Privat", dotColor: "bg-purple-400" },
        { key: "group", label: "Gruppe", dotColor: "bg-blue-400" },
        { key: "public", label: "Öffentlich", dotColor: "bg-amber-400" },
        { key: "termin", label: "Semestertermin", dotColor: "bg-[#F78D57]" },
    ];

    const getFilterStyles = (key: string, isActive: boolean) => {
        if (!isActive) return "bg-muted/70 border-border text-muted-foreground opacity-60";
        return {
            personal: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100/50 dark:bg-purple-950/30 dark:border-purple-800 dark:text-purple-300",
            group: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/50 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-300",
            public: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100/50 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300",
            termin: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100/50 dark:bg-orange-950/30 dark:border-orange-800 dark:text-orange-300",
        }[key as "personal" | "group" | "public" | "termin"];
    };

    return (
        <main className="min-h-screen w-full max-w-md mx-auto md:max-w-3xl pb-32 header-spacing bg-background">
            <Header onMenuClick={() => setIsSidebarOpen(true)} title="Kalender" />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Kalender</h1>
                        <p className="text-sm text-muted-foreground">Verwalte deinen Zeitplan</p>
                    </div>
                    <Button onClick={() => { setSelectedDate(""); setIsCreateOpen(true); }} size="icon" className="h-10 w-10 bg-black text-white hover:bg-neutral-800 rounded-full shadow-lg">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                <Tabs defaultValue="my" className="w-full mb-8" onValueChange={setViewMode}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/80 p-1 rounded-2xl h-12">
                        <TabsTrigger value="my" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Meine Events</TabsTrigger>
                        <TabsTrigger value="public" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm">Öffentlicher Feed</TabsTrigger>
                    </TabsList>

                    {isLoading ? (
                        <div className="py-20 text-center"><LoadingScreen text="Kalender wird geladen..." /></div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-bold text-lg text-foreground ml-1">
                                    {currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    </Button>
                                </div>
                            </div>

                            <div
                                className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 select-none mb-3"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                {filterItems.map(item => {
                                    const isActive = activeFilters[item.key];
                                    const styles = getFilterStyles(item.key, isActive);
                                    return (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => toggleFilter(item.key)}
                                            aria-pressed={isActive}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 border flex-shrink-0 ${styles}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${item.dotColor} ${!isActive ? 'opacity-40' : ''}`} />
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="border border-border rounded-2xl overflow-hidden shadow-sm bg-muted/50 mb-8">
                                <div className="grid grid-cols-7 border-b border-border">
                                    {['S', 'M', 'D', 'M', 'D', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 bg-accent gap-px border-l border-border">
                                    {renderCalendarGrid()}
                                </div>
                            </div>

                            <div>
                                <h3 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                                    Bevorstehende Events
                                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{upcomingEvents.length}</span>
                                </h3>

                                {upcomingEvents.length === 0 ? (
                                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center select-none">
                                        <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-muted-foreground text-sm font-semibold">
                                            {Object.values(activeFilters).some(v => v)
                                                ? "Keine Events in diesem Monat"
                                                : "Keine Events für die ausgewählten Filter"}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map(e => {
                                            const isGroupEvent = !!e.workspaceId;
                                            const badgeType = isGroupEvent ? "group" : e.isPrivate ? "personal" : "public";
                                            const badgeText = isGroupEvent
                                                ? (groupOptions.find(g => `group_${g._id}` === e.workspaceId)?.displayName || "Gruppe")
                                                : e.isPrivate ? "Privat" : "Öffentlich";

                                            return (
                                                <EventCard
                                                    key={e._id}
                                                    title={e.title}
                                                    startTime={e.startTime}
                                                    endTime={e.endTime}
                                                    location={e.location}
                                                    description={e.description}
                                                    badgeText={badgeText}
                                                    badgeType={badgeType}
                                                    onClick={() => openEdit(e)}
                                                    rightAction={
                                                        <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {monthTermine.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold text-lg mb-4 text-foreground flex items-center gap-2">
                                        Semestertermine
                                        <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{monthTermine.length}</span>
                                    </h3>
                                    <div className="space-y-3">
                                        {monthTermine.map((t, i) => {
                                            const start = parseTerminStartDate(t.date);
                                            const end = parseTerminEndDate(t.date);
                                            const startTime = start ? start.getTime() : 0;
                                            const endTime = end && end.getFullYear() !== 9999 ? end.getTime() : startTime;

                                            return (
                                                <EventCard
                                                    key={`termin-list-${i}`}
                                                    title={t.description}
                                                    startTime={startTime}
                                                    endTime={endTime}
                                                    badgeText="Semestertermin"
                                                    badgeType="termin"
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Tabs>
            </div>

            <EventFormModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                mode="create"
                userId={currentUser?._id}
                defaultWorkspaceId={workspaceParam}
                defaultDate={selectedDate}
            />

            <EventFormModal
                isOpen={!!editingEvent}
                onClose={() => setEditingEvent(null)}
                mode="edit"
                event={editingEvent}
                userId={currentUser?._id}
            />

            <Dialog open={!!selectedDayEvents} onOpenChange={(open) => !open && setSelectedDayEvents(null)}>
                <DialogContent className="w-[calc(100vw-24px)] md:max-w-[480px] max-h-[calc(100dvh-24px)] rounded-3xl p-5 md:p-6 flex flex-col gap-4 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-lg font-bold text-foreground leading-tight">
                                Events am Tag
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold text-[#D08945] mt-1 select-none">
                                {selectedDayEvents?.dateLabel}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {selectedDayEvents && selectedDayEvents.events.length === 0 && selectedDayEvents.termine.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-8 text-center select-none">
                            <CalendarIcon className="w-8 h-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground text-xs font-semibold">Keine Events für die ausgewählten Filter</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 py-0.5 space-y-3 min-h-0">
                            {selectedDayEvents?.termine.map((t, idx) => {
                                const start = parseTerminStartDate(t.date);
                                const end = parseTerminEndDate(t.date);
                                const startTime = start ? start.getTime() : 0;
                                const endTime = end && end.getFullYear() !== 9999 ? end.getTime() : startTime;

                                return (
                                    <EventCard
                                        key={`term-${idx}`}
                                        title={t.description}
                                        startTime={startTime}
                                        endTime={endTime}
                                        badgeText="Semestertermin"
                                        badgeType="termin"
                                    />
                                );
                            })}

                            {selectedDayEvents?.events.map((e) => {
                                const isGroupEvent = !!e.workspaceId;
                                const badgeType = isGroupEvent ? "group" : e.isPrivate ? "personal" : "public";
                                const badgeText = isGroupEvent
                                    ? (groupOptions.find(g => `group_${g._id}` === e.workspaceId)?.displayName || "Gruppe")
                                    : e.isPrivate ? "Privat" : "Öffentlich";

                                return (
                                    <EventCard
                                        key={e._id}
                                        title={e.title}
                                        startTime={e.startTime}
                                        endTime={e.endTime}
                                        location={e.location}
                                        description={e.description}
                                        badgeText={badgeText}
                                        badgeType={badgeType}
                                        onClick={() => {
                                            setSelectedDayEvents(null);
                                            openEdit(e);
                                        }}
                                        rightAction={
                                            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}

                    <div className="flex-shrink-0 border-t border-border pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedDayEvents(null)}
                            className="flex-1 rounded-2xl h-12 text-foreground font-bold transition-all active:scale-95 text-sm"
                        >
                            Schließen
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setSelectedDayEvents(null);
                                setIsCreateOpen(true);
                            }}
                            className="flex-1 rounded-2xl h-12 bg-[#D08945] hover:bg-[#b07335] text-white font-extrabold shadow-sm transition-all active:scale-95 text-sm"
                        >
                            Event hinzufügen
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <BottomNavigation />
        </main>
    );
}

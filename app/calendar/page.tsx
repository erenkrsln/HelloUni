"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
import { useQuery, useMutation } from "convex/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EventFormModal } from "@/components/event-form-modal";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
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
    const [viewMode, setViewMode] = useState("my"); // "my" | "public"
    const [currentDate, setCurrentDate] = useState(new Date());

    // Data Loading
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
            return ed.getMonth() === currentDate.getMonth() && ed.getFullYear() === currentDate.getFullYear();
        }).sort((a, b) => a.startTime - b.startTime);
    }, [events, currentDate]);


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
    const toast = useToast();

    // Modal State
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

    // Calendar View Logic

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
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 is Sunday
    // Adjust for Monday start if needed, but standard US/Sunday start is easier for now. 
    // Let's assume standard Sunday start (0) for simplicity or standard grid.

    const renderCalendarGrid = () => {
        const days = [];
        // Empty slots for days before start of month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="min-h-[4rem] bg-gray-50/30 border-b border-r border-gray-100 last:border-r-0" />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            // Check if today
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
                    eventObj: null
                })),
                ...dayEvents.map(e => ({
                    id: e._id,
                    title: e.title || "Event",
                    colorClass: e.workspaceId
                        ? "bg-blue-50 text-blue-700 border border-blue-100/70"
                        : e.isPrivate
                            ? "bg-purple-50 text-purple-700 border border-purple-100/70"
                            : "bg-amber-50 text-amber-700 border border-amber-100/70",
                    isTermin: false,
                    eventObj: e
                }))
            ];

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
                        events: dayEvents,
                        termine: dayTermine
                    });
                } else {
                    setIsCreateOpen(true);
                }
            };

            const visibleItems = combinedItems.slice(0, 2);
            const remainingCount = combinedItems.length - 2;

            days.push(
                <div key={i}
                    className={`min-h-[4.8rem] md:min-h-[6.8rem] bg-white border-b border-r border-gray-100 last:border-r-0 p-1 relative active:bg-gray-50 transition-colors cursor-pointer flex flex-col gap-1 overflow-hidden ${isToday ? 'bg-blue-50/10 font-bold' : ''}`}
                    onClick={handleDayCellClick}
                >
                    <div className="flex justify-between items-center w-full mb-0.5">
                        <div className={`text-[10px] font-semibold w-5 h-5 flex items-center justify-center rounded-full select-none ${isToday ? 'bg-black text-white shadow-sm' : 'text-gray-500'}`}>
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
                                className="text-[9px] font-extrabold text-slate-500 hover:text-slate-700 pl-1 select-none w-full text-left"
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


    return (
        <main className="min-h-screen w-full max-w-md mx-auto md:max-w-3xl pb-32 header-spacing bg-white">
            <Header onMenuClick={() => setIsSidebarOpen(true)} title="Kalender" />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Kalender</h1>
                        <p className="text-sm text-gray-500">Verwalte deinen Zeitplan</p>
                    </div>
                    <Button onClick={() => { setSelectedDate(""); setIsCreateOpen(true); }} size="icon" className="h-10 w-10 bg-black text-white hover:bg-gray-800 rounded-full shadow-lg">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                <Tabs defaultValue="my" className="w-full mb-8" onValueChange={setViewMode}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/80 p-1 rounded-2xl h-12">
                        <TabsTrigger value="my" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Meine Events</TabsTrigger>
                        <TabsTrigger value="public" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Öffentlicher Feed</TabsTrigger>
                    </TabsList>

                    {isLoading ? (
                        <div className="py-20 text-center"><LoadingScreen text="Kalender wird geladen..." /></div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Calendar Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-bold text-lg text-gray-900 ml-1">
                                    {currentDate.toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                                </span>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-gray-100" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                    </Button>
                                </div>
                            </div>
                            {/* Legend */}
                            <div className="flex flex-wrap items-center gap-[17px] text-[11px] leading-normal text-slate-600 text-left pb-[8px] select-none">
                                <span className="flex justify-center items-center gap-[5px]"><span className="w-2.5 h-2.5 rounded-full bg-purple-400" />Privat</span>
                                <span className="flex justify-center items-center gap-[5px]"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" />Gruppe</span>
                                <span className="flex justify-center items-center gap-[5px]"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" />Öffentlich</span>
                                <span className="flex justify-center items-center gap-[5px]"><span className="w-2.5 h-2.5 rounded-full bg-[#F78D57]" />Semestertermin</span>
                            </div>

                            {/* Month Grid */}
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-gray-50/50 mb-8">
                                <div className="grid grid-cols-7 border-b border-gray-200">
                                    {['S', 'M', 'D', 'M', 'D', 'F', 'S'].map((d, i) => (
                                        <div key={i} className="py-2 text-center text-[10px] uppercase tracking-wider font-semibold text-gray-400">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 bg-gray-200 gap-px border-l border-gray-200">
                                    {/* Using gap for borders, parent bg makes lines */}
                                    {renderCalendarGrid()}
                                </div>
                            </div>

                            {/* List View of Events in Month (or selected day - let's keep it simple for now and show upcoming) */}
                            <div>
                                <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                                    Bevorstehende Events
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{upcomingEvents.length}</span>
                                </h3>

                                {upcomingEvents.length === 0 ? (
                                    <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center select-none">
                                        <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm font-semibold">Keine Events in diesem Monat</p>
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
                                                        <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {monthTermine.length > 0 && (
                                <div className="mt-6">
                                    <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center gap-2">
                                        Semestertermine
                                        <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{monthTermine.length}</span>
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
                <DialogContent className="w-[calc(100vw-24px)] md:max-w-[480px] max-h-[80vh] rounded-3xl p-6 flex flex-col gap-4 overflow-hidden border-none shadow-2xl">
                    <DialogHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                        <div className="flex-1">
                            <DialogTitle className="text-lg font-bold text-slate-900 leading-tight">
                                Events am Tag
                            </DialogTitle>
                            <DialogDescription className="text-xs font-semibold text-[#D08945] mt-1 select-none">
                                {selectedDayEvents?.dateLabel}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    {/* Scrollable List */}
                    <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-3 min-h-0">
                        {/* Semester Termine */}
                        {selectedDayEvents?.termine.map((t, idx) => (
                            <div key={`term-${idx}`} className="p-3.5 rounded-2xl border border-[#F78D57]/20 bg-[#F78D57]/5 flex items-start gap-3 shadow-sm select-none">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#F78D57] shrink-0 mt-1" />
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[#b55018] break-words">{t.description}</p>
                                    <p className="text-[11px] font-medium text-slate-500 mt-0.5">Semestertermin · {t.date}</p>
                                </div>
                            </div>
                        ))}

                        {/* Real Events */}
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
                                        <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                    }
                                />
                            );
                        })}
                    </div>

                    {/* Actions Footer */}
                    <div className="flex-shrink-0 border-t border-slate-100 pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedDayEvents(null)}
                            className="flex-1 rounded-2xl h-11 text-slate-700 font-semibold"
                        >
                            Schließen
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                setSelectedDayEvents(null);
                                setIsCreateOpen(true);
                            }}
                            className="flex-1 rounded-2xl h-11 bg-[#D08945] hover:bg-[#b07335] text-white font-bold"
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

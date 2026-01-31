"use client";

import { useState, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { LoadingScreen } from "@/components/ui/spinner";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useQuery, useMutation } from "convex/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Globe, Lock } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Event = {
    _id: Id<"events">;
    title: string;
    description?: string;
    startTime: number;
    endTime: number;
    location?: string;
    createdBy: Id<"users">;
    isPrivate?: boolean;
};

export default function CalendarPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { currentUser, isLoading: isAuthLoading } = useCurrentUser();
    const [viewMode, setViewMode] = useState("my"); // "my" | "public"

    // Data Loading
    const myEvents = useQuery(
        api.events.listByUser,
        currentUser ? { userId: currentUser._id } : "skip"
    );
    const publicEvents = useQuery(api.events.listPublic, {});

    const events = viewMode === "my" ? (currentUser ? myEvents : []) : publicEvents;

    const isLoading = viewMode === "my"
        ? isAuthLoading || (!!currentUser && myEvents === undefined)
        : publicEvents === undefined;

    // Mutators
    const createEvent = useMutation(api.events.create);
    const updateEvent = useMutation(api.events.update);
    const removeEvent = useMutation(api.events.remove);

    // Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        isPrivate: true,
    });

    const resetForm = () => {
        setFormData({
            title: "",
            date: new Date().toISOString().split("T")[0],
            startTime: "09:00",
            endTime: "10:00",
            location: "",
            isPrivate: true,
        });
    };

    const handleCreate = async () => {
        if (!currentUser) {
            alert("You must be logged in to create an event.");
            return;
        }
        const start = new Date(`${formData.date}T${formData.startTime}`).getTime();
        const end = new Date(`${formData.date}T${formData.endTime}`).getTime();

        await createEvent({
            title: formData.title,
            startTime: start,
            endTime: end,
            location: formData.location,
            userId: currentUser._id,
            isPrivate: formData.isPrivate,
        });
        setIsCreateOpen(false);
        resetForm();
    };

    const handleUpdate = async () => {
        if (!editingEvent || !currentUser) {
            alert("You must be logged in to edit an event.");
            return;
        }
        const start = new Date(`${formData.date}T${formData.startTime}`).getTime();
        const end = new Date(`${formData.date}T${formData.endTime}`).getTime();

        await updateEvent({
            eventId: editingEvent._id,
            userId: currentUser._id,
            title: formData.title,
            startTime: start,
            endTime: end,
            location: formData.location,
            isPrivate: formData.isPrivate,
        });
        setEditingEvent(null);
        resetForm();
    };

    const handleDelete = async () => {
        if (!editingEvent || !currentUser) {
            alert("You must be logged in to delete an event.");
            return;
        }
        if (confirm("Are you sure you want to delete this event?")) {
            await removeEvent({
                eventId: editingEvent._id,
                userId: currentUser._id,
            });
            setEditingEvent(null);
        }
    };

    const openEdit = (e: Event) => {
        const d = new Date(e.startTime);
        const endD = new Date(e.endTime);
        const dateStr = d.toISOString().split("T")[0];
        const timeStr = d.toTimeString().slice(0, 5);
        const endTimeStr = endD.toTimeString().slice(0, 5);

        setFormData({
            title: e.title,
            date: dateStr,
            startTime: timeStr,
            endTime: endTimeStr,
            location: e.location || "",
            isPrivate: e.isPrivate ?? true,
        });
        setEditingEvent(e);
    };

    // Calendar View Logic
    const [currentDate, setCurrentDate] = useState(new Date());

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

            days.push(
                <div key={i}
                    className={`min-h-[4rem] bg-white border-b border-r border-gray-100 last:border-r-0 p-1 relative active:bg-gray-50 transition-colors cursor-pointer flex flex-col gap-1 ${isToday ? 'bg-blue-50/10' : ''}`}
                    onClick={() => {
                        setFormData(prev => ({ ...prev, date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` }));
                        setIsCreateOpen(true);
                    }}
                >
                    <div className={`text-[10px] font-medium w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'bg-black text-white' : 'text-gray-500'}`}>
                        {i}
                    </div>

                    <div className="flex flex-col gap-1 w-full">
                        {dayEvents.slice(0, 3).map(e => (
                            <div key={e._id}
                                className="h-1.5 w-full rounded-full bg-amber-200"
                                title={e.title}
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    openEdit(e);
                                }}
                            />
                        ))}
                        {dayEvents.length > 3 && (
                            <div className="h-1.5 w-1.5 rounded-full bg-gray-300 self-center" />
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };


    return (
        <main className="min-h-screen w-full max-w-md mx-auto pb-32 bg-white">
            <Header onMenuClick={() => setIsSidebarOpen(true)} title="Calendar" />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="px-4 py-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
                        <p className="text-sm text-gray-500">Manage your schedule</p>
                    </div>
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} size="icon" className="h-10 w-10 bg-black text-white hover:bg-gray-800 rounded-full shadow-lg">
                        <Plus className="w-5 h-5" />
                    </Button>
                </div>

                <Tabs defaultValue="my" className="w-full mb-8" onValueChange={setViewMode}>
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/80 p-1 rounded-2xl h-12">
                        <TabsTrigger value="my" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">My Events</TabsTrigger>
                        <TabsTrigger value="public" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Public Feed</TabsTrigger>
                    </TabsList>

                    {isLoading ? (
                        <div className="py-20 text-center"><LoadingScreen text="Loading calendar..." /></div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Calendar Navigation */}
                            <div className="flex items-center justify-between mb-4">
                                <span className="font-bold text-lg text-gray-900 ml-1">
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
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

                            {/* Month Grid */}
                            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-gray-50/50 mb-8">
                                <div className="grid grid-cols-7 border-b border-gray-200">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
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
                                    Upcoming Events
                                    <span className="text-xs font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{events?.length || 0}</span>
                                </h3>

                                {events && events.length === 0 ? (
                                    <div className="border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
                                        <CalendarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-gray-400 text-sm font-medium">No events scheduled</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {events && events.map(e => (
                                            <div key={e._id} onClick={() => openEdit(e)} className="group p-4 rounded-2xl border border-gray-100 bg-white hover:border-gray-200 transition-all cursor-pointer flex gap-4 items-start shadow-sm hover:shadow-md">
                                                <div className="flex flex-col items-center justify-center bg-gray-50 rounded-xl w-14 h-14 shrink-0 border border-gray-100 group-hover:bg-black group-hover:text-white transition-colors">
                                                    <span className="text-xs font-bold uppercase">{new Date(e.startTime).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-xl font-bold leading-none">{new Date(e.startTime).getDate()}</span>
                                                </div>

                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <div className="flex justify-between items-start mb-0.5">
                                                        <h4 className="font-semibold text-base text-gray-900 truncate pr-2">{e.title}</h4>
                                                        {e.isPrivate && <span className="shrink-0 text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">Private</span>}
                                                    </div>

                                                    <div className="flex items-center text-xs text-gray-500 gap-3 mb-1.5">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                            {new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            {' - '}
                                                            {new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </div>

                                                    {e.location && (
                                                        <div className="flex items-center text-xs text-gray-500 gap-1.5">
                                                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                            <span className="truncate">{e.location}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2">
                                                    <ChevronRight className="w-5 h-5 text-gray-300" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Tabs>
            </div>

            {/* Create Modal - Fullscreen Design */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent 
                    hideCloseButton
                    withoutEnterAnimation
                    withoutExitAnimation
                    className="fixed inset-0 translate-x-0 translate-y-0 w-full min-h-[100dvh] max-w-none max-h-none rounded-none p-0 border-0 flex flex-col bg-white z-[100] animate-in slide-in-from-bottom duration-300 overscroll-none"
                >
                    <DialogTitle className="sr-only">Neues Event erstellen</DialogTitle>
                    {/* Header - mit Safe Area für iOS Notch */}
                    <div 
                        className="px-5 h-14 flex items-center justify-between border-b border-gray-100 shrink-0"
                        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                    >
                        <button 
                            type="button"
                            onClick={() => setIsCreateOpen(false)}
                            className="text-base font-medium text-gray-900 active:opacity-50 transition-opacity touch-manipulation"
                        >
                            Abbrechen
                        </button>
                        <button 
                            type="button"
                            onClick={handleCreate}
                            disabled={!formData.title.trim()}
                            className="text-base font-medium text-[#D08945] active:opacity-50 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                        >
                            Erstellen
                        </button>
                    </div>

                    {/* Content - mit Safe Area für iOS Home Indicator */}
                    <div 
                        className="flex-1 overflow-y-auto px-6 pt-6 overscroll-contain"
                        style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
                    >
                        {/* Title Input - wie bei /create */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                            <div className="border border-gray-300 rounded-lg">
                                <input
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Event Titel"
                                    className="w-full px-4 py-3 bg-transparent text-base placeholder-gray-400 focus:outline-none focus:ring-0 border-none"
                                />
                            </div>
                        </div>

                        {/* Options - alle untereinander */}
                        <div className="space-y-4">
                            {/* Datum */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                                <div className="border border-gray-300 rounded-lg">
                                    <input 
                                        type="date" 
                                        value={formData.date} 
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                    />
                                </div>
                            </div>

                            {/* Ort */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Ort (optional)</label>
                                <div className="border border-gray-300 rounded-lg">
                                    <input 
                                        value={formData.location} 
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="z.B. Raum 101"
                                        className="w-full px-4 py-3 bg-transparent text-base text-gray-900 placeholder-gray-400 border-0 outline-none focus:ring-0"
                                    />
                                </div>
                            </div>

                            {/* Zeitraum */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 border border-gray-300 rounded-lg">
                                        <input 
                                            type="time" 
                                            value={formData.startTime} 
                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                        />
                                    </div>
                                    <span className="text-gray-400">bis</span>
                                    <div className="flex-1 border border-gray-300 rounded-lg">
                                        <input 
                                            type="time" 
                                            value={formData.endTime} 
                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                            className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Privacy Toggle */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Sichtbarkeit</label>
                                <div className="border border-gray-300 rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.isPrivate ? 'bg-gray-900' : 'bg-emerald-500'}`}>
                                                {formData.isPrivate ? (
                                                    <Lock className="w-5 h-5 text-white" />
                                                ) : (
                                                    <Globe className="w-5 h-5 text-white" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900">
                                                    {formData.isPrivate ? 'Privat' : 'Öffentlich'}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                    {formData.isPrivate ? 'Nur du kannst es sehen' : 'Sichtbar für alle'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                                            className={`relative w-14 h-8 rounded-full transition-colors touch-manipulation ${formData.isPrivate ? 'bg-gray-900' : 'bg-emerald-500'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${formData.isPrivate ? 'left-1' : 'left-7'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal - Fullscreen Design */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent 
                    hideCloseButton
                    withoutEnterAnimation
                    withoutExitAnimation
                    className="fixed inset-0 translate-x-0 translate-y-0 w-full min-h-[100dvh] max-w-none max-h-none rounded-none p-0 border-0 flex flex-col bg-white z-[100] animate-in slide-in-from-bottom duration-300 overscroll-none"
                >
                    <DialogTitle className="sr-only">Event bearbeiten</DialogTitle>
                    {editingEvent && (
                        <>
                            {/* Header - mit Safe Area für iOS Notch */}
                            <div 
                                className="px-5 h-14 flex items-center justify-between border-b border-gray-100 shrink-0"
                                style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
                            >
                                <button 
                                    type="button"
                                    onClick={() => setEditingEvent(null)}
                                    className="text-base font-medium text-gray-900 active:opacity-50 transition-opacity touch-manipulation"
                                >
                                    Abbrechen
                                </button>
                                {currentUser && editingEvent.createdBy === currentUser._id && (
                                    <button 
                                        type="button"
                                        onClick={handleUpdate}
                                        disabled={!formData.title.trim()}
                                        className="text-base font-medium text-[#D08945] active:opacity-50 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                                    >
                                        Speichern
                                    </button>
                                )}
                            </div>

                            {/* Content - mit Safe Area für iOS Home Indicator */}
                            <div 
                                className="flex-1 overflow-y-auto px-6 pt-6 overscroll-contain"
                                style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))' }}
                            >
                                {currentUser && editingEvent.createdBy === currentUser._id ? (
                                    /* Edit Mode */
                                    <>
                                        {/* Title Input - wie bei /create */}
                                        <div className="mb-6">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                                            <div className="border border-gray-300 rounded-lg">
                                                <input
                                                    value={formData.title}
                                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                                    placeholder="Event Titel"
                                                    className="w-full px-4 py-3 bg-transparent text-base placeholder-gray-400 focus:outline-none focus:ring-0 border-none"
                                                />
                                            </div>
                                        </div>

                                        {/* Options - alle untereinander */}
                                        <div className="space-y-4">
                                            {/* Datum */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Datum</label>
                                                <div className="border border-gray-300 rounded-lg">
                                                    <input 
                                                        type="date" 
                                                        value={formData.date} 
                                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                        className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Ort */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Ort (optional)</label>
                                                <div className="border border-gray-300 rounded-lg">
                                                    <input 
                                                        value={formData.location} 
                                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                                        placeholder="z.B. Raum 101"
                                                        className="w-full px-4 py-3 bg-transparent text-base text-gray-900 placeholder-gray-400 border-0 outline-none focus:ring-0"
                                                    />
                                                </div>
                                            </div>

                                            {/* Zeitraum */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Uhrzeit</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex-1 border border-gray-300 rounded-lg">
                                                        <input 
                                                            type="time" 
                                                            value={formData.startTime} 
                                                            onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                                            className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                    <span className="text-gray-400">bis</span>
                                                    <div className="flex-1 border border-gray-300 rounded-lg">
                                                        <input 
                                                            type="time" 
                                                            value={formData.endTime} 
                                                            onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                                            className="w-full px-4 py-3 bg-transparent text-base text-gray-900 border-0 outline-none focus:ring-0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Privacy Toggle */}
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">Sichtbarkeit</label>
                                                <div className="border border-gray-300 rounded-lg p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${formData.isPrivate ? 'bg-gray-900' : 'bg-emerald-500'}`}>
                                                                {formData.isPrivate ? (
                                                                    <Lock className="w-5 h-5 text-white" />
                                                                ) : (
                                                                    <Globe className="w-5 h-5 text-white" />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">
                                                                    {formData.isPrivate ? 'Privat' : 'Öffentlich'}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    {formData.isPrivate ? 'Nur du kannst es sehen' : 'Sichtbar für alle'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, isPrivate: !formData.isPrivate })}
                                                            className={`relative w-14 h-8 rounded-full transition-colors touch-manipulation ${formData.isPrivate ? 'bg-gray-900' : 'bg-emerald-500'}`}
                                                        >
                                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${formData.isPrivate ? 'left-1' : 'left-7'}`} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                type="button"
                                                onClick={handleDelete}
                                                className="w-full py-4 text-base font-medium text-red-500 active:bg-red-50 rounded-lg border border-red-200 transition-colors touch-manipulation"
                                            >
                                                Event löschen
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    /* Read-Only Mode */
                                    <div className="space-y-4">
                                        {/* Event Info Cards */}
                                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                                        <CalendarIcon className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Datum</p>
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {new Date(editingEvent.startTime).toLocaleDateString('de-DE', { 
                                                                weekday: 'long', 
                                                                day: 'numeric', 
                                                                month: 'long', 
                                                                year: 'numeric' 
                                                            })}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="h-px bg-gray-100" />

                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                                                        <Clock className="w-6 h-6 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Uhrzeit</p>
                                                        <p className="text-lg font-semibold text-gray-900">
                                                            {new Date(editingEvent.startTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                            {' - '}
                                                            {new Date(editingEvent.endTime).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>

                                                {editingEvent.location && (
                                                    <>
                                                        <div className="h-px bg-gray-100" />
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                                                <MapPin className="w-6 h-6 text-emerald-600" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ort</p>
                                                                <p className="text-lg font-semibold text-gray-900">{editingEvent.location}</p>
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        {/* Read-only Notice */}
                                        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                <Lock className="w-4 h-4 text-amber-600" />
                                            </div>
                                            <p className="text-sm text-amber-800">
                                                Dieses Event wurde von jemand anderem erstellt. Du kannst es nur ansehen.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNavigation />
        </main>
    );
}

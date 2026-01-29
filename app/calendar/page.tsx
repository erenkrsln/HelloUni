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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Clock, Calendar as CalendarIcon, Trash2, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
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
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
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

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl w-[90vw] max-w-md">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle>New Event</DialogTitle>
                        <DialogDescription>Add a new event to your calendar.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Event Title" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Date</Label>
                                <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Private?</Label>
                                <div className="flex items-center h-10">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 accent-black"
                                        checked={formData.isPrivate}
                                        onChange={e => setFormData({ ...formData, isPrivate: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm text-gray-600">Only me</span>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Start</Label>
                                <Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>End</Label>
                                <Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Location (Optional)</Label>
                            <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Room 101" />
                        </div>
                    </div>
                    <div className="p-4 border-t bg-white mt-auto">
                        <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleCreate}>Create Event</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent className="max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl w-[90vw] max-w-md">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle>Event Details</DialogTitle>
                    </DialogHeader>
                    {editingEvent && (
                        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                            {/* Check ownership */}
                            {currentUser && editingEvent.createdBy === currentUser._id ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Date</Label>
                                            <Input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Private?</Label>
                                            <div className="flex items-center h-10">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 accent-black"
                                                    checked={formData.isPrivate}
                                                    onChange={e => setFormData({ ...formData, isPrivate: e.target.checked })}
                                                />
                                                <span className="ml-2 text-sm text-gray-600">Only me</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Start</Label>
                                            <Input type="time" value={formData.startTime} onChange={e => setFormData({ ...formData, startTime: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>End</Label>
                                            <Input type="time" value={formData.endTime} onChange={e => setFormData({ ...formData, endTime: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Location</Label>
                                        <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold">{editingEvent.title}</h3>
                                    <div className="flex gap-2 text-sm text-gray-600">
                                        <CalendarIcon className="w-4 h-4" />
                                        {new Date(editingEvent.startTime).toLocaleDateString()}
                                    </div>
                                    <div className="flex gap-2 text-sm text-gray-600">
                                        <Clock className="w-4 h-4" />
                                        {new Date(editingEvent.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(editingEvent.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    {editingEvent.location && (
                                        <div className="flex gap-2 text-sm text-gray-600">
                                            <MapPin className="w-4 h-4" />
                                            {editingEvent.location}
                                        </div>
                                    )}
                                    <div className="pt-4 text-xs text-gray-400">
                                        Read-only (You are not the owner)
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {/* Footer for actions */}
                    {editingEvent && currentUser && editingEvent.createdBy === currentUser._id && (
                        <div className="p-4 border-t bg-white mt-auto flex gap-2">
                            <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleUpdate}>Save Changes</Button>
                            <Button variant="destructive" onClick={handleDelete} className="px-3"><Trash2 className="w-4 h-4" /></Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <BottomNavigation />
        </main>
    );
}

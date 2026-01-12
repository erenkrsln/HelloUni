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
import { Plus, MapPin, Clock, Calendar as CalendarIcon, Trash2, Edit2 } from "lucide-react";
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
    const { currentUser } = useCurrentUser();
    const [viewMode, setViewMode] = useState("my"); // "my" | "public"

    // Data Loading
    const myEvents = useQuery(
        api.events.listByUser,
        currentUser ? { userId: currentUser._id } : "skip"
    );
    const publicEvents = useQuery(api.events.listPublic, {});

    const events = viewMode === "my" ? myEvents : publicEvents;
    const isLoading = events === undefined;

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
        if (!currentUser) return;
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
        if (!editingEvent || !currentUser) return;
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
        if (!editingEvent || !currentUser) return;
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
            days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50/50 border-[0.5px] border-gray-100" />);
        }

        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD local (careful with UTC, but this simple app uses local inputs)
            // Wait, toISOString is UTC. We need local matching.
            // Better to construct comparison carefully.

            // Just matching day/month/year for simplicity
            const dayEvents = events?.filter(e => {
                const ed = new Date(e.startTime);
                return ed.getDate() === i && ed.getMonth() === currentDate.getMonth() && ed.getFullYear() === currentDate.getFullYear();
            }) || [];

            days.push(
                <div key={i} className="h-24 bg-white border-[0.5px] border-gray-100 p-1 overflow-hidden relative" onClick={() => {
                    // Optional: click day to add event
                    setFormData(prev => ({ ...prev, date: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}` }));
                    setIsCreateOpen(true);
                }}>
                    <div className="text-xs font-semibold mb-1 text-gray-500">{i}</div>
                    <div className="flex flex-col gap-1">
                        {dayEvents.slice(0, 3).map(e => (
                            <div key={e._id}
                                className="text-[10px] bg-[#dcc6a1] text-black px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80"
                                onClick={(ev) => {
                                    ev.stopPropagation();
                                    openEdit(e);
                                }}
                            >
                                {e.title}
                            </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[9px] text-gray-400">+{dayEvents.length - 3} more</div>}
                    </div>
                </div>
            );
        }
        return days;
    };


    return (
        <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 overflow-x-hidden bg-white">
            <Header onMenuClick={() => setIsSidebarOpen(true)} />
            <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-2xl font-bold">Calendar</h1>
                    <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="bg-black text-white hover:bg-gray-800 rounded-xl">
                        <Plus className="w-4 h-4 mr-1" /> New
                    </Button>
                </div>

                <Tabs defaultValue="my" className="w-full mb-6" onValueChange={setViewMode}>
                    <TabsList className="mb-4">
                        <TabsTrigger value="my">My Events</TabsTrigger>
                        <TabsTrigger value="public">Public Feed</TabsTrigger>
                    </TabsList>

                    {isLoading ? (
                        <div className="py-10 text-center"><LoadingScreen text="Loading..." /></div>
                    ) : (
                        <>
                            {/* Grid View Title and Navigation (Simple) */}
                            <div className="flex items-center justify-between mb-2 px-2">
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&lt;</button>
                                <span className="font-semibold text-lg">
                                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                </span>
                                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&gt;</button>
                            </div>

                            {/* Month Grid */}
                            <div className="grid grid-cols-7 mb-6 border rounded-xl overflow-hidden shadow-sm">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                                    <div key={d} className="h-8 flex items-center justify-center text-xs font-bold bg-gray-50 border-b border-gray-100">{d}</div>
                                ))}
                                {renderCalendarGrid()}
                            </div>

                            {/* List View */}
                            <div className="mt-6">
                                <h3 className="font-semibold mb-3 text-lg">Upcoming</h3>
                                {events && events.length === 0 ? (
                                    <p className="text-gray-400 text-sm">No events found.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {events && events.map(e => (
                                            <div key={e._id} onClick={() => openEdit(e)} className="p-4 rounded-xl border border-gray-100 shadow-sm bg-white active:scale-[0.99] transition-transform cursor-pointer flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-base">{e.title}</h4>
                                                    {e.isPrivate && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">Private</span>}
                                                </div>
                                                <div className="flex items-center text-xs text-gray-500 gap-3">
                                                    <div className="flex items-center gap-1">
                                                        <CalendarIcon className="w-3 h-3" />
                                                        {new Date(e.startTime).toLocaleDateString()}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        -
                                                        {new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                                {e.location && (
                                                    <div className="flex items-center text-xs text-gray-500 gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {e.location}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </Tabs>
            </div>

            {/* Create Modal */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>New Event</DialogTitle>
                        <DialogDescription>Add a new event to your calendar.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="Event Title" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-2 gap-4">
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
                        <Button className="w-full bg-black text-white hover:bg-gray-800" onClick={handleCreate}>Create Event</Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Modal */}
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Event Details</DialogTitle>
                    </DialogHeader>
                    {editingEvent && (
                        <div className="space-y-4 py-2">
                            {/* Check ownership */}
                            {currentUser && editingEvent.createdBy === currentUser._id ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Title</Label>
                                        <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
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
                                    <div className="grid grid-cols-2 gap-4">
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
                                    <div className="flex gap-2 pt-2">
                                        <Button className="flex-1 bg-black text-white hover:bg-gray-800" onClick={handleUpdate}>Save Changes</Button>
                                        <Button variant="destructive" onClick={handleDelete} className="px-3"><Trash2 className="w-4 h-4" /></Button>
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
                </DialogContent>
            </Dialog>

            <BottomNavigation />
        </main>
    );
}

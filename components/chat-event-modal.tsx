"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, Trash2, CalendarHeart } from "lucide-react";

interface ChatEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    senderId: Id<"users">;
}

function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function defaultTimeString(offsetHours = 1) {
    const d = new Date();
    d.setHours(d.getHours() + offsetHours, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function toTimestamp(dateStr: string, timeStr: string): number | undefined {
    if (!dateStr || !timeStr) return undefined;
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute, 0, 0);
    return isNaN(d.getTime()) ? undefined : d.getTime();
}

type TimeSlotState = {
    date: string;
    startTime: string;
    endTime: string;
};

export function ChatEventModal({ isOpen, onClose, conversationId, senderId }: ChatEventModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    
    const [timeSlots, setTimeSlots] = useState<TimeSlotState[]>([
        { date: todayString(), startTime: defaultTimeString(1), endTime: defaultTimeString(2) },
        { date: todayString(), startTime: defaultTimeString(3), endTime: defaultTimeString(4) },
    ]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const createChatEvent = useMutation(api.chatEvents.createChatEvent);

    const addTimeSlot = () => {
        if (timeSlots.length < 4) {
            setTimeSlots([...timeSlots, { date: todayString(), startTime: defaultTimeString(1), endTime: defaultTimeString(2) }]);
        }
    };

    const removeTimeSlot = (index: number) => {
        if (timeSlots.length <= 2) return;
        setTimeSlots(timeSlots.filter((_, i) => i !== index));
    };

    const updateTimeSlot = (index: number, field: keyof TimeSlotState, value: string) => {
        const newSlots = [...timeSlots];
        newSlots[index][field] = value;
        setTimeSlots(newSlots);
    };

    // Validation
    const parsedSlots = timeSlots.map(slot => ({
        startTime: toTimestamp(slot.date, slot.startTime) || 0,
        endTime: toTimestamp(slot.date, slot.endTime) || 0,
    }));

    const slotsValid = parsedSlots.every(slot => slot.startTime > 0 && slot.endTime > slot.startTime);
    const canSubmit = title.trim() !== "" && timeSlots.length >= 2 && slotsValid && !isSubmitting;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setIsSubmitting(true);
        try {
            await createChatEvent({
                conversationId,
                creatorId: senderId,
                title: title.trim(),
                description: description.trim() || undefined,
                timeSlots: parsedSlots,
            });
            handleClose();
        } catch (error) {
            console.error("Failed to crate event invite:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setTitle("");
        setDescription("");
        setTimeSlots([
            { date: todayString(), startTime: defaultTimeString(1), endTime: defaultTimeString(2) },
            { date: todayString(), startTime: defaultTimeString(3), endTime: defaultTimeString(4) },
        ]);
        onClose();
    };

    if (!isOpen) return null;

    const inputClass = "bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors w-full";

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[90] w-full max-w-[428px] bg-white rounded-t-3xl shadow-2xl"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
                {/* Handle bar */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-gray-100">
                    <button onClick={handleClose} className="text-[#D08945] text-sm font-medium">
                        Abbrechen
                    </button>
                    <div className="flex items-center gap-2">
                        <CalendarHeart size={18} className="text-[#D08945]" />
                        <h2 className="font-semibold text-base text-gray-900">Termin finden</h2>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!canSubmit}
                        className={`text-sm font-semibold transition-colors ${canSubmit ? "text-[#D08945]" : "text-gray-300"}`}
                    >
                        {isSubmitting ? "Senden..." : "Senden"}
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto max-h-[70vh] px-5 py-4 space-y-5">

                    {/* Title */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Was ist geplant?</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="z.B. Team Dinner, Kino..."
                            maxLength={100}
                            className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#D08945]/30 focus:border-[#D08945] transition-all"
                        />
                    </div>
                    
                    {/* Description */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Treffpunkt, Infos..."
                            rows={2}
                            maxLength={300}
                            className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#D08945]/30 focus:border-[#D08945] resize-none transition-all"
                        />
                    </div>

                    {/* Time Slots */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Terminvorschläge
                        </label>
                        <div className="mt-2 space-y-3">
                            {timeSlots.map((slot, index) => {
                                const isValid = parsedSlots[index].endTime > parsedSlots[index].startTime || parsedSlots[index].startTime === 0;
                                return (
                                <div key={index} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 transition-all focus-within:ring-2 focus-within:ring-[#D08945]/30 focus-within:border-[#D08945]">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-xs font-bold text-[#D08945]">Vorschlag {index + 1}</span>
                                        {timeSlots.length > 2 && (
                                            <button
                                                onClick={() => removeTimeSlot(index)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Datum</p>
                                            <input
                                                type="date"
                                                value={slot.date}
                                                min={todayString()}
                                                onChange={(e) => updateTimeSlot(index, "date", e.target.value)}
                                                className={inputClass}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 mb-1">Start</p>
                                                <input
                                                    type="time"
                                                    value={slot.startTime}
                                                    onChange={(e) => updateTimeSlot(index, "startTime", e.target.value)}
                                                    className={inputClass}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs text-gray-500 mb-1">Ende</p>
                                                <input
                                                    type="time"
                                                    value={slot.endTime}
                                                    onChange={(e) => updateTimeSlot(index, "endTime", e.target.value)}
                                                    className={`${inputClass} ${!isValid && slot.endTime ? "border-red-300 focus:ring-red-500" : ""}`}
                                                />
                                            </div>
                                        </div>
                                        {!isValid && slot.endTime && (
                                           <p className="text-xs text-red-500">Das Ende muss nach dem Start liegen.</p>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                        {timeSlots.length < 4 && (
                            <button
                                onClick={addTimeSlot}
                                className="mt-3 flex items-center gap-2 text-[#D08945] text-sm font-medium hover:opacity-80 transition-opacity"
                            >
                                <div className="w-7 h-7 rounded-full border-2 border-[#D08945] flex items-center justify-center">
                                    <Plus size={14} />
                                </div>
                                Weiteren Vorschlag hinzufügen
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

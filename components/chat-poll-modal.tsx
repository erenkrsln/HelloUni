"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, Trash2, BarChart2 } from "lucide-react";

interface ChatPollModalProps {
    isOpen: boolean;
    onClose: () => void;
    conversationId: Id<"conversations">;
    senderId: Id<"users">;
}

/** Returns today's date as YYYY-MM-DD in local time */
function todayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Default time: current hour + 1, rounded to :00 */
function defaultTimeString() {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return `${String(d.getHours()).padStart(2, "0")}:00`;
}

/** Combine a YYYY-MM-DD date string and HH:MM time string into a timestamp */
function toTimestamp(dateStr: string, timeStr: string): number | undefined {
    if (!dateStr || !timeStr) return undefined;
    const [year, month, day] = dateStr.split("-").map(Number);
    const [hour, minute] = timeStr.split(":").map(Number);
    const d = new Date(year, month - 1, day, hour, minute, 0, 0);
    return isNaN(d.getTime()) ? undefined : d.getTime();
}

export function ChatPollModal({ isOpen, onClose, conversationId, senderId }: ChatPollModalProps) {
    const [question, setQuestion] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [enableCloseAt, setEnableCloseAt] = useState(false);
    const [closeDate, setCloseDate] = useState(todayString());
    const [closeTime, setCloseTime] = useState(defaultTimeString());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendChatPoll = useMutation(api.mutations.sendChatPoll);

    const addOption = () => {
        if (options.length < 10) setOptions([...options, ""]);
    };

    const removeOption = (index: number) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const closeAtTimestamp = enableCloseAt ? toTimestamp(closeDate, closeTime) : undefined;
    const closeAtIsValid = !enableCloseAt || (!!closeAtTimestamp && closeAtTimestamp > Date.now());

    const handleSubmit = async () => {
        const trimmedQuestion = question.trim();
        const trimmedOptions = options.map(o => o.trim()).filter(o => o !== "");
        if (!trimmedQuestion || trimmedOptions.length < 2 || !closeAtIsValid) return;

        setIsSubmitting(true);
        try {
            await sendChatPoll({
                conversationId,
                senderId,
                question: trimmedQuestion,
                options: trimmedOptions,
                allowMultiple,
                closeAt: closeAtTimestamp,
            });
            handleClose();
        } catch (error) {
            console.error("Failed to send poll:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setQuestion("");
        setOptions(["", ""]);
        setAllowMultiple(false);
        setEnableCloseAt(false);
        setCloseDate(todayString());
        setCloseTime(defaultTimeString());
        onClose();
    };

    const validOptions = options.map(o => o.trim()).filter(o => o !== "");
    const canSubmit = question.trim() !== "" && validOptions.length >= 2 && closeAtIsValid && !isSubmitting;

    if (!isOpen) return null;

    const inputClass = "bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#D08945] focus:border-transparent transition-colors cursor-pointer w-full";

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
                        <BarChart2 size={18} className="text-[#D08945]" />
                        <h2 className="font-semibold text-base text-gray-900">Umfrage erstellen</h2>
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

                    {/* Question */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Frage</label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="Stell deine Frage..."
                            rows={2}
                            maxLength={200}
                            className="mt-2 w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-[#D08945]/30 focus:border-[#D08945] resize-none transition-all"
                        />
                    </div>

                    {/* Options */}
                    <div>
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Antwortmöglichkeiten
                        </label>
                        <div className="mt-2 space-y-2">
                            {options.map((option, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-[#D08945]/30 focus-within:border-[#D08945] transition-all">
                                        <span className="text-xs font-bold text-[#D08945] w-4 flex-shrink-0">{index + 1}</span>
                                        <input
                                            type="text"
                                            value={option}
                                            onChange={(e) => updateOption(index, e.target.value)}
                                            placeholder={`Option ${index + 1}`}
                                            maxLength={100}
                                            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
                                        />
                                    </div>
                                    {options.length > 2 && (
                                        <button
                                            onClick={() => removeOption(index)}
                                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        {options.length < 10 && (
                            <button
                                onClick={addOption}
                                className="mt-3 flex items-center gap-2 text-[#D08945] text-sm font-medium hover:opacity-80 transition-opacity"
                            >
                                <div className="w-7 h-7 rounded-full border-2 border-[#D08945] flex items-center justify-center">
                                    <Plus size={14} />
                                </div>
                                Option hinzufügen
                            </button>
                        )}
                    </div>

                    {/* Settings */}
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Einstellungen</label>

                        {/* Multiple answers toggle */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                            <div>
                                <p className="text-sm font-medium text-gray-900">Mehrere Antworten</p>
                                <p className="text-xs text-gray-500 mt-0.5">Teilnehmer können mehrere Optionen wählen</p>
                            </div>
                            <button
                                onClick={() => setAllowMultiple(!allowMultiple)}
                                className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${allowMultiple ? "bg-[#D08945]" : "bg-gray-300"}`}
                            >
                                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${allowMultiple ? "translate-x-5" : "translate-x-0"}`} />
                            </button>
                        </div>

                        {/* Auto-close toggle + date/time picker */}
                        <div className="bg-gray-50 rounded-2xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div>
                                    <p className="text-sm font-medium text-gray-900">Automatisch schließen</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Enddatum und -uhrzeit festlegen</p>
                                </div>
                                <button
                                    onClick={() => setEnableCloseAt(!enableCloseAt)}
                                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${enableCloseAt ? "bg-[#D08945]" : "bg-gray-300"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${enableCloseAt ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                            </div>

                            {enableCloseAt && (
                                <div className="border-t border-gray-200 px-4 py-3 space-y-3">
                                    {/* Date */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1.5">Datum</p>
                                        <input
                                            type="date"
                                            value={closeDate}
                                            min={todayString()}
                                            onChange={(e) => setCloseDate(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    {/* Time */}
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1.5">Uhrzeit</p>
                                        <input
                                            type="time"
                                            value={closeTime}
                                            onChange={(e) => setCloseTime(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>
                                    {/* Validation hint */}
                                    {closeAtTimestamp && closeAtTimestamp <= Date.now() && (
                                        <p className="text-xs text-red-500">
                                            Bitte wähle einen Zeitpunkt in der Zukunft.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

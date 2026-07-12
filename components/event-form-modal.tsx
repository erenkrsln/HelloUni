"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import { Lock, Globe, Calendar as CalendarIcon, Clock, MapPin } from "lucide-react";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  event?: any; // Doc<"events"> or enriched event
  userId?: Id<"users">;
  defaultWorkspaceId?: string;
  defaultDate?: string;
}

export function EventFormModal({
  isOpen,
  onClose,
  mode,
  event,
  userId,
  defaultWorkspaceId = "",
  defaultDate = "",
}: EventFormModalProps) {
  const router = useRouter();
  const toast = useToast();
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);
  const removeEvent = useMutation(api.events.remove);

  // Group options query
  const myConversations = useQuery(
    api.queries.getConversations,
    userId ? { userId } : "skip"
  );
  const groupOptions = useMemo(
    () => (myConversations || []).filter((conv) => (conv as any).isGroup),
    [myConversations]
  );

  // Initial form values
  const initialDate = useMemo(() => {
    if (mode === "edit" && event?.startTime) {
      // Local time date string
      const d = new Date(event.startTime);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
    return defaultDate || new Date().toISOString().split("T")[0];
  }, [mode, event, defaultDate]);

  const initialStartTime = useMemo(() => {
    if (mode === "edit" && event?.startTime) {
      const d = new Date(event.startTime);
      return d.toTimeString().slice(0, 5);
    }
    return "09:00";
  }, [mode, event]);

  const initialEndTime = useMemo(() => {
    if (mode === "edit" && event?.endTime) {
      const d = new Date(event.endTime);
      return d.toTimeString().slice(0, 5);
    }
    return "10:00";
  }, [mode, event]);

  const initialEventType = useMemo(() => {
    if (mode === "edit" && event) {
      return event.workspaceId ? "group" : event.isPrivate ? "private" : "public";
    }
    return defaultWorkspaceId.startsWith("group_") ? "group" : "private";
  }, [mode, event, defaultWorkspaceId]);

  const initialWorkspaceId = useMemo(() => {
    if (mode === "edit" && event?.workspaceId) {
      return event.workspaceId;
    }
    return defaultWorkspaceId.startsWith("group_") ? defaultWorkspaceId : "";
  }, [mode, event, defaultWorkspaceId]);

  // Form States
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState<"private" | "public" | "group">("private");
  const [groupWorkspaceId, setGroupWorkspaceId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(mode === "edit" && event ? event.title : "");
      setDescription(mode === "edit" && event ? event.description || "" : "");
      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setLocation(mode === "edit" && event ? event.location || "" : "");
      setEventType(initialEventType);
      setGroupWorkspaceId(initialWorkspaceId);
    }
  }, [
    isOpen,
    mode,
    event,
    initialDate,
    initialStartTime,
    initialEndTime,
    initialEventType,
    initialWorkspaceId,
  ]);

  const handleClose = () => {
    onClose();
  };

  const handleSave = async () => {
    if (!userId) {
      toast.error("Bitte melde dich an, um diese Aktion auszuführen.");
      return;
    }
    if (!title.trim()) {
      toast.error("Titel ist erforderlich.");
      return;
    }
    if (eventType === "group" && !groupWorkspaceId) {
      toast.error("Wähle eine Gruppe für dieses Event aus.");
      return;
    }

    // Parse dates to timestamp
    const startTimestamp = new Date(`${date}T${startTime}`).getTime();
    const endTimestamp = new Date(`${date}T${endTime}`).getTime();

    if (isNaN(startTimestamp) || isNaN(endTimestamp)) {
      toast.error("Ungültiges Datum oder Uhrzeit.");
      return;
    }

    if (startTimestamp >= endTimestamp) {
      toast.error("Die Startzeit muss vor der Endzeit liegen.");
      return;
    }

    setIsLoading(true);
    try {
      if (mode === "create") {
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startTimestamp,
          endTime: endTimestamp,
          location: location.trim() || undefined,
          userId,
          isPrivate: eventType === "public" ? false : true,
          workspaceId: eventType === "group" ? groupWorkspaceId || undefined : undefined,
        });
        toast.success("Event erstellt");
      } else {
        await updateEvent({
          eventId: event._id,
          userId,
          title: title.trim(),
          description: description.trim() || undefined,
          startTime: startTimestamp,
          endTime: endTimestamp,
          location: location.trim() || undefined,
          isPrivate: eventType === "public" ? false : true,
        });
        toast.success("Event aktualisiert");
      }
      handleClose();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Fehler beim Speichern des Events.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || !event) return;
    if (confirm("Bist du sicher, dass du dieses Event löschen möchtest?")) {
      setIsLoading(true);
      try {
        await removeEvent({
          eventId: event._id,
          userId,
        });
        toast.success("Event gelöscht");
        handleClose();
        router.push("/workspace");
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Fehler beim Löschen des Events.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const isCreator = mode === "edit" && event && event.createdBy === userId;
  const showReadOnly = mode === "edit" && !isCreator;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-24px)] md:max-w-[560px] max-h-[calc(100dvh-24px)] p-0 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-100 px-6 py-4">
          <DialogHeader>
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold text-slate-900">
                {mode === "create" ? "Event erstellen" : isCreator ? "Event bearbeiten" : "Event ansehen"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        {showReadOnly ? (
          <>
            {/* Read-Only Body */}
            <DialogBody className="px-6 py-4 overflow-y-auto min-h-0 space-y-4">
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 break-words">{event?.title}</h3>
                  {event?.description && (
                    <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap break-words leading-relaxed italic">
                      "{event.description}"
                    </p>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-3.5 text-sm">
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-[#D08945]" />
                    <div>
                      <p className="text-xs text-slate-400 font-semibold select-none">Datum</p>
                      <p className="font-bold text-slate-800">
                        {event?.startTime && new Date(event.startTime).toLocaleDateString("de-DE", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-slate-400 font-semibold select-none">Uhrzeit</p>
                      <p className="font-bold text-slate-800">
                        {event?.startTime && new Date(event.startTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                        {" - "}
                        {event?.endTime && new Date(event.endTime).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
                      </p>
                    </div>
                  </div>

                  {event?.location && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-xs text-slate-400 font-semibold select-none">Ort</p>
                        <p className="font-bold text-slate-800 break-words">{event.location}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs text-amber-800 font-medium">
                  Dieses Event wurde von jemand anderem erstellt. Du kannst es nur ansehen.
                </p>
              </div>
            </DialogBody>

            {/* Read-Only Footer */}
            <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
              <DialogFooter className="w-full">
                <button
                  onClick={handleClose}
                  className="w-full px-4 py-2.5 rounded-2xl text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 font-bold min-h-[40px] transition-all active:scale-95 text-sm"
                >
                  Schließen
                </button>
              </DialogFooter>
            </div>
          </>
        ) : (
          <>
            {/* Editable Form Body */}
            <DialogBody className="px-6 py-4 overflow-y-auto min-h-0 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event Titel"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Beschreibung des Events (optional)"
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 placeholder-slate-400 text-sm resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Datum *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 text-sm"
            />
          </div>

          {/* Start & End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Startzeit *
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Endzeit *
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 text-sm"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Ort (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="z.B. Raum 101"
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 placeholder-slate-400 text-sm"
            />
          </div>

          {/* Event Type & Selection */}
          {mode === "create" ? (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Eventtyp
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "private", label: "Privat", icon: Lock },
                  { key: "public", label: "Öffentlich", icon: Globe },
                  { key: "group", label: "Gruppe", icon: CalendarIcon },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() =>
                      setEventType(option.key as "private" | "public" | "group")
                    }
                    className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                      eventType === option.key
                        ? "border-[#D08945] bg-[#FEE3C1] text-[#953F0B]"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <option.icon className="h-4 w-4" />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>

              {eventType === "group" && (
                <div className="mt-3">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Gruppe *
                  </label>
                  <select
                    value={groupWorkspaceId}
                    onChange={(e) => setGroupWorkspaceId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#D08945]/20 focus:border-[#D08945] text-slate-900 text-sm"
                  >
                    <option value="">Gruppe auswählen</option>
                    {groupOptions.map((group) => (
                      <option
                        key={(group as any)._id.toString()}
                        value={`group_${(group as any)._id}`}
                      >
                        {(group as any).displayName || "Gruppe"}
                      </option>
                    ))}
                  </select>
                  {groupOptions.length === 0 && (
                    <p className="mt-1.5 text-xs text-slate-500">
                      Tritt zuerst einer Gruppe bei oder erstelle eine, um ein Gruppenevent zu planen.
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Edit mode read-only event type (changing workspaceId is complex and unsupported in backend schema updates)
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex items-center justify-between text-xs select-none">
              <span className="font-semibold text-slate-500">Eventtyp:</span>
              <span className="font-bold text-slate-800 capitalize">
                {eventType === "group"
                  ? "Gruppe"
                  : eventType === "public"
                    ? "Öffentlich"
                    : "Privat"}
              </span>
            </div>
          )}

          {/* Delete Action (Separated visual placement) */}
          {mode === "edit" && isCreator && (
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="w-full py-2.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold transition-colors active:scale-95 text-sm"
              >
                Event löschen
              </button>
            </div>
          )}
        </DialogBody>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-100 px-6 py-4">
          <DialogFooter className="flex flex-row gap-2 justify-end w-full">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-2xl text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 font-semibold min-h-[40px] transition-all active:scale-95 text-sm"
            >
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1 px-6 py-2.5 rounded-2xl bg-[#D08945] hover:bg-[#b07335] text-white font-bold min-h-[40px] transition-all active:scale-95 text-sm shadow-sm"
            >
              {isLoading ? "Speichern..." : mode === "create" ? "Event erstellen" : "Änderungen speichern"}
            </button>
          </DialogFooter>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

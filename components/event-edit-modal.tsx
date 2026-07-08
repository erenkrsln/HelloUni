"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast";
import { Doc, Id } from "@/convex/_generated/dataModel";

interface EventEditModalProps {
  event: Doc<"events">;
  isOpen: boolean;
  onClose: () => void;
  userId: Id<"users">;
}

export function EventEditModal({ event, isOpen, onClose, userId }: EventEditModalProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || "");
  const [location, setLocation] = useState(event.location || "");
  const [startDate, setStartDate] = useState(new Date(event.startTime).toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState(new Date(event.startTime).toISOString().split("T")[1].slice(0, 5));
  const [endDate, setEndDate] = useState(new Date(event.endTime).toISOString().split("T")[0]);
  const [endTime, setEndTime] = useState(new Date(event.endTime).toISOString().split("T")[1].slice(0, 5));
  const [isPrivate, setIsPrivate] = useState(event.isPrivate ?? true);
  const [isLoading, setIsLoading] = useState(false);

  const updateEvent = useMutation(api.events.update);
  const deleteEvent = useMutation(api.events.remove);
  const toast = useToast();

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Event title is required");
      return;
    }

    setIsLoading(true);
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`).getTime();
      const endDateTime = new Date(`${endDate}T${endTime}`).getTime();

      if (startDateTime >= endDateTime) {
        toast.error("Start time must be before end time");
        setIsLoading(false);
        return;
      }

      await updateEvent({
        eventId: event._id,
        userId,
        title,
        description: description || undefined,
        location: location || undefined,
        startTime: startDateTime,
        endTime: endDateTime,
        isPrivate,
      });

      toast.success("Event updated successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteEvent({
        eventId: event._id,
        userId,
      });

      toast.success("Event deleted successfully");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title"
              className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description (optional)"
              className="w-full mt-1 min-h-[92px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location (optional)"
              className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full mt-1 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="isPrivate" className="text-sm font-medium text-slate-700">
              Private event
            </label>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2 pt-6">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Delete Event
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-[#D08945] hover:bg-[#b07335] text-white"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

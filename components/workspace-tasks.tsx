"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Clock, Trash2, User, ShieldCheck, X } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SectionHeader } from "@/components/section-header";
import { motion, AnimatePresence } from "framer-motion";
import { Id } from "@/convex/_generated/dataModel";

type TaskStatus = "todo" | "in_progress" | "done";

type TaskFormState = {
  title: string;
  description: string;
  assigneeId: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  visibility: "public" | "private";
  status: TaskStatus;
};

export function WorkspaceTasks({
  workspaceId,
  onBackToOverview,
}: {
  workspaceId: string;
  onBackToOverview?: () => void;
}) {
  const { currentUser } = useCurrentUser();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deletingTaskTitle, setDeletengTaskTitle] = useState("");
  const [isSavingDelete, setIsSavingDelete] = useState(false);
  const [formState, setFormState] = useState<TaskFormState>({
    title: "",
    description: "",
    assigneeId: "",
    deadline: "",
    priority: "medium",
    visibility: "public",
    status: "todo",
  });
  const [editState, setEditState] = useState<TaskFormState>({
    title: "",
    description: "",
    assigneeId: "",
    deadline: "",
    priority: "medium",
    visibility: "public",
    status: "todo",
  });
  const [localTasks, setLocalTasks] = useState<any[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const tasksQuery = useQuery(api.workspace.listGroupTasks, { workspaceId });
  const isGroup = workspaceId.startsWith("group_");
  const conversationId = (
    isGroup ? workspaceId.replace("group_", "") : ""
  ) as Id<"conversations">;
  const conversationMembers = useQuery(
    api.queries.getConversationMembers,
    isGroup ? { conversationId } : "skip",
  );

  const assigneeOptions = useMemo(() => {
    if (isGroup) return conversationMembers || [];
    return currentUser ? [currentUser] : [];
  }, [conversationMembers, currentUser, isGroup]);

  useEffect(() => {
    if (tasksQuery) setLocalTasks(tasksQuery.slice());
  }, [tasksQuery]);

  const tasks = localTasks || tasksQuery || [];
  const toast = useToast();

  const statuses: { key: TaskStatus; label: string }[] = [
    { key: "todo", label: "Offen" },
    { key: "in_progress", label: "In Bearbeitung" },
    { key: "done", label: "Erledigt" },
  ];

  const resetForm = () => {
    setFormState({
      title: "",
      description: "",
      assigneeId: currentUser?._id || "",
      deadline: "",
      priority: "medium",
      visibility: "public",
      status: "todo",
    });
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const createTaskMutation = useMutation(api.workspace.createTask);
  const updateTaskStatus = useMutation(api.workspace.updateTaskStatus);
  const updateTaskMutation = useMutation(api.workspace.updateTask as any);
  const deleteTaskMutation = useMutation(api.workspace.deleteTask as any);

  const handleCreateTask = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!formState.title.trim() || !currentUser) return;

    setIsSaving(true);
    const tempId = `tmp_${Date.now()}`;
    const tempTask = {
      _id: tempId,
      workspaceId,
      title: formState.title.trim(),
      description: formState.description.trim(),
      deadline: formState.deadline,
      assigneeId: formState.assigneeId || currentUser._id,
      createdBy: currentUser._id,
      priority: formState.priority,
      visibility: formState.visibility,
      status: formState.status,
      isCompleted: formState.status === "done",
      createdAt: Date.now(),
      assigneeName:
        assigneeOptions.find(
          (user) => user._id === (formState.assigneeId || currentUser._id),
        )?.name || currentUser.name,
    } as any;

    setLocalTasks((prev) => (prev ? [tempTask, ...prev] : [tempTask]));

    try {
      const createdId = await createTaskMutation({
        workspaceId,
        title: tempTask.title,
        description: tempTask.description,
        deadline: tempTask.deadline || undefined,
        assigneeId: tempTask.assigneeId,
        createdBy: currentUser._id,
        priority: tempTask.priority,
        visibility: tempTask.visibility,
        status: tempTask.status,
      });
      if (createdId) {
        setLocalTasks(
          (prev) =>
            prev?.map((task) =>
              task._id === tempId ? { ...task, _id: createdId } : task,
            ) ?? prev,
        );
      }
      setShowCreateModal(false);
      toast.success("Aufgabe erstellt");
    } catch (error) {
      console.error("Failed to create task", error);
      setLocalTasks(
        (prev) => prev?.filter((task) => task._id !== tempId) ?? null,
      );
      toast.error("Failed to create task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenTask = (task: any) => {
    setSelectedTask(task);
    setEditState({
      title: task.title || "",
      description: task.description || "",
      assigneeId: task.assigneeId || "",
      deadline: task.deadline || "",
      priority: task.priority || "medium",
      visibility: task.visibility || "public",
      status: task.status || "todo",
    });
  };

  const searchParams = useSearchParams();
  const taskIdParam = searchParams.get("taskId");

  useEffect(() => {
    if (taskIdParam && tasks.length > 0 && !selectedTask) {
      const taskObj = tasks.find((t) => t._id.toString() === taskIdParam);
      if (taskObj) {
        handleOpenTask(taskObj);
      }
    }
  }, [taskIdParam, tasks, selectedTask]);

  const handleClose = () => {
    setSelectedTask(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("taskId")) {
        params.delete("taskId");
        const newQuery = params.toString();
        const cleanPath = `${window.location.pathname}${newQuery ? `?${newQuery}` : ""}`;
        router.replace(cleanPath);
      }
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTask || !currentUser) return;
    setIsSaving(true);

    const patch: any = {
      title: editState.title.trim(),
      description: editState.description.trim(),
      priority: editState.priority,
      visibility: editState.visibility,
      status: editState.status,
    };
    if (editState.assigneeId) patch.assigneeId = editState.assigneeId;
    if (editState.deadline) patch.deadline = editState.deadline;

    try {
      await updateTaskMutation({
        taskId: selectedTask._id,
        patch,
        actorId: currentUser._id,
      });
      setLocalTasks(
        (prev) =>
          prev?.map((task) =>
            task._id === selectedTask._id
              ? { ...task, ...patch, isCompleted: patch.status === "done" }
              : task,
          ) ?? prev,
      );
      handleClose();
    } catch (error) {
      console.error("Failed to save task", error);
      toast.error("Failed to save task. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeStatus = async (task: any, newStatus: TaskStatus) => {
    if (!currentUser) return;
    const previous = tasks.slice();
    setLocalTasks(
      (prev) =>
        prev?.map((item) =>
          item._id === task._id
            ? { ...item, status: newStatus, isCompleted: newStatus === "done" }
            : item,
        ) ?? prev,
    );

    try {
      await updateTaskStatus({
        taskId: task._id,
        status: newStatus,
        userId: currentUser._id,
      });
    } catch (error) {
      console.error("Failed to update task status", error);
      setLocalTasks(previous);
      toast.error("Unable to change task status.");
    }
  };

  const handleDelete = async (task: any) => {
    if (!currentUser) return;
    setDeletingTaskId(task._id);
    setDeletengTaskTitle(task.title);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTaskId || !currentUser) return;
    const previous = tasks.slice();
    setLocalTasks(
      (prev) => prev?.filter((item) => item._id !== deletingTaskId) ?? prev,
    );

    try {
      setIsSavingDelete(true);
      await deleteTaskMutation({
        taskId: deletingTaskId,
        actorId: currentUser._id,
      });
      toast.success("Aufgabe gelöscht");
      handleClose();
    } catch (error) {
      console.error("Failed to delete task", error);
      setLocalTasks(previous);
      toast.error("Aufgabe konnte nicht gelöscht werden. Bitte versuche es erneut.");
    } finally {
      setIsSavingDelete(false);
      setDeletingTaskId(null);
      setDeletengTaskTitle("");
    }
  };

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string,
  ) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverColumn = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnColumn = async (
    e: React.DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((item: any) => item._id === taskId);
    if (!task) return;
    await handleChangeStatus(task, status);
  };

  const taskCount = tasks.length;

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {/* Section Header */}
        {onBackToOverview && (
          <SectionHeader
            title="Aufgaben"
            subtitle="Verwalte Gruppenaufgaben und Zuständigkeiten"
            onBackClick={onBackToOverview}
          />
        )}

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {!onBackToOverview && (
              <>
                <h2 className="text-xl font-semibold text-slate-900">Aufgaben</h2>
                <p className="text-sm text-slate-500">
                  Verwalte deine Gruppenarbeit mit detaillierten Aufgaben und schnellen Updates.
                </p>
              </>
            )}
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-full bg-[#D08945] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] transition-colors"
          >
            <Plus size={16} /> Neue Aufgabe
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
          <span>
            {taskCount} {taskCount === 1 ? "Aufgabe" : "Aufgaben"} insgesamt
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 font-semibold shadow-sm">
            <ShieldCheck size={14} />{" "}
            {isGroup ? "Gruppen-Workspace" : "Event-Workspace"}
          </span>
        </div>

        {taskCount === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            <p className="mb-2 text-sm font-medium">Keine Aufgaben vorhanden.</p>
            <button
              onClick={openCreateModal}
              className="text-sm font-bold text-[#D08945] hover:text-[#b07335]"
            >
              Erstelle deine erste Aufgabe
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {statuses.map((status) => {
              const statusTasks = tasks.filter(
                (task: any) => task.status === status.key,
              );
              const columnStyles = {
                todo: {
                  bg: "bg-blue-50/60 border border-blue-100/40",
                  badge: "bg-blue-100/60 text-blue-700",
                  label: "text-blue-800",
                },
                in_progress: {
                  bg: "bg-amber-50/60 border border-amber-100/40",
                  badge: "bg-amber-100/60 text-amber-700",
                  label: "text-amber-800",
                },
                done: {
                  bg: "bg-green-50/60 border border-green-100/40",
                  badge: "bg-green-100/60 text-green-700",
                  label: "text-green-800",
                },
              }[status.key as "todo" | "in_progress" | "done"];

              return (
                <div
                  key={status.key}
                  className={`rounded-3xl p-3.5 shadow-sm ${columnStyles.bg}`}
                >
                  <div className={`mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider select-none ${columnStyles.label}`}>
                    <span>{status.label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold shadow-sm ${columnStyles.badge}`}>
                      {statusTasks.length}
                    </span>
                  </div>
                  <div className="space-y-3 min-h-[120px]">
                    {statusTasks.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500 font-medium">
                        Keine Aufgaben in dieser Spalte.
                      </div>
                    ) : (
                      statusTasks.map((task: any) => (
                        <TaskCard
                          key={task._id}
                          task={{
                            ...task,
                            assigneeName:
                              assigneeOptions.find(
                                (user) => user._id === task.assigneeId,
                              )?.name || "Nicht zugewiesen",
                          }}
                          statusKey={status.key}
                          onDragStart={handleDragStart}
                          moveTask={handleChangeStatus}
                          onDelete={handleDelete}
                          onEdit={handleOpenTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {showCreateModal && (
            <Modal onClose={() => setShowCreateModal(false)}>
              <div className="rounded-3xl bg-white shadow-2xl w-full flex flex-col max-h-[calc(100dvh-24px)] overflow-hidden">
                {/* Header - Fixed */}
                <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Aufgabe erstellen
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Füge Details hinzu und weise die Aufgabe zu, bevor du sie speicherst.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    aria-label="Schließen"
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 -mr-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form - Scrollable */}
                <form
                  onSubmit={handleCreateTask}
                  className="flex-1 overflow-y-auto px-6 py-4 min-h-0"
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Titel
                      </label>
                      <input
                        value={formState.title}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 text-sm"
                        placeholder="Titel der Aufgabe eingeben"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Beschreibung
                      </label>
                      <textarea
                        value={formState.description}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 resize-none text-sm"
                        placeholder="Kurze Beschreibung hinzufügen"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Zuständig
                        </label>
                        <select
                          value={formState.assigneeId}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              assigneeId: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="">Nicht zugewiesen</option>
                          {assigneeOptions.map((member) => (
                            <option key={member._id} value={member._id}>
                              {member.name || member.username || "Student"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Fälligkeitsdatum
                        </label>
                        <input
                          type="date"
                          value={formState.deadline}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              deadline: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Priorität
                        </label>
                        <select
                          value={formState.priority}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              priority: e.target
                                .value as TaskFormState["priority"],
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="low">Niedrig</option>
                          <option value="medium">Mittel</option>
                          <option value="high">Hoch</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Sichtbarkeit
                        </label>
                        <select
                          value={formState.visibility}
                          onChange={(e) =>
                            setFormState((prev) => ({
                              ...prev,
                              visibility: e.target
                                .value as TaskFormState["visibility"],
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="public">Öffentlich</option>
                          <option value="private">Privat</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Anfangsstatus
                      </label>
                      <select
                        value={formState.status}
                        onChange={(e) =>
                          setFormState((prev) => ({
                            ...prev,
                            status: e.target.value as TaskStatus,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                      >
                        <option value="todo">Offen</option>
                        <option value="in_progress">In Bearbeitung</option>
                        <option value="done">Erledigt</option>
                      </select>
                    </div>
                  </div>
                </form>

                {/* Footer - Fixed */}
                <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 items-stretch sm:items-center sm:justify-end w-full bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 sm:flex-initial px-5 h-12 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold transition-all active:scale-95 text-sm flex items-center justify-center"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    onClick={handleCreateTask}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-6 h-12 rounded-2xl bg-[#D08945] hover:bg-[#b07335] text-white font-extrabold shadow-sm disabled:opacity-50 transition-all active:scale-95 text-sm flex items-center justify-center"
                  >
                    {isSaving ? "Wird gespeichert..." : "Aufgabe erstellen"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedTask && (
            <Modal onClose={() => setSelectedTask(null)}>
              <div className="rounded-3xl bg-white shadow-2xl w-full flex flex-col max-h-[calc(100dvh-24px)] overflow-hidden">
                {/* Header - Fixed */}
                <div className="flex-shrink-0 border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Aufgabendetails
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">
                      Bearbeite die ausgewählte Aufgabe und speichere deine Änderungen.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    aria-label="Schließen"
                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 -mr-2"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Form - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Titel
                      </label>
                      <input
                        value={editState.title}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            title: e.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Beschreibung
                      </label>
                      <textarea
                        value={editState.description}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full h-24 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20 resize-none text-sm"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Zuständig
                        </label>
                        <select
                          value={editState.assigneeId}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              assigneeId: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="">Nicht zugewiesen</option>
                          {assigneeOptions.map((member) => (
                            <option key={member._id} value={member._id}>
                              {member.name || member.username || "Student"}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Fälligkeitsdatum
                        </label>
                        <input
                          type="date"
                          value={editState.deadline}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              deadline: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Priorität
                        </label>
                        <select
                          value={editState.priority}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              priority: e.target
                                .value as TaskFormState["priority"],
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="low">Niedrig</option>
                          <option value="medium">Mittel</option>
                          <option value="high">Hoch</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                          Sichtbarkeit
                        </label>
                        <select
                          value={editState.visibility}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              visibility: e.target
                                .value as TaskFormState["visibility"],
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                        >
                          <option value="public">Öffentlich</option>
                          <option value="private">Privat</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editState.status}
                        onChange={(e) =>
                          setEditState((prev) => ({
                            ...prev,
                            status: e.target.value as TaskStatus,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                      >
                        <option value="todo">Offen</option>
                        <option value="in_progress">In Bearbeitung</option>
                        <option value="done">Erledigt</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Footer - Fixed */}
                <div className="flex-shrink-0 border-t border-slate-200 px-6 py-4 flex flex-col-reverse sm:flex-row gap-3 items-stretch sm:items-center sm:justify-between w-full bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => selectedTask && handleDelete(selectedTask)}
                    className="flex-1 sm:flex-initial px-5 h-12 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold transition-all active:scale-95 text-sm flex items-center justify-center"
                  >
                    Aufgabe löschen
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTask}
                    disabled={isSaving}
                    className="flex-1 sm:flex-initial px-6 h-12 rounded-2xl bg-[#D08945] hover:bg-[#b07335] text-white font-extrabold shadow-sm disabled:opacity-50 transition-all active:scale-95 text-sm flex items-center justify-center"
                  >
                    {isSaving ? "Wird gespeichert..." : "Änderungen speichern"}
                  </button>
                </div>
              </div>
            </Modal>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          isOpen={!!deletingTaskId}
          onClose={() => {
            setDeletingTaskId(null);
            setDeletengTaskTitle("");
          }}
          onConfirm={handleConfirmDelete}
          title="Aufgabe löschen?"
          description={`Bist du sicher, dass du "${deletingTaskTitle}" löschen möchtest? Dies kann nicht rückgängig gemacht werden.`}
          confirmLabel="Löschen"
          isDangerous={true}
          isLoading={isSavingDelete}
        />
      </div>
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] max-h-[calc(100dvh-24px)] flex flex-col"
      >
        {children}
      </div>
    </motion.div>
  );
}

function TaskCard({
  task,
  statusKey,
  onDragStart,
  moveTask,
  onDelete,
  onEdit,
}: {
  task: any;
  statusKey: TaskStatus;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, id: string) => void;
  moveTask: (task: any, status: TaskStatus) => Promise<void> | void;
  onDelete: (task: any) => void;
  onEdit: (task: any) => void;
}) {
  const isPending = String(task._id).startsWith("tmp_");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.15 }}
      draggable={!isPending}
      onDragStart={(e: any) => !isPending && onDragStart(e as any, task._id)}
      onClick={() => onEdit(task)}
      className={`group bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md transition-colors duration-150 ${isPending ? "opacity-70 cursor-wait" : "cursor-pointer"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 truncate max-w-[200px]">
              {task.title || "Unbenannte Aufgabe"}
            </h3>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 border shadow-sm ${task.visibility === "private" ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}
            >
              {task.visibility === "private" ? "Privat" : "Öffentlich"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
            {task.description || "Noch keine Beschreibung."}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task);
          }}
          className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/60 px-3 py-1 font-semibold">
          <Clock size={12} className="text-slate-400" /> {task.deadline || "Keine Frist"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 border border-slate-200/60 px-3 py-1 font-semibold">
          <User size={12} className="text-slate-400" /> {task.assigneeName || "Nicht zugewiesen"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold border shadow-sm ${task.priority === "high" ? "bg-rose-50 text-rose-700 border-rose-100" : task.priority === "low" ? "bg-sky-50 text-sky-700 border-sky-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}
        >
          {task.priority === "high" ? "Hoch" : task.priority === "low" ? "Niedrig" : "Mittel"}
        </span>
        {isPending && (
          <span className="text-[10px] uppercase font-bold text-slate-400 animate-pulse">
            Wird gespeichert…
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        {statusKey !== "todo" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveTask(
                task,
                statusKey === "in_progress" ? "todo" : "in_progress",
              );
            }}
            className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 font-semibold"
          >
            Zurück
          </button>
        )}
        {statusKey !== "done" && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              moveTask(task, statusKey === "todo" ? "in_progress" : "done");
            }}
            className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200 font-semibold"
          >
            Weiter
          </button>
        )}
      </div>
    </motion.div>
  );
}

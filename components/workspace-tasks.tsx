"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, Clock, Trash2, User, ShieldCheck } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
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

export function WorkspaceTasks({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
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
  const conversationId = (isGroup ? workspaceId.replace("group_", "") : "") as Id<"conversations">;
  const conversationMembers = useQuery(api.queries.getConversationMembers, isGroup ? { conversationId } : "skip");

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
    { key: "todo", label: "To Do" },
    { key: "in_progress", label: "In Progress" },
    { key: "done", label: "Done" },
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
      assigneeName: assigneeOptions.find((user) => user._id === (formState.assigneeId || currentUser._id))?.name || currentUser.name,
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
        setLocalTasks((prev) => prev?.map((task) => task._id === tempId ? { ...task, _id: createdId } : task) ?? prev);
      }
      setShowCreateModal(false);
      toast.success("Task created");
    } catch (error) {
      console.error("Failed to create task", error);
      setLocalTasks((prev) => prev?.filter((task) => task._id !== tempId) ?? null);
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
      setLocalTasks((prev) => prev?.map((task) => task._id === selectedTask._id ? { ...task, ...patch, isCompleted: patch.status === "done" } : task) ?? prev);
      setSelectedTask(null);
      toast.success("Task saved");
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
    setLocalTasks((prev) => prev?.map((item) => item._id === task._id ? { ...item, status: newStatus, isCompleted: newStatus === "done" } : item) ?? prev);

    try {
      await updateTaskStatus({ taskId: task._id, status: newStatus, userId: currentUser._id });
    } catch (error) {
      console.error("Failed to update task status", error);
      setLocalTasks(previous);
      toast.error("Unable to change task status.");
    }
  };

  const handleDelete = async (task: any) => {
    if (!currentUser) return;
    if (!confirm("Delete this task?")) return;
    const previous = tasks.slice();
    setLocalTasks((prev) => prev?.filter((item) => item._id !== task._id) ?? prev);

    try {
      await deleteTaskMutation({ taskId: task._id, actorId: currentUser._id });
      toast.success("Task deleted");
    } catch (error) {
      console.error("Failed to delete task", error);
      setLocalTasks(previous);
      toast.error("Failed to delete task. Please try again.");
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverColumn = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnColumn = async (e: React.DragEvent<HTMLDivElement>, status: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((item: any) => item._id === taskId);
    if (!task) return;
    await handleChangeStatus(task, status);
  };

  const taskCount = tasks.length;

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Tasks</h2>
          <p className="text-sm text-slate-500">Manage your group work with richer task details and faster updates.</p>
        </div>
        <button onClick={openCreateModal} className="inline-flex items-center gap-2 rounded-full bg-[#D08945] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] transition-colors">
          <Plus size={16} /> New task
        </button>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        <span>{taskCount} task{taskCount === 1 ? "" : "s"} total</span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
          <ShieldCheck size={14} /> {isGroup ? "Group workspace" : "Event workspace"}
        </span>
      </div>

      {taskCount === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          <p className="mb-2 text-sm">No tasks yet.</p>
          <button onClick={openCreateModal} className="text-sm font-semibold text-[#D08945] hover:text-[#b07335]">Create your first task</button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {statuses.map((status) => {
            const statusTasks = tasks.filter((task: any) => task.status === status.key);
            return (
              <div key={status.key} className="rounded-3xl bg-slate-50 p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
                  <span>{status.label}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500 shadow-sm">{statusTasks.length}</span>
                </div>
                <div className="space-y-3 min-h-[120px]">
                  {statusTasks.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-4 text-xs text-slate-500">No tasks in this column yet.</div>
                  ) : (
                    statusTasks.map((task: any) => (
                      <TaskCard
                        key={task._id}
                        task={{
                          ...task,
                          assigneeName: assigneeOptions.find((user) => user._id === task.assigneeId)?.name || "Unassigned",
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
            <div className="rounded-3xl bg-white p-6 shadow-2xl w-full max-w-lg">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Create Task</h3>
                  <p className="text-sm text-slate-500">Add details and assign work before saving.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleCreateTask} className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={formState.title}
                  onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  placeholder="Enter task title"
                  required
                />

                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={formState.description}
                  onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[92px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  placeholder="Add a short description"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Assignee
                    <select
                      value={formState.assigneeId}
                      onChange={(e) => setFormState((prev) => ({ ...prev, assigneeId: e.target.value }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                    >
                      <option value="">Unassigned</option>
                      {assigneeOptions.map((member) => (
                        <option key={member._id} value={member._id}>{member.name || member.username || "Student"}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Due date
                    <input
                      type="date"
                      value={formState.deadline}
                      onChange={(e) => setFormState((prev) => ({ ...prev, deadline: e.target.value }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Priority
                    <select
                      value={formState.priority}
                      onChange={(e) => setFormState((prev) => ({ ...prev, priority: e.target.value as TaskFormState["priority"] }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>

                  <label className="block text-sm font-medium text-slate-700">
                    Visibility
                    <select
                      value={formState.visibility}
                      onChange={(e) => setFormState((prev) => ({ ...prev, visibility: e.target.value as TaskFormState["visibility"] }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                    >
                      <option value="public">Public</option>
                      <option value="private">Private</option>
                    </select>
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Initial status
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as TaskStatus }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </label>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSaving} className="rounded-full bg-[#D08945] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] disabled:opacity-50">
                    {isSaving ? "Saving..." : "Create task"}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedTask && (
          <Modal onClose={() => setSelectedTask(null)}>
            <div className="rounded-3xl bg-white p-6 shadow-2xl w-full max-w-lg">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Task details</h3>
                  <p className="text-sm text-slate-500">Edit the selected task and save your changes.</p>
                </div>
                <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Title</label>
                <input
                  value={editState.title}
                  onChange={(e) => setEditState((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                />

                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea
                  value={editState.description}
                  onChange={(e) => setEditState((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full min-h-[92px] rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Assignee</label>
                  <select
                    value={editState.assigneeId}
                    onChange={(e) => setEditState((prev) => ({ ...prev, assigneeId: e.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  >
                    <option value="">Unassigned</option>
                    {assigneeOptions.map((member) => (
                      <option key={member._id} value={member._id}>{member.name || member.username || "Student"}</option>
                    ))}
                  </select>

                  <label className="block text-sm font-medium text-slate-700">Due date</label>
                  <input
                    type="date"
                    value={editState.deadline}
                    onChange={(e) => setEditState((prev) => ({ ...prev, deadline: e.target.value }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">Priority</label>
                  <select
                    value={editState.priority}
                    onChange={(e) => setEditState((prev) => ({ ...prev, priority: e.target.value as TaskFormState["priority"] }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <label className="block text-sm font-medium text-slate-700">Visibility</label>
                  <select
                    value={editState.visibility}
                    onChange={(e) => setEditState((prev) => ({ ...prev, visibility: e.target.value as TaskFormState["visibility"] }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editState.status}
                  onChange={(e) => setEditState((prev) => ({ ...prev, status: e.target.value as TaskStatus }))}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#D08945] focus:ring-2 focus:ring-[#D08945]/20"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button type="button" onClick={() => setSelectedTask(null)} className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel
                  </button>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => selectedTask && handleDelete(selectedTask)} className="rounded-full border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100">
                      Delete
                    </button>
                    <button type="button" onClick={handleSaveTask} disabled={isSaving} className="rounded-full bg-[#D08945] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#b07335] disabled:opacity-50">
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
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
            <h3 className="text-sm font-semibold text-slate-900">{task.title || "Untitled task"}</h3>
            <span className={`text-[11px] font-semibold uppercase tracking-[0.18em] rounded-full px-2 py-1 ${task.visibility === "private" ? "bg-slate-100 text-slate-700" : "bg-emerald-100 text-emerald-800"}`}>
              {task.visibility === "private" ? "Private" : "Public"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500 line-clamp-2">{task.description || "No description yet."}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(task); }} className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-xs text-slate-500">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <Clock size={12} /> {task.deadline || "No deadline"}
        </span>
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
          <User size={12} /> {task.assigneeName || "Unassigned"}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${task.priority === "high" ? "bg-rose-100 text-rose-700" : task.priority === "low" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
          {task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : "Medium"}
        </span>
        {isPending && <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Saving…</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
        {statusKey !== "todo" && (
          <button onClick={(e) => { e.stopPropagation(); moveTask(task, statusKey === "in_progress" ? "todo" : "in_progress"); }} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200">
            Back
          </button>
        )}
        {statusKey !== "done" && (
          <button onClick={(e) => { e.stopPropagation(); moveTask(task, statusKey === "todo" ? "in_progress" : "done"); }} className="rounded-full bg-slate-100 px-3 py-1 hover:bg-slate-200">
            Advance
          </button>
        )}
      </div>
    </motion.div>
  );
}

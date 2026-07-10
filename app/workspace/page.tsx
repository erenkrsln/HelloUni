"use client";

import { useState, useRef } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { Plus, Calendar, Users, ListTodo, Trash2, Check } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreateGroupModal } from "@/components/workspace-create-group-modal";
import { PersonalTodoModal } from "@/components/personal-todo-modal";
import { EventCard } from "@/components/event-card";

export default function WorkspacePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateTodoModalOpen, setIsCreateTodoModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState<any | null>(null);
  const [eventFilter, setEventFilter] = useState<
    "all" | "personal" | "groups" | "public"
  >("all");
  const [taskFilter, setTaskFilter] = useState<"all" | "personal" | "assigned">(
    "all",
  );
  const { currentUser } = useCurrentUser();

  // Section refs for scroll navigation
  const groupsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<HTMLDivElement>(null);

  // Fetch Real Data via Convex
  const allConversations = useQuery(
    api.queries.getConversations,
    currentUser ? { userId: currentUser._id } : "skip",
  );
  const myEventsWithSource = useQuery(
    api.events.getAllUserEventsWithSource,
    currentUser
      ? { userId: currentUser._id, filter: eventFilter, limit: 5 }
      : "skip",
  );
  const personalTodos = useQuery(
    api.workspace.getPersonalTodos,
    currentUser ? { userId: currentUser._id } : "skip",
  );
  const assignedGroupTasks = useQuery(
    api.queries.getAssignedGroupTasks,
    currentUser ? { userId: currentUser._id } : "skip",
  );

  // Mutations
  const toggleTodoCompletion = useMutation(
    api.workspace.togglePersonalTodoCompletion,
  );
  const deletePersonalTodo = useMutation(api.workspace.deletePersonalTodo);
  const toggleGroupTaskCompletion = useMutation(
    api.workspace.toggleTaskCompletion,
  );

  // Format Data
  const myGroups = allConversations?.filter((conv) => conv.isGroup) || [];

  // Personal To-Dos (incomplete)
  const pendingTodos = personalTodos?.filter((t) => !t.completed) || [];

  // Apply task filters
  const filteredTasks = () => {
    const combined = [
      ...pendingTodos.map((todo) => ({ ...todo, source: "personal" as const })),
      ...(assignedGroupTasks || []).map((task) => ({
        ...task,
        source: "assigned" as const,
      })),
    ];

    if (taskFilter === "personal") {
      return combined.filter((t) => t.source === "personal");
    }
    if (taskFilter === "assigned") {
      return combined.filter((t) => t.source === "assigned");
    }
    return combined;
  };

  const displayedTasks = filteredTasks();

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    if (currentUser) {
      await toggleTodoCompletion({
        todoId: todoId as any,
        userId: currentUser._id,
        completed: !completed,
      });
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (currentUser && confirm("Dieses To-do löschen?")) {
      await deletePersonalTodo({
        todoId: todoId as any,
        userId: currentUser._id,
      });
    }
  };

  const handleToggleGroupTask = async (
    taskId: string,
    isCompleted: boolean,
  ) => {
    if (currentUser) {
      try {
        await toggleGroupTaskCompletion({
          taskId: taskId as any,
          isCompleted: !isCompleted,
          actorId: currentUser._id,
        });
      } catch (error) {
        console.error("Failed to toggle task:", error);
      }
    }
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const priorityLabels = {
    high: "Hoch",
    medium: "Mittel",
    low: "Niedrig",
  };

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden bg-white">
      <Header onMenuClick={() => setIsSidebarOpen(true)} title="Workspace" />
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="px-4 mt-6">
        {/* Title & Subtitle */}
        <div className="mb-6 text-center max-w-md mx-auto">
          <p className="text-sm text-gray-500">
            Verwalte deine Gruppen, Aufgaben und Events an einem Ort.
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 bg-gray-100 rounded-full p-1 shadow-sm">
            <button
              onClick={() => scrollToSection(groupsRef)}
              className="px-4 py-2 text-sm font-semibold rounded-full transition-colors hover:text-gray-900 text-gray-700 active:scale-95"
            >
              Gruppen
            </button>
            <button
              onClick={() => scrollToSection(tasksRef)}
              className="px-4 py-2 text-sm font-semibold rounded-full transition-colors hover:text-gray-900 text-gray-700 active:scale-95"
            >
              Aufgaben
            </button>
            <button
              onClick={() => scrollToSection(eventsRef)}
              className="px-4 py-2 text-sm font-semibold rounded-full transition-colors hover:text-gray-900 text-gray-700 active:scale-95"
            >
              Events
            </button>
          </div>
        </div>

        {/* My Groups Section */}
        <section ref={groupsRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-900">Meine Gruppen</h2>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-2xl border border-slate-200 bg-white transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} /> Neue Gruppe
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {myGroups.map((group) => (
              <Link
                href={`/workspace/group_${group._id}`}
                key={group._id}
                className="border border-slate-100 p-4 rounded-2xl shadow-sm text-center bg-slate-50/50 cursor-pointer hover:shadow-md hover:bg-slate-50 transition-all block flex flex-col justify-between min-h-[140px]"
              >
                <div className="w-12 h-12 bg-white rounded-full mx-auto mb-3 flex items-center justify-center shadow-sm overflow-hidden border border-slate-100 text-2xl select-none">
                  {group.icon ? (
                    group.icon
                  ) : (
                    <Users size={20} className="text-slate-400" />
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1 mb-1">
                    {(group as any).displayName || "Gruppe"}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {group.participants.length} {group.participants.length === 1 ? "Mitglied" : "Mitglieder"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Tasks Section */}
        <section ref={tasksRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-900">Aufgaben</h2>
            <button
              onClick={() => setIsCreateTodoModalOpen(true)}
              className="flex items-center gap-1 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-2xl border border-slate-200 bg-white transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} /> Neues To-do
            </button>
          </div>

          {/* Task Filter Chips */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full max-w-full justify-start sm:justify-center px-1 py-0.5">
            {[
              { id: "all" as const, label: "Alle" },
              { id: "personal" as const, label: "Meine To-dos" },
              { id: "assigned" as const, label: "Mir zugewiesen" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setTaskFilter(chip.id)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                  taskFilter === chip.id
                    ? "bg-[#D08945] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Tasks List */}
          <div className="space-y-3">
            {displayedTasks.length > 0 ? (
              displayedTasks.map((task) => {
                const isPersonal = task.source === "personal";
                return (
                  <div
                    key={task._id}
                    onClick={() => {
                      if (isPersonal) {
                        setEditingTodo(task);
                      } else {
                        router.push(
                          `/workspace/group_${(task as any).groupId}?tab=tasks&taskId=${task._id}`
                        );
                      }
                    }}
                    className="text-sm text-slate-700 bg-slate-50/50 p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start gap-3 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-semibold text-slate-900 break-words leading-tight">
                          {task.title}
                        </span>
                      </div>
                      {task.dueDate && (
                        <span className="text-xs text-slate-500 block mb-2 font-medium">
                          Fällig: {new Date(task.dueDate).toLocaleDateString("de-DE")}
                        </span>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        {task.priority && (
                          <span
                            className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shadow-sm ${
                              task.priority === "high"
                                ? "bg-rose-50 text-rose-700 border border-rose-100"
                                : task.priority === "medium"
                                  ? "bg-amber-50 text-amber-700 border border-amber-100"
                                  : "bg-green-50 text-green-700 border border-green-100"
                            }`}
                          >
                            {priorityLabels[task.priority as keyof typeof priorityLabels]}
                          </span>
                        )}
                        <span
                          className={`text-xs font-semibold rounded-full px-2.5 py-0.5 shadow-sm truncate max-w-[140px] ${
                            isPersonal
                              ? "bg-purple-50 text-purple-700 border border-purple-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                          }`}
                        >
                          {isPersonal ? "Persönlich" : (task as any).groupName}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isPersonal ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTodo(
                                task._id,
                                (task as any).completed,
                              );
                            }}
                            className="p-2 hover:bg-green-50 rounded-xl transition-colors text-green-600 border border-transparent hover:border-green-100"
                            title="Als erledigt markieren"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTodo(task._id);
                            }}
                            className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-600 border border-transparent hover:border-red-100"
                            title="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/workspace/group_${(task as any).groupId}?tab=tasks&taskId=${task._id}`}
                          className="p-2 hover:bg-blue-50 rounded-xl transition-colors text-blue-600 border border-transparent hover:border-blue-100 flex items-center justify-center"
                          title="In Gruppe anzeigen"
                        >
                          <Check size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100">
                {taskFilter === "all" && "Keine Aufgaben vorhanden"}
                {taskFilter === "personal" && "Keine persönlichen To-dos vorhanden"}
                {taskFilter === "assigned" && "Keine zugewiesenen Aufgaben vorhanden"}
              </p>
            )}
          </div>
        </section>

        {/* Events Section */}
        <section ref={eventsRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="text-lg font-bold text-slate-900">Events</h2>
            <Link
              href="/calendar"
              className="flex items-center gap-1 px-3.5 py-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-2xl border border-slate-200 bg-white transition-all shadow-sm active:scale-95"
            >
              <Plus size={16} /> Event erstellen
            </Link>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto flex-nowrap [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden w-full max-w-full justify-start sm:justify-center px-1 py-0.5">
            {[
              { id: "all" as const, label: "Alle" },
              { id: "personal" as const, label: "Persönlich" },
              { id: "groups" as const, label: "Gruppen" },
              { id: "public" as const, label: "Öffentlich" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setEventFilter(chip.id)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-full whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                  eventFilter === chip.id
                    ? "bg-[#D08945] text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Events List */}
          <div className="space-y-3">
            {myEventsWithSource && myEventsWithSource.length > 0 ? (
              myEventsWithSource.map((event) => {
                const href = event.workspaceId
                  ? `/workspace/group_${event.workspaceId.replace("group_", "")}?tab=events`
                  : `/workspace/event_${event._id}`;
                const badgeType = event.source === "personal" ? "personal" : event.source === "public" ? "public" : "group";
                const badgeText = event.source === "personal" ? "Privat" : event.source === "public" ? "Öffentlich" : event.sourceName;

                return (
                  <EventCard
                    key={event._id}
                    title={event.title}
                    startTime={event.startTime}
                    endTime={event.endTime}
                    location={event.location}
                    description={event.description}
                    badgeText={badgeText}
                    badgeType={badgeType}
                    href={href}
                  />
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-8 bg-slate-50/50 rounded-2xl border border-slate-100">
                {eventFilter === "all" && "Keine bevorstehenden Events"}
                {eventFilter === "personal" && "Keine bevorstehenden persönlichen Events"}
                {eventFilter === "groups" && "Keine bevorstehenden Gruppen-Events"}
                {eventFilter === "public" && "Keine bevorstehenden öffentlichen Events"}
              </p>
            )}
          </div>
        </section>
      </div>

      <BottomNavigation />
      <CreateGroupModal
        isOpen={isCreateGroupModalOpen}
        onClose={() => setIsCreateGroupModalOpen(false)}
      />
      <PersonalTodoModal
        isOpen={isCreateTodoModalOpen || !!editingTodo}
        todo={editingTodo || undefined}
        onClose={() => {
          setIsCreateTodoModalOpen(false);
          setEditingTodo(null);
        }}
        onSuccess={() => {
          setIsCreateTodoModalOpen(false);
          setEditingTodo(null);
        }}
      />
    </main>
  );
}

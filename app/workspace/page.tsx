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
import { CreateGroupModal } from "@/components/workspace-create-group-modal";
import { PersonalTodoModal } from "@/components/personal-todo-modal";

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [isCreateTodoModalOpen, setIsCreateTodoModalOpen] = useState(false);
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
    if (currentUser && confirm("Delete this to-do?")) {
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

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden bg-white">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="px-4 mt-6">
        {/* Title & Subtitle */}
        <div className="mb-6 text-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold mb-1">Workspace</h1>
          <p className="text-sm text-gray-500">
            Manage your groups, tasks and events in one place.
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex justify-center mb-8">
          <div className="flex gap-2 bg-gray-100 rounded-full p-1">
            <button
              onClick={() => scrollToSection(groupsRef)}
              className="px-4 py-2 text-sm font-medium rounded-full transition-colors hover:text-gray-900 text-gray-700"
            >
              Groups
            </button>
            <button
              onClick={() => scrollToSection(tasksRef)}
              className="px-4 py-2 text-sm font-medium rounded-full transition-colors hover:text-gray-900 text-gray-700"
            >
              Tasks
            </button>
            <button
              onClick={() => scrollToSection(eventsRef)}
              className="px-4 py-2 text-sm font-medium rounded-full transition-colors hover:text-gray-900 text-gray-700"
            >
              Events
            </button>
          </div>
        </div>

        {/* My Groups Section */}
        <section ref={groupsRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">My Groups</h2>
            <button
              onClick={() => setIsCreateGroupModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Plus size={16} /> New Group
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {myGroups.map((group) => (
              <Link
                href={`/workspace/group_${group._id}`}
                key={group._id}
                className="border border-gray-100 p-3 rounded-xl shadow-sm text-center bg-gray-50 cursor-pointer hover:shadow-md transition-shadow block"
              >
                <div className="w-12 h-12 bg-white rounded-full mx-auto mb-2 flex items-center justify-center shadow-sm overflow-hidden border border-gray-100">
                  {(group as any).displayImage ? (
                    <img
                      src={(group as any).displayImage}
                      alt={(group as any).displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users size={20} className="text-gray-500" />
                  )}
                </div>
                <h3 className="text-sm font-medium line-clamp-1">
                  {(group as any).displayName || "Group"}
                </h3>
                <p className="text-xs text-gray-500">
                  {group.participants.length} members
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Tasks Section */}
        <section ref={tasksRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Tasks</h2>
            <button
              onClick={() => setIsCreateTodoModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Plus size={16} /> New To-Do
            </button>
          </div>

          {/* Task Filter Chips */}
          <div className="flex gap-2 mb-4 justify-center flex-wrap">
            {[
              { id: "all" as const, label: "All" },
              { id: "personal" as const, label: "My To-Dos" },
              { id: "assigned" as const, label: "Assigned to Me" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setTaskFilter(chip.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  taskFilter === chip.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg shadow-sm border border-gray-100 flex justify-between items-start gap-2 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {task.title}
                        </span>
                      </div>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500 block mb-1">
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      <div className="flex gap-1 flex-wrap">
                        {task.priority && (
                          <span
                            className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                              task.priority === "high"
                                ? "bg-red-100 text-red-700"
                                : task.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {task.priority.charAt(0).toUpperCase() +
                              task.priority.slice(1)}
                          </span>
                        )}
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 ${
                            isPersonal
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {isPersonal ? "Personal" : (task as any).groupName}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {isPersonal ? (
                        <>
                          <button
                            onClick={() =>
                              handleToggleTodo(
                                task._id,
                                (task as any).completed,
                              )
                            }
                            className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600"
                            title="Mark complete"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTodo(task._id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors text-red-600"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <Link
                          href={`/workspace/group_${(task as any).groupId}`}
                          className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors text-blue-600 flex items-center justify-center"
                          title="View in group"
                        >
                          <Check size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                {taskFilter === "all" && "No tasks"}
                {taskFilter === "personal" && "No personal to-dos"}
                {taskFilter === "assigned" && "No assigned tasks"}
              </p>
            )}
          </div>
        </section>

        {/* Events Section */}
        <section ref={eventsRef} className="mb-8 scroll-mt-16">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Events</h2>
            <Link
              href="/calendar"
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Plus size={16} /> Create Event
            </Link>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2 mb-4 justify-center flex-wrap">
            {[
              { id: "all" as const, label: "All" },
              { id: "personal" as const, label: "Personal" },
              { id: "groups" as const, label: "Groups" },
              { id: "public" as const, label: "Public" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setEventFilter(chip.id)}
                className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                  eventFilter === chip.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                const dateObj = new Date(event.startTime);
                const month = dateObj.toLocaleString("en-US", {
                  month: "short",
                });
                const day = dateObj.getDate();
                const eventTime = dateObj.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <Link
                    href={
                      event.workspaceId
                        ? `/workspace/group_${event.workspaceId.replace("group_", "")}`
                        : `/workspace/event_${event._id}`
                    }
                    key={event._id}
                    className="flex items-center gap-3 border border-gray-100 bg-gray-50 p-3 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow block"
                  >
                    <div className="w-12 h-12 bg-[#D18E4E] text-white rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs uppercase leading-none opacity-90">
                        {month}
                      </span>
                      <span className="text-lg font-bold leading-none mt-0.5">
                        {day}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1 gap-2">
                        <p className="text-xs text-gray-500 truncate">
                          {dateObj.toLocaleDateString()} · {eventTime}
                        </p>
                        <span
                          className={`text-xs font-medium rounded-full px-2 py-0.5 flex-shrink-0 ${
                            event.source === "personal"
                              ? "bg-purple-100 text-purple-700"
                              : event.source === "group"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {event.sourceName}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                {eventFilter === "all" && "No upcoming events"}
                {eventFilter === "personal" && "No upcoming personal events"}
                {eventFilter === "groups" && "No upcoming group events"}
                {eventFilter === "public" && "No upcoming public events"}
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
        isOpen={isCreateTodoModalOpen}
        onClose={() => setIsCreateTodoModalOpen(false)}
        onSuccess={() => setIsCreateTodoModalOpen(false)}
      />
    </main>
  );
}

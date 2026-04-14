"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, CheckCircle2, Circle, Clock } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";

export function WorkspaceTasks({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  // Note: We need a backend query for tasks by workspaceId. Let's assume we can fetch them or use dummy data for now
  // Since we haven't created listTasksByWorkspace yet, we will use local state to simulate it until added
  const pendingTasks = useQuery(api.workspace.listPendingTasksByUser, currentUser ? { userId: currentUser._id } : "skip");
  const createTask = useMutation(api.workspace.createTask);
  const toggleTask = useMutation(api.workspace.toggleTaskCompletion);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !currentUser) return;
    
    try {
      await createTask({
        workspaceId,
        title: newTaskTitle,
        deadline: "TBD",
        assigneeId: currentUser._id, // Auto assign for now
        createdBy: currentUser._id
      });
      setNewTaskTitle("");
    } catch (e) {
      console.error(e);
    }
  }

  // Filter tasks that belong to this workspace
  const tasks = pendingTasks?.filter(t => t.workspaceId === workspaceId) || [];

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <form onSubmit={handleCreateTask} className="flex gap-2 mb-6">
        <input 
           type="text" 
           placeholder="Add a new task..." 
           value={newTaskTitle}
           onChange={(e) => setNewTaskTitle(e.target.value)}
           className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#D08945]"
        />
        <button 
           type="submit" 
           disabled={!newTaskTitle.trim()}
           className="bg-[#D08945] text-white px-4 rounded-xl flex items-center justify-center disabled:opacity-50"
        >
           <Plus size={24} />
        </button>
      </form>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
            <ListTodoIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No tasks yet. Create one above!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task._id} className="flex items-start gap-3 p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <button 
                  onClick={() => toggleTask({ taskId: task._id, isCompleted: !task.isCompleted })}
                  className="mt-0.5 text-gray-400 hover:text-[#D08945] transition-colors"
                >
                  {task.isCompleted ? <CheckCircle2 size={22} className="text-[#D08945]" /> : <Circle size={22} />}
                </button>
                <div className="flex-1">
                  <h3 className={`text-sm font-medium ${task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <Clock size={12} /> {task.deadline || "No deadline"}
                  </div>
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ListTodoIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="6" height="6" rx="1" />
      <path d="m3 17 2 2 4-4" />
      <path d="M13 6h8" />
      <path d="M13 12h8" />
      <path d="M13 18h8" />
    </svg>
  );
}

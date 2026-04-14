"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { BottomNavigation } from "@/components/bottom-navigation";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { Plus, Calendar, Users, ListTodo } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import Link from "next/link";
import { CreateGroupModal } from "@/components/workspace-create-group-modal";

export default function WorkspacePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const { currentUser } = useCurrentUser();

  // Fetch Real Data via Convex
  const allConversations = useQuery(api.queries.getConversations, currentUser ? { userId: currentUser._id } : "skip");
  const rawEvents = useQuery(api.events.listByUser, currentUser ? { userId: currentUser._id } : "skip");
  const pendingTasksData = useQuery(api.workspace.listPendingTasksByUser, currentUser ? { userId: currentUser._id } : "skip");

  // Format Data
  const myGroups = allConversations?.filter(conv => conv.isGroup) || [];
  const myEvents = rawEvents || [];
  
  // Upcoming Events (startTime >= today or endTime >= today)
  const upcomingEvents = rawEvents?.filter(e => e.endTime >= Date.now())
                                  .sort((a,b) => a.startTime - b.startTime)
                                  .slice(0, 3) || [];
  // Pending Tasks
  const pendingTasks = pendingTasksData || [];

  return (
    <main className="min-h-screen w-full max-w-[428px] mx-auto pb-24 header-spacing overflow-x-hidden bg-white">
      <Header onMenuClick={() => setIsSidebarOpen(true)} />
      <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="px-4 mt-6">
        <h1 className="text-2xl font-bold mb-4">Workspace</h1>
        
        {/* Quick Actions */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 hide-scrollbar">
           <Link href="/calendar" className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors cursor-pointer">
             <Plus size={16} /> Create Event
           </Link>
           <button 
             onClick={() => setIsCreateGroupModalOpen(true)}
             className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors cursor-pointer"
           >
             <Users size={16} /> New Group
           </button>
           <button 
             onClick={() => alert("Please open a specific Workspace from the Dashboard below to add tasks.")}
             className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full text-sm font-medium whitespace-nowrap hover:bg-gray-200 transition-colors cursor-pointer"
           >
             <ListTodo size={16} /> Add Task
           </button>
        </div>

        {/* Today Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Today Overview</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
              <h3 className="font-medium text-orange-800 flex items-center gap-2 mb-2">
                <Calendar size={18} /> Upcoming Events
              </h3>
              <ul className="space-y-2">
                {upcomingEvents.length > 0 ? upcomingEvents.map(event => (
                  <li key={event._id} className="text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm border border-orange-50">
                    <span className="font-medium block text-gray-900">{event.title}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                )) : (
                  <li className="text-sm text-gray-500 py-2">No upcoming events.</li>
                )}
              </ul>
            </div>
            
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-medium text-blue-800 flex items-center gap-2 mb-2">
                <ListTodo size={18} /> Pending Tasks
              </h3>
              <ul className="space-y-2">
                {pendingTasks.length > 0 ? pendingTasks.map(task => (
                  <li key={task._id} className="text-sm text-gray-700 bg-white p-2 rounded-lg shadow-sm border border-blue-50 flex justify-between items-center cursor-pointer">
                    <div>
                      <span className="font-medium block text-gray-900">{task.title}</span>
                      <span className="text-xs text-gray-500">{task.deadline || "No deadline"}</span>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                  </li>
                )) : (
                  <li className="text-sm text-gray-500 py-2">No pending tasks. You're all caught up!</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {/* My Groups */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
             <h2 className="text-lg font-semibold">My Groups</h2>
             <span className="text-sm text-gray-500 cursor-pointer hover:underline">See all</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {myGroups.map(group => (
              <Link href={`/workspace/group_${group._id}`} key={group._id} className="border border-gray-100 p-3 rounded-xl shadow-sm text-center bg-gray-50 cursor-pointer hover:shadow-md transition-shadow block">
                 <div className="w-12 h-12 bg-white rounded-full mx-auto mb-2 flex items-center justify-center shadow-sm overflow-hidden border border-gray-100">
                    {(group as any).displayImage ? (
                      <img src={(group as any).displayImage} alt={(group as any).displayName} className="w-full h-full object-cover" />
                    ) : (
                      <Users size={20} className="text-gray-500" />
                    )}
                 </div>
                 <h3 className="text-sm font-medium line-clamp-1">{(group as any).displayName || "Group"}</h3>
                 <p className="text-xs text-gray-500">{group.participants.length} members</p>
              </Link>
            ))}
            <button 
                onClick={() => setIsCreateGroupModalOpen(true)}
                className="border border-dashed border-gray-300 p-3 rounded-xl text-center bg-transparent flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors"
            >
                 <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <Plus size={24} className="text-gray-400" />
                 </div>
                 <h3 className="text-sm font-medium text-gray-500">Create Group</h3>
            </button>
          </div>
        </section>

        {/* My Events */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
             <h2 className="text-lg font-semibold">My Events</h2>
             <span className="text-sm text-gray-500 cursor-pointer hover:underline">See all</span>
          </div>
          <div className="space-y-3">
            {myEvents.length > 0 ? myEvents.map(event => {
              const dateObj = new Date(event.startTime);
              const month = dateObj.toLocaleString('en-US', { month: 'short' });
              const day = dateObj.getDate();
              return (
                <Link href={`/workspace/event_${event._id}`} key={event._id} className="flex items-center gap-3 border border-gray-100 bg-gray-50 p-3 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow block">
                  <div className="w-12 h-12 bg-[#D18E4E] text-white rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs uppercase leading-none opacity-90">{month}</span>
                      <span className="text-lg font-bold leading-none mt-0.5">{day}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{event.title}</h3>
                    <p className="text-xs text-gray-500 truncate">{dateObj.toLocaleDateString()}</p>
                  </div>
                </Link>
              );
            }) : (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-xl border border-gray-100">No events joined.</p>
            )}
          </div>
        </section>

      </div>
      
      <BottomNavigation />
      <CreateGroupModal isOpen={isCreateGroupModalOpen} onClose={() => setIsCreateGroupModalOpen(false)} />
    </main>
  );
}

"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ListTodo, Folder, Users, BarChart2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WorkspaceTasks } from "@/components/workspace-tasks";
import { WorkspaceFiles } from "@/components/workspace-files";
import { WorkspacePolls } from "@/components/workspace-polls";
import { WorkspaceMembers } from "@/components/workspace-members";
import Link from "next/link";

export default function WorkspaceHubPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "tasks" | "files" | "polls" | "members">("chat");

  // Determine if it's an event or group based on prefix
  const isEvent = workspaceId.startsWith("event_");
  const isGroup = workspaceId.startsWith("group_");
  
  const entityId = workspaceId.replace("event_", "").replace("group_", "");

  // Render proper tab content based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
             <MessageSquare size={48} className="text-[#D08945] opacity-50 mb-4" />
             <p className="mb-4 text-sm text-gray-600">The chat for this workspace is directly integrated into your messages.</p>
             <Link 
               href={`/chat/${entityId}`}
               className="bg-[#D08945] text-white px-6 py-3 rounded-full font-medium hover:bg-[#b07335] transition-colors shadow-sm"
             >
               Open Full Chat
             </Link>
          </div>
        );
      case "tasks":
        return <WorkspaceTasks workspaceId={workspaceId} />;
      case "files":
        return <WorkspaceFiles workspaceId={workspaceId} />;
      case "polls":
        return <WorkspacePolls workspaceId={workspaceId} />;
      case "members":
        return <WorkspaceMembers workspaceId={workspaceId} />;
      default:
        return null;
    }
  };

  return (
    <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white relative">
      {/* Header */}
      <div 
        className="flex items-center px-4 py-3 bg-white border-b border-gray-100 z-10 sticky top-0"
        style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}
      >
        <button onClick={() => router.back()} className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="font-bold text-lg truncate">
          {isEvent ? "Collaboration Event" : "Collaboration Group"}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-gray-100 px-2 py-1 sticky" style={{ top: `calc(3.5rem + env(safe-area-inset-top, 0px))` }}>
        <button 
          onClick={() => setActiveTab("chat")}
          className={`flex-shrink-0 px-4 py-2 mx-1 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "chat" ? "bg-[#D08945] text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <MessageSquare size={16} /> Chat
        </button>
        <button 
          onClick={() => setActiveTab("tasks")}
          className={`flex-shrink-0 px-4 py-2 mx-1 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "tasks" ? "bg-[#D08945] text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <ListTodo size={16} /> Tasks
        </button>
        <button 
          onClick={() => setActiveTab("files")}
          className={`flex-shrink-0 px-4 py-2 mx-1 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "files" ? "bg-[#D08945] text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <Folder size={16} /> Files
        </button>
        <button 
          onClick={() => setActiveTab("polls")}
          className={`flex-shrink-0 px-4 py-2 mx-1 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "polls" ? "bg-[#D08945] text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <BarChart2 size={16} /> Polls
        </button>
        <button 
          onClick={() => setActiveTab("members")}
          className={`flex-shrink-0 px-4 py-2 mx-1 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "members" ? "bg-[#D08945] text-white" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <Users size={16} /> Members
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {renderTabContent()}
      </div>
    </main>
  );
}

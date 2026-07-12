"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ListTodo, Folder, Users, BarChart2, Calendar } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WorkspaceTasks } from "@/components/workspace-tasks";
import { WorkspaceFiles } from "@/components/workspace-files";
import { WorkspacePolls } from "@/components/workspace-polls";
import { WorkspaceMembers } from "@/components/workspace-members";
import { WorkspaceEvents } from "@/components/workspace-events";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useMutation } from "convex/react";
import Link from "next/link";

export default function WorkspaceHubPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"chat" | "tasks" | "files" | "polls" | "members" | "events">("chat");
  const { currentUser } = useCurrentUser();
  const getOrCreateEventChat = useMutation(api.workspace.getOrCreateEventChat);
  const groupDisplay = useQuery(api.queries.getConversationDisplay, workspaceId.startsWith("group_") ? { conversationId: workspaceId.replace("group_", "") as Id<"conversations"> } : "skip");
  const groupMembers = useQuery(api.queries.getConversationMembers, workspaceId.startsWith("group_") ? { conversationId: workspaceId.replace("group_", "") as Id<"conversations"> } : "skip");
  const [isNavigating, setIsNavigating] = useState(false);

  // Determine if it's an event or group based on prefix
  const isEvent = workspaceId.startsWith("event_");
  const isGroup = workspaceId.startsWith("group_");

  const entityId = workspaceId.replace("event_", "").replace("group_", "");

  const handleOpenChat = async () => {
    if (isGroup) {
      router.push(`/chat/${entityId}`);
    } else if (isEvent && currentUser) {
      setIsNavigating(true);
      try {
        const conversationId = await getOrCreateEventChat({
          eventId: entityId as Id<"events">,
          userId: currentUser._id,
        });
        router.push(`/chat/${conversationId}`);
      } catch (error) {
        console.error("Failed to open event chat", error);
        alert("Failed to open chat. Please try again later.");
        setIsNavigating(false);
      }
    }
  };

  // Render proper tab content based on activeTab
  const renderTabContent = () => {
    switch (activeTab) {
      case "chat":
        return (
          <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center h-full">
            <MessageSquare size={48} className="text-[#D08945] opacity-50 mb-4" />
            <p className="mb-4 text-sm text-muted-foreground">The chat for this workspace is directly integrated into your messages.</p>
            <button
              onClick={handleOpenChat}
              disabled={isNavigating}
              className="bg-[#D08945] text-white px-6 py-3 rounded-full font-medium hover:bg-[#b07335] transition-colors shadow-sm disabled:opacity-75"
            >
              {isNavigating ? "Opening..." : "Open Full Chat"}
            </button>
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
      case "events":
        return isGroup ? <WorkspaceEvents workspaceId={workspaceId} /> : null;
      default:
        return null;
    }
  };

  return (
    <main className="flex flex-col h-screen w-full max-w-[428px] md:max-w-3xl mx-auto bg-background relative">
      {/* Header */}
      <div
        className="flex flex-col gap-1 px-4 py-3 bg-background border-b border-border z-10 sticky top-0"
        style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}
      >
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-3 p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">
              {isGroup ? groupDisplay?.displayName || "Collaboration Group" : isEvent ? "Collaboration Event" : "Workspace"}
            </h1>
            <p className="text-sm text-muted-foreground truncate">
              {isGroup ? `${groupMembers?.length ?? 0} members · Group workspace` : isEvent ? "Event workspace" : "Workspace hub"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border px-3 py-2 sticky top-[calc(4.5rem+env(safe-area-inset-top,0px))] bg-background z-10">
        <button
          onClick={() => setActiveTab("chat")}
          className={`min-w-[86px] px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center justify-center gap-2 ${activeTab === "chat" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <MessageSquare size={16} /> Chat
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "tasks" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <ListTodo size={16} /> Tasks
        </button>
        <button
          onClick={() => setActiveTab("files")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "files" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Folder size={16} /> Files
        </button>
        <button
          onClick={() => setActiveTab("polls")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "polls" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <BarChart2 size={16} /> Polls
        </button>
        <button
          onClick={() => setActiveTab("members")}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "members" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
        >
          <Users size={16} /> Members
        </button>
        {isGroup && (
          <button
            onClick={() => setActiveTab("events")}
            className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-full transition-colors flex items-center gap-2 ${activeTab === "events" ? "bg-[#D08945] text-white" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Calendar size={16} /> Events
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-muted">
        {renderTabContent()}
      </div>
    </main>
  );
}

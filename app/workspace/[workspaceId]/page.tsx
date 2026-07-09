"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, ListTodo, Folder, Users, BarChart2, Calendar, Layout, Info } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { WorkspaceTasks } from "@/components/workspace-tasks";
import { WorkspaceFiles } from "@/components/workspace-files";
import { WorkspacePolls } from "@/components/workspace-polls";
import { WorkspaceMembers } from "@/components/workspace-members";
import { WorkspaceGroupInfoEnhanced } from "@/components/workspace-group-info-enhanced";
import { WorkspaceEvents } from "@/components/workspace-events";
import { WorkspaceOverview } from "@/components/workspace-overview";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useMutation } from "convex/react";
import Link from "next/link";

export default function WorkspaceHubPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "chat" | "tasks" | "files" | "polls" | "group-info" | "events">("overview");
  const { currentUser } = useCurrentUser();
  const getOrCreateEventChat = useMutation(api.workspace.getOrCreateEventChat);
  
  // Determine if it's an event or group based on prefix
  const isEvent = workspaceId.startsWith("event_");
  const isGroup = workspaceId.startsWith("group_");
  
  const groupId = workspaceId.replace("group_", "") as Id<"conversations">;
  const eventId = workspaceId.replace("event_", "") as Id<"events">;
  
  const groupDisplay = useQuery(api.queries.getConversationDisplay, isGroup ? { conversationId: groupId } : "skip");
  const groupMembers = useQuery(api.queries.getConversationMembers, isGroup ? { conversationId: groupId } : "skip");
  
  // For events, fetch the event to get its group relationship
  const eventData = useQuery(
    api.events.getById,
    isEvent ? { eventId } : "skip"
  );
  
  // If event belongs to a group, fetch that group
  const eventGroupId = eventData?.workspaceId?.replace("group_", "") as Id<"conversations"> | undefined;
  const eventGroup = useQuery(
    api.queries.getConversationDisplay,
    eventGroupId ? { conversationId: eventGroupId } : "skip"
  );
  
  const [isNavigating, setIsNavigating] = useState(false);

  const handleOpenChat = async () => {
    if (isGroup) {
      router.push(`/chat/${groupId}`);
    } else if (isEvent && currentUser) {
      setIsNavigating(true);
      try {
        const conversationId = await getOrCreateEventChat({
          eventId,
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
      case "overview":
        return <WorkspaceOverview workspaceId={workspaceId} onTabChange={setActiveTab} />;
      case "chat":
        return (
          <div className="p-8 text-center text-gray-500 flex flex-col items-center justify-center h-full">
             <MessageSquare size={48} className="text-[#D08945] opacity-50 mb-4" />
             <p className="mb-4 text-sm text-gray-600">The chat for this workspace is directly integrated into your messages.</p>
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
      case "group-info":
        return isGroup ? <WorkspaceGroupInfoEnhanced workspaceId={workspaceId} onBackToOverview={() => setActiveTab("overview")} /> : <WorkspaceMembers workspaceId={workspaceId} />;
      case "events":
        return isGroup ? <WorkspaceEvents workspaceId={workspaceId} /> : null;
      // Backward compatibility: map "members" to "group-info"
      case "members" as any:
        return isGroup ? <WorkspaceGroupInfoEnhanced workspaceId={workspaceId} onBackToOverview={() => setActiveTab("overview")} /> : <WorkspaceMembers workspaceId={workspaceId} />;
      default:
        return null;
    }
  };

  return (
    <main className="flex flex-col h-screen w-full max-w-[428px] mx-auto bg-white relative">
      {/* Header */}
      <div 
        className="flex flex-col gap-1 px-4 py-3 bg-white border-b border-gray-100 z-10 sticky top-0"
        style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}
      >
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-3 p-2 -ml-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} />
          </button>
          <div className="min-w-0">
            <h1 className="font-bold text-lg truncate">
              {isGroup ? groupDisplay?.displayName || "Collaboration Group" : isEvent ? eventData?.title || "Event" : "Workspace"}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {isGroup ? `${groupMembers?.length ?? 0} members · Group workspace` : isEvent ? (eventGroup ? `${eventGroup.displayName} · Event` : "Event workspace") : "Workspace hub"}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs - REMOVED: Using Overview function boxes as primary navigation */}
      {/* This navigation was redundant with the function boxes in Overview */}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {renderTabContent()}
      </div>
    </main>
  );
}

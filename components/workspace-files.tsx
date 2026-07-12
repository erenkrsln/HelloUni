"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Plus, FileText, Image as ImageIcon, Download, FileIcon } from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";

export function WorkspaceFiles({ workspaceId }: { workspaceId: string }) {
  const { currentUser } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const files = useQuery(api.workspace.listFilesByWorkspace, { workspaceId });
  const generateUploadUrl = useMutation(api.workspace.generateUploadUrl);
  const saveFileMetadata = useMutation(api.workspace.saveFileMetadata);
  const toast = useToast();

  const [localFiles, setLocalFiles] = useState<any[] | null>(null);

  // merge query files into localFiles when available
  if (files && !localFiles) setLocalFiles(files.slice());

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      setIsUploading(true);
      // Use mock upload when explicitly enabled via NEXT_PUBLIC_USE_MOCK_UPLOAD (set in .env.local)
      const useMock = typeof process !== "undefined" && (process.env.NEXT_PUBLIC_USE_MOCK_UPLOAD === "true");
      let postUrl: string;
      if (useMock) {
        const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        postUrl = `/api/mock-storage?key=${encodeURIComponent(key)}`;
      } else {
        // If this is a group workspace, extract conversation id and pass as conversationId
        const isGroup = workspaceId.startsWith("group_");
        const conversationId = isGroup ? (workspaceId.replace("group_", "") as any) : undefined;
        postUrl = await generateUploadUrl({ conversationId, actorId: currentUser._id });
      }

      // POST file bytes to the received upload URL
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();

      // Optimistically show the file locally (use object URL for preview)
      const tempId = `tmp_file_${Date.now()}`;
      const tempFile = { _id: tempId, fileName: file.name, fileType: file.type, url: URL.createObjectURL(file), uploaderId: currentUser._id, createdAt: Date.now(), storageId };
      setLocalFiles((prev) => prev ? [tempFile, ...prev] : [tempFile]);

      // Delay saving metadata to allow undo
      const DURATION = 5000;
      let completed = false;

      const doSave = async () => {
        try {
          await saveFileMetadata({ workspaceId, storageId, fileName: file.name, fileType: file.type, uploaderId: currentUser._id });
          completed = true;
          toast.success("File uploaded");
        } catch (err) {
          console.error("Failed to save file metadata:", err);
          setLocalFiles((prev) => prev ? prev.filter((f) => f._id !== tempId) : prev);
          toast.error("Failed to register file. Reverted.");
        }
      };

      const undo = () => {
        clearTimeout(timer);
        if (!completed) setLocalFiles((prev) => prev ? prev.filter((f) => f._id !== tempId) : prev);
        toast.remove(toastId);
      };

      const toastId = toast.push({ message: `Upload ${file.name}`, type: "info", action: { label: "Undo", onClick: undo }, duration: DURATION });
      const timer = setTimeout(async () => {
        await doSave();
        try { toast.remove(toastId); } catch {}
      }, DURATION);

    } catch (error) {
      console.error("Failed to upload file:", error);
      toast.error("Fehler beim Hochladen der Datei.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const renderFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <ImageIcon size={24} className="text-blue-500" />;
    if (fileType.includes("pdf")) return <FileText size={24} className="text-red-500" />;
    return <FileIcon size={24} className="text-muted-foreground" />;
  };

  return (
    <div className="p-4 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-semibold text-lg">Shared Files</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="bg-[#D08945] text-white px-4 py-2 rounded-full flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-medium hover:bg-[#b07335] transition-colors"
        >
          <Plus size={18} /> {isUploading ? "Uploading..." : "Upload File"}
        </button>
        <input 
          type="file" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {!files ? (
          <div className="col-span-2 text-center text-muted-foreground p-8">Loading files...</div>
        ) : files.length === 0 ? (
          <div className="col-span-2 text-center py-12 text-muted-foreground bg-card rounded-xl border border-border border-dashed">
            <FolderPlusIcon className="w-12 h-12 mx-auto mb-2 opacity-20 text-[#D08945]" />
            <p>No files uploaded yet.</p>
          </div>
        ) : (
          (localFiles || files).map(file => (
            <a 
              key={file._id} 
              href={file.url || file.url || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col items-center text-center gap-2 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                {renderFileIcon(file.fileType)}
              </div>
              <span className="text-sm font-medium text-foreground line-clamp-1 w-full" title={file.fileName}>
                {file.fileName}
              </span>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Download size={12} className="mr-1" /> View
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 10v6"/>
      <path d="M9 13h6"/>
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>
    </svg>
  );
}

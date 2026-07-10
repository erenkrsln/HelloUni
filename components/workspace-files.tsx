"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Plus,
  FileText,
  Image as ImageIcon,
  Download,
  FileIcon,
  Trash2,
} from "lucide-react";
import { useCurrentUser } from "@/lib/hooks/useCurrentUser";
import { useToast } from "@/components/toast";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SectionHeader } from "@/components/section-header";

export function WorkspaceFiles({
  workspaceId,
  onBackToOverview,
}: {
  workspaceId: string;
  onBackToOverview?: () => void;
}) {
  const { currentUser } = useCurrentUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingFileName, setDeletingFileName] = useState("");
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  const files = useQuery(api.workspace.listFilesByWorkspace, { workspaceId });
  const generateUploadUrl = useMutation(api.workspace.generateUploadUrl);
  const saveFileMetadata = useMutation(api.workspace.saveFileMetadata);
  const deleteFile = useMutation(api.workspace.deleteFile);
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
      const useMock =
        typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_USE_MOCK_UPLOAD === "true";
      let postUrl: string;
      if (useMock) {
        const key = `uploads/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        postUrl = `/api/mock-storage?key=${encodeURIComponent(key)}`;
      } else {
        // If this is a group workspace, extract conversation id and pass as conversationId
        const isGroup = workspaceId.startsWith("group_");
        const conversationId = isGroup
          ? (workspaceId.replace("group_", "") as any)
          : undefined;
        postUrl = await generateUploadUrl({
          conversationId,
          actorId: currentUser._id,
        });
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
      const tempFile = {
        _id: tempId,
        fileName: file.name,
        fileType: file.type,
        url: URL.createObjectURL(file),
        uploaderId: currentUser._id,
        createdAt: Date.now(),
        storageId,
      };
      setLocalFiles((prev) => (prev ? [tempFile, ...prev] : [tempFile]));

      // Delay saving metadata to allow undo
      const DURATION = 5000;
      let completed = false;

      const doSave = async () => {
        try {
          await saveFileMetadata({
            workspaceId,
            storageId,
            fileName: file.name,
            fileType: file.type,
            uploaderId: currentUser._id,
          });
          completed = true;
          toast.success("File uploaded");
        } catch (err) {
          console.error("Failed to save file metadata:", err);
          setLocalFiles((prev) =>
            prev ? prev.filter((f) => f._id !== tempId) : prev,
          );
          toast.error("Failed to register file. Reverted.");
        }
      };

      const undo = () => {
        clearTimeout(timer);
        if (!completed)
          setLocalFiles((prev) =>
            prev ? prev.filter((f) => f._id !== tempId) : prev,
          );
        toast.remove(toastId);
      };

      const toastId = toast.push({
        message: `Upload ${file.name}`,
        type: "info",
        action: { label: "Undo", onClick: undo },
        duration: DURATION,
      });
      const timer = setTimeout(async () => {
        await doSave();
        try {
          toast.remove(toastId);
        } catch {}
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
    if (fileType.startsWith("image/"))
      return <ImageIcon size={24} className="text-blue-500" />;
    if (fileType.includes("pdf"))
      return <FileText size={24} className="text-red-500" />;
    return <FileIcon size={24} className="text-gray-500" />;
  };

  const handleDeleteFile = async () => {
    if (!deletingFileId || !currentUser) return;

    try {
      setIsDeletingFile(true);
      await deleteFile({
        fileId: deletingFileId as any,
        userId: currentUser._id,
        workspaceId,
      });

      setLocalFiles((prev) =>
        prev ? prev.filter((f) => f._id !== deletingFileId) : prev,
      );

      toast.success("File deleted");
      setDeletingFileId(null);
      setDeletingFileName("");
    } catch (error: any) {
      console.error("Failed to delete file:", error);
      toast.error(error.message || "Failed to delete file");
    } finally {
      setIsDeletingFile(false);
    }
  };

  const canDeleteFile = (file: any) => {
    return currentUser && file.uploaderId === currentUser._id;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-6">
      <div className="max-w-lg mx-auto space-y-4">
        {onBackToOverview && (
          <SectionHeader
            title="Files"
            subtitle="Shared files and documents"
            onBackClick={onBackToOverview}
          />
        )}

        <div className="mb-6 flex justify-between items-center">
          {!onBackToOverview && (
            <h2 className="font-semibold text-lg">Shared Files</h2>
          )}
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
            <div className="col-span-2 text-center text-gray-500 p-8">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100 border-dashed">
              <FolderPlusIcon className="w-12 h-12 mx-auto mb-2 opacity-20 text-[#D08945]" />
              <p>No files uploaded yet.</p>
            </div>
          ) : (
            (localFiles || files).map((file) => (
              <div
                key={file._id}
                className="group bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow relative"
              >
                <a
                  href={file.url || file.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center text-center gap-2"
                >
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center">
                    {renderFileIcon(file.fileType)}
                  </div>
                  <span
                    className="text-sm font-medium text-gray-800 line-clamp-1 w-full"
                    title={file.fileName}
                  >
                    {file.fileName}
                  </span>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Download size={12} className="mr-1" /> View
                  </div>
                </a>

                {canDeleteFile(file) && (
                  <button
                    onClick={() => {
                      setDeletingFileId(file._id);
                      setDeletingFileName(file.fileName);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-red-50 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100"
                    title="Delete file"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {deletingFileId && (
        <ConfirmationDialog
          isOpen={!!deletingFileId}
          onClose={() => {
            setDeletingFileId(null);
            setDeletingFileName("");
          }}
          onConfirm={handleDeleteFile}
          title="Delete File?"
          description={`Delete "${deletingFileName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          isDangerous={true}
          isLoading={isDeletingFile}
        />
      )}
    </div>
  );
}

function FolderPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 10v6" />
      <path d="M9 13h6" />
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}

// In-memory mock file storage for development
interface StoredFile {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  uploadedAt: number;
}

const fileStore = new Map<string, StoredFile>();

export function storeMockFile(
  storageId: string,
  buffer: Buffer,
  contentType: string,
  fileName: string,
): void {
  fileStore.set(storageId, {
    buffer,
    contentType,
    fileName,
    uploadedAt: Date.now(),
  });
}

export function getMockFile(storageId: string): StoredFile | undefined {
  return fileStore.get(storageId);
}

export function deleteMockFile(storageId: string): boolean {
  return fileStore.delete(storageId);
}

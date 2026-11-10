"use client";

import { File as FileIcon, Loader2, X } from "lucide-react";

export function AttachmentPreview({
  file,
  previewUrl,
  isUploading,
  uploadProgress,
  onRemove,
}: {
  file: File;
  previewUrl: string | null;
  isUploading: boolean;
  uploadProgress: number;
  onRemove: () => void;
}) {
  return (
    <div className="relative self-start ml-4 mt-3 mb-1 rounded-2xl overflow-hidden bg-surface border border-border inline-flex items-center justify-center">
      {previewUrl ? (
        <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover" />
      ) : (
        <div className="p-4 flex flex-col items-center justify-center w-24 h-24 text-muted">
          <FileIcon className="w-7 h-7 mb-2 text-accent" />
          <span className="text-[11px] max-w-[80px] truncate text-center">{file.name}</span>
        </div>
      )}

      {!isUploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md hover:bg-danger rounded-full text-white transition-all shadow-md"
          title="Remove file"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
          <Loader2 className="w-6 h-6 animate-spin text-accent" />
          <span className="text-[10px] font-bold font-mono text-accent">{uploadProgress}%</span>
        </div>
      )}
    </div>
  );
}

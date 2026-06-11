"use client";

import { useRef, useState } from "react";
import { uploadProductPhoto } from "@crafted/shared";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { errorMessage } from "@/lib/useAsync";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Drag-and-drop / file-picker photo upload. Uploads via the shared
 * uploadProductPhoto helper and reports back the public URL.
 */
export function PhotoUpload({
  folder,
  value,
  onChange,
  label,
}: {
  folder: "styles" | "variants";
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadProductPhoto(getSupabaseBrowserClient(), file, {
        folder,
        fileName: file.name,
        contentType: file.type || "image/jpeg",
      });
      onChange(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-1">
      {label ? (
        <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{label}</span>
      ) : null}
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragOver
            ? "border-amber-500 bg-amber-50 dark:bg-amber-950/40"
            : "border-stone-300 hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-600"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Uploaded photo preview"
            className="h-20 w-20 shrink-0 rounded-lg border border-stone-200 object-cover dark:border-stone-800"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500">
            {uploading ? (
              <Spinner size="md" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8" aria-hidden="true">
                <path
                  d="M4 17l4.5-4.5a1.5 1.5 0 0 1 2 0L15 17m-2-2 1.5-1.5a1.5 1.5 0 0 1 2 0L20 17M4 5h16v14H4V5Zm10 4h.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
        <div className="min-w-0 flex-1 text-sm">
          {uploading ? (
            <p className="text-stone-500 dark:text-stone-400">Uploading…</p>
          ) : (
            <>
              <p className="font-medium text-stone-700 dark:text-stone-300">
                {value ? "Replace photo" : "Upload a photo"}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Drag and drop, or click to browse
              </p>
            </>
          )}
          {value && !uploading ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="mt-1 text-xs font-medium text-rose-600 hover:underline dark:text-rose-400"
            >
              Remove photo
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p> : null}
    </div>
  );
}

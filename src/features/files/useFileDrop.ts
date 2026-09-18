import { useEffect, useState } from "react";
import { isTauri } from "@/platform";

/**
 * Drag-and-drop import. Inside Tauri the webview delivers native paths via
 * the drag-drop event; in the browser the HTML5 DataTransfer files are used.
 */
export function useFileDrop(onPaths: (paths: string[]) => void, onFiles: (files: File[]) => void) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: (() => void) | null = null;
    let cancelled = false;
    void import("@tauri-apps/api/webview").then(({ getCurrentWebview }) =>
      getCurrentWebview()
        .onDragDropEvent((event) => {
          const p = event.payload;
          if (p.type === "enter" || p.type === "over") setDragging(true);
          else if (p.type === "leave") setDragging(false);
          else if (p.type === "drop") {
            setDragging(false);
            if (p.paths.length) onPaths(p.paths);
          }
        })
        .then((fn) => {
          if (cancelled) fn();
          else unlisten = fn;
        }),
    );
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [onPaths]);

  const browserHandlers = isTauri()
    ? {}
    : {
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(true);
        },
        onDragLeave: () => setDragging(false),
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setDragging(false);
          const files = Array.from(e.dataTransfer.files);
          if (files.length) onFiles(files);
        },
      };

  return { dragging, browserHandlers };
}

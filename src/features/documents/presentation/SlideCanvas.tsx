import { cn } from "@/lib/utils";
import { SLIDE_HEIGHT, SLIDE_WIDTH, type Slide, type SlideElement } from "./model";

/**
 * Renders a slide at any width; all sizes scale with `width / SLIDE_WIDTH`.
 * `onSelect` / `onPointerDown` make it interactive in the editor.
 */
export function SlideCanvas({
  slide,
  width,
  selectedId,
  onPointerDownElement,
  onPointerDownResize,
  onBackgroundClick,
  className,
}: {
  slide: Slide;
  width: number;
  selectedId?: string | null;
  onPointerDownElement?: (el: SlideElement, e: React.PointerEvent) => void;
  onPointerDownResize?: (el: SlideElement, e: React.PointerEvent) => void;
  onBackgroundClick?: () => void;
  className?: string;
}) {
  const scale = width / SLIDE_WIDTH;
  const height = SLIDE_HEIGHT * scale;
  const interactive = !!onPointerDownElement;
  return (
    <div
      className={cn("relative overflow-hidden bg-white text-[#1f2937] shadow-sm", className)}
      style={{ width, height, backgroundColor: slide.background ?? "#ffffff" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onBackgroundClick?.();
      }}
      role={interactive ? "group" : undefined}
    >
      {slide.elements.map((el) => {
        const style: React.CSSProperties = {
          position: "absolute",
          left: `${el.x}%`,
          top: `${el.y}%`,
          width: `${el.w}%`,
          height: `${el.h}%`,
          cursor: interactive ? "move" : undefined,
        };
        const selected = selectedId === el.id;
        return (
          <div
            key={el.id}
            style={style}
            className={cn(interactive && "outline-offset-2", selected && "outline outline-2 outline-blue-500")}
            onPointerDown={(e) => {
              e.stopPropagation();
              onPointerDownElement?.(el, e);
            }}
            data-testid="slide-element"
          >
            {el.kind === "text" && (
              <div
                className="h-full w-full overflow-hidden whitespace-pre-wrap break-words leading-tight"
                style={{ fontSize: (el.fontSize ?? 28) * scale, fontWeight: el.bold ? 700 : 400, textAlign: el.align ?? "left", color: el.color ?? "#1f2937", padding: 4 * scale }}
              >
                {el.text}
              </div>
            )}
            {el.kind === "image" && el.src && <img src={el.src} alt="" className="h-full w-full object-contain" draggable={false} />}
            {el.kind === "shape" &&
              (el.shape === "line" ? (
                <div style={{ position: "absolute", top: "50%", left: 0, right: 0, borderTop: `${Math.max(1, 3 * scale)}px solid ${el.stroke ?? "#374151"}` }} />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden text-center"
                  style={{ backgroundColor: el.fill ?? "#dbeafe", border: `${Math.max(1, 2 * scale)}px solid ${el.stroke ?? "#3b82f6"}`, borderRadius: el.shape === "ellipse" ? "50%" : 6 * scale, fontSize: (el.fontSize ?? 20) * scale, color: el.color ?? "#1f2937" }}
                >
                  {el.text}
                </div>
              ))}
            {interactive && selected && (
              <div
                className="absolute -bottom-1.5 -right-1.5 size-3 cursor-nwse-resize rounded-sm border border-white bg-blue-500"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onPointerDownResize?.(el, e);
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, RotateCw } from "lucide-react";
import type { MeshStats } from "@/lib/print-quote/mesh";
import { createGL, drawMesh, loadMesh, VIEWS, type GL } from "./mesh-gl";

type ViewName = keyof typeof VIEWS;

export function ModelViewer({ tri, stats }: { tri: Float32Array; stats: MeshStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GL | null>(null);
  const view = useRef({ rx: VIEWS["3D"][0] as number, ry: VIEWS["3D"][1] as number, zoom: 1 });
  const [active, setActive] = useState<ViewName>("3D");
  const [noGL, setNoGL] = useState(false);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.width = cv.clientWidth * 2;
    cv.height = cv.clientHeight * 2;
    const G = createGL(cv);
    if (!G) {
      setNoGL(true);
      return;
    }
    glRef.current = G;
    loadMesh(G, tri, stats);
    drawMesh(G, view.current.rx, view.current.ry, view.current.zoom);

    let down = false, px = 0, py = 0;
    const redraw = () => drawMesh(G, view.current.rx, view.current.ry, view.current.zoom);
    const onDown = (e: PointerEvent) => {
      down = true;
      px = e.clientX;
      py = e.clientY;
      cv.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      view.current.ry += (e.clientX - px) * 0.01;
      view.current.rx += (e.clientY - py) * 0.01;
      px = e.clientX;
      py = e.clientY;
      redraw();
    };
    const onUp = () => (down = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      view.current.zoom = Math.min(3, Math.max(0.4, view.current.zoom - e.deltaY * 0.001));
      redraw();
    };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("wheel", onWheel);
      G.gl.deleteBuffer(G.buf);
      glRef.current = null;
    };
  }, [tri, stats]);

  function setView(name: ViewName) {
    setActive(name);
    view.current.rx = VIEWS[name][0];
    view.current.ry = VIEWS[name][1];
    if (glRef.current) drawMesh(glRef.current, view.current.rx, view.current.ry, view.current.zoom);
  }

  return (
    <div className="relative h-[270px] bg-[#f7f8f9] [background-image:linear-gradient(#eef0f2_1px,transparent_1px),linear-gradient(90deg,#eef0f2_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="absolute left-2.5 top-2.5 z-10 flex" role="group" aria-label="มุมมอง">
        {(Object.keys(VIEWS) as ViewName[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={active === v}
            className={`-mr-px border border-navy px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${
              active === v ? "bg-navy text-white" : "bg-white text-navy"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing"
        aria-label="ตัวอย่างโมเดล 3D ลากเพื่อหมุน"
      />
      {noGL && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted">เบราว์เซอร์นี้แสดง 3D ไม่ได้</p>
      )}
      <span className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1 border border-[#d9dcdf] bg-white px-2 py-0.5 text-[11.5px] text-forge">
        <Maximize2 className="h-3 w-3" aria-hidden />
        {stats.size.map((n) => n.toFixed(1)).join(" × ")} มม.
      </span>
      <span className="absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] text-muted">
        <RotateCw className="h-3 w-3" aria-hidden />
        ลากเพื่อหมุน · ล้อเมาส์ซูม
      </span>
    </div>
  );
}

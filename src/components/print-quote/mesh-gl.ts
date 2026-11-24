"use client";

import type { MeshStats } from "@/lib/print-quote/mesh";

/** Minimal WebGL2 mesh renderer: flat-shaded grey part, orthographic view, depth-tested. */
export type GL = {
  gl: WebGL2RenderingContext;
  R: WebGLUniformLocation | null;
  k: WebGLUniformLocation | null;
  c: WebGLUniformLocation | null;
  loc: number;
  buf: WebGLBuffer | null;
  count: number;
  size: number;
};

const VS = `#version 300 es
in vec3 p;uniform mat3 R;uniform vec3 c;uniform vec3 k;out vec3 v;
void main(){vec3 q=R*(p-c);v=q;gl_Position=vec4(q.x*k.x,q.y*k.y,-q.z*k.z,1.);}`;
const FS = `#version 300 es
precision highp float;in vec3 v;out vec4 o;
void main(){vec3 n=normalize(cross(dFdx(v),dFdy(v)));float d=abs(dot(n,normalize(vec3(.4,.5,.75))));
float g=.40+d*.50;o=vec4(g*.93,g*.97,g,1.);}`;

export function createGL(canvas: HTMLCanvasElement): GL | null {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return null;
  gl.useProgram(p);
  gl.enable(gl.DEPTH_TEST);
  return {
    gl,
    R: gl.getUniformLocation(p, "R"),
    k: gl.getUniformLocation(p, "k"),
    c: gl.getUniformLocation(p, "c"),
    loc: gl.getAttribLocation(p, "p"),
    buf: null,
    count: 0,
    size: 1,
  };
}

export function loadMesh(G: GL, tri: Float32Array, stats: MeshStats) {
  const { gl } = G;
  if (G.buf) gl.deleteBuffer(G.buf);
  G.buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
  gl.bufferData(gl.ARRAY_BUFFER, tri, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(G.loc);
  gl.vertexAttribPointer(G.loc, 3, gl.FLOAT, false, 0, 0);
  gl.uniform3f(
    G.c,
    (stats.min[0] + stats.max[0]) / 2,
    (stats.min[1] + stats.max[1]) / 2,
    (stats.min[2] + stats.max[2]) / 2,
  );
  G.count = tri.length / 3;
  G.size = Math.max(...stats.size) || 1;
}

/** rx tilts (around screen X), ry spins (around model Z). */
export function drawMesh(G: GL, rx: number, ry: number, zoom: number) {
  const { gl } = G;
  const W = gl.canvas.width, H = gl.canvas.height;
  const cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry);
  const sc = ((Math.min(W, H) * 0.34) / (G.size / 2)) * zoom;
  gl.viewport(0, 0, W, H);
  gl.uniformMatrix3fv(G.R, false, [cY, -sY * sX, -sY * cX, sY, cY * sX, cY * cX, 0, cX, -sX]);
  gl.uniform3f(G.k, sc / (W / 2), sc / (H / 2), 1 / G.size);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, G.count);
}

export const VIEWS = {
  "3D": [-1.0, 0.6],
  TOP: [0, 0],
  FRONT: [-Math.PI / 2, 0],
  SIDE: [-Math.PI / 2, Math.PI / 2],
} as const;

let thumbGL: GL | null | undefined;
/** Renders a small PNG preview of the part (data URL), or null without WebGL2. */
export function renderThumb(tri: Float32Array, stats: MeshStats): string | null {
  if (thumbGL === undefined) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    thumbGL = createGL(c);
  }
  if (!thumbGL) return null;
  loadMesh(thumbGL, tri, stats);
  drawMesh(thumbGL, VIEWS["3D"][0], VIEWS["3D"][1], 1.2);
  const url = (thumbGL.gl.canvas as HTMLCanvasElement).toDataURL("image/png");
  thumbGL.gl.deleteBuffer(thumbGL.buf);
  thumbGL.buf = null;
  return url;
}

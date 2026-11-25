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
  /** 1 = white faces for the line-drawing mode. */
  w: WebGLUniformLocation | null;
  prog: WebGLProgram;
  vao: WebGLVertexArrayObject | null;
  /** Line-drawing program (feature edges + live silhouettes). */
  line?: {
    prog: WebGLProgram;
    R: WebGLUniformLocation | null;
    k: WebGLUniformLocation | null;
    c: WebGLUniformLocation | null;
    vao: WebGLVertexArrayObject | null;
    buf: WebGLBuffer | null;
    count: number;
  };
};

const VS = `#version 300 es
in vec3 p;uniform mat3 R;uniform vec3 c;uniform vec3 k;out vec3 v;
void main(){vec3 q=R*(p-c);v=q;gl_Position=vec4(q.x*k.x,q.y*k.y,-q.z*k.z,1.);}`;
const FS = `#version 300 es
precision highp float;in vec3 v;uniform float w;out vec4 o;
void main(){if(w>.5){o=vec4(1.);return;}vec3 n=normalize(cross(dFdx(v),dFdy(v)));float d=abs(dot(n,normalize(vec3(.4,.5,.75))));
float g=.40+d*.50;o=vec4(g*.93,g*.97,g,1.);}`;

/** Each edge carries both face normals: drawn if it is a sharp/open edge (f=1) or a silhouette now. */
const LVS = `#version 300 es
in vec3 p;in vec3 n1;in vec3 n2;in float f;uniform mat3 R;uniform vec3 c;uniform vec3 k;
void main(){vec3 q=R*(p-c);float a=(R*n1).z,b=(R*n2).z;
if(f<.5&&a*b>0.){gl_Position=vec4(2.,2.,2.,1.);return;}
gl_Position=vec4(q.x*k.x,q.y*k.y,-q.z*k.z,1.);}`;
const LFS = `#version 300 es
precision highp float;out vec4 o;void main(){o=vec4(.15,.2,.24,1.);}`;

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

export function createGL(canvas: HTMLCanvasElement): GL | null {
  const gl = canvas.getContext("webgl2", { antialias: true, alpha: true, preserveDrawingBuffer: true });
  if (!gl) return null;
  const p = program(gl, VS, FS);
  if (!p) return null;
  gl.useProgram(p);
  gl.enable(gl.DEPTH_TEST);
  return {
    gl,
    prog: p,
    vao: gl.createVertexArray(),
    w: gl.getUniformLocation(p, "w"),
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
  gl.useProgram(G.prog);
  gl.bindVertexArray(G.vao);
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
  if (G.line) {
    gl.deleteBuffer(G.line.buf);
    G.line = undefined;
  }
}

/** Builds the edge list for the line-drawing mode (once per mesh, on first use). */
function loadLines(G: GL, tri: Float32Array, centre: [number, number, number]) {
  const { gl } = G;
  const prog = program(gl, LVS, LFS);
  if (!prog) return;
  const nTri = tri.length / 9;
  // Weld vertices on a 10 µm grid (numeric keys: fast even for ~1M triangles).
  let mx = Infinity, my = Infinity, mz = Infinity;
  for (let i = 0; i < tri.length; i += 3) {
    if (tri[i] < mx) mx = tri[i];
    if (tri[i + 1] < my) my = tri[i + 1];
    if (tri[i + 2] < mz) mz = tri[i + 2];
  }
  const ids = new Uint32Array(nTri * 3);
  const vmap = new Map<number, number>();
  for (let i = 0; i < nTri * 3; i++) {
    const qx = Math.min(65535, Math.round((tri[i * 3] - mx) * 100));
    const qy = Math.min(65535, Math.round((tri[i * 3 + 1] - my) * 100));
    const qz = Math.min(65535, Math.round((tri[i * 3 + 2] - mz) * 100));
    const k = qx * 4294967296 + qy * 65536 + qz;
    let id = vmap.get(k);
    if (id === undefined) vmap.set(k, (id = vmap.size));
    ids[i] = id;
  }
  const nV = vmap.size;
  const normals = new Float32Array(nTri * 3);
  for (let t = 0; t < nTri; t++) {
    const o = t * 9;
    const ux = tri[o + 3] - tri[o], uy = tri[o + 4] - tri[o + 1], uz = tri[o + 5] - tri[o + 2];
    const vx = tri[o + 6] - tri[o], vy = tri[o + 7] - tri[o + 1], vz = tri[o + 8] - tri[o + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    normals[t * 3] = nx; normals[t * 3 + 1] = ny; normals[t * 3 + 2] = nz;
  }
  // edge key -> [first triangle, second triangle or -1, count, corner0, corner1]
  const edges = new Map<number, number[]>();
  for (let t = 0; t < nTri; t++) {
    for (let e = 0; e < 3; e++) {
      const a = ids[t * 3 + e], b = ids[t * 3 + ((e + 1) % 3)];
      if (a === b) continue;
      const key = a < b ? a * nV + b : b * nV + a;
      const rec = edges.get(key);
      if (!rec) {
        edges.set(key, [t, -1, 1, t * 3 + e, t * 3 + ((e + 1) % 3)]);
      } else {
        if (rec[2] === 1) rec[1] = t;
        rec[2]++;
      }
    }
  }
  const SHARP = Math.cos((30 * Math.PI) / 180);
  const data = new Float32Array(edges.size * 2 * 10);
  let n = 0;
  for (const [t1, t2, count, c0, c1] of edges.values()) {
    const ta = t1 * 3, tb = (t2 < 0 ? t1 : t2) * 3;
    const dot = normals[ta] * normals[tb] + normals[ta + 1] * normals[tb + 1] + normals[ta + 2] * normals[tb + 2];
    const feature = count !== 2 || dot < SHARP ? 1 : 0;
    // A smooth edge facing the same way on both sides can only matter as a silhouette.
    for (const ci of [c0, c1]) {
      data[n] = tri[ci * 3]; data[n + 1] = tri[ci * 3 + 1]; data[n + 2] = tri[ci * 3 + 2];
      data[n + 3] = normals[ta]; data[n + 4] = normals[ta + 1]; data[n + 5] = normals[ta + 2];
      data[n + 6] = normals[tb]; data[n + 7] = normals[tb + 1]; data[n + 8] = normals[tb + 2];
      data[n + 9] = feature;
      n += 10;
    }
  }
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data.subarray(0, n), gl.STATIC_DRAW);
  const attr = (name: string, size: number, off: number) => {
    const l = gl.getAttribLocation(prog, name);
    if (l < 0) return;
    gl.enableVertexAttribArray(l);
    gl.vertexAttribPointer(l, size, gl.FLOAT, false, 40, off * 4);
  };
  attr("p", 3, 0);
  attr("n1", 3, 3);
  attr("n2", 3, 6);
  attr("f", 1, 9);
  gl.useProgram(prog);
  gl.uniform3f(gl.getUniformLocation(prog, "c"), ...centre);
  G.line = {
    prog,
    R: gl.getUniformLocation(prog, "R"),
    k: gl.getUniformLocation(prog, "k"),
    c: gl.getUniformLocation(prog, "c"),
    vao,
    buf,
    count: n / 10,
  };
  gl.useProgram(G.prog);
  gl.bindVertexArray(G.vao);
}

export type RenderMode = "solid" | "line";

/** rx tilts (around screen X), ry spins (around model Z). */
export function drawMesh(
  G: GL,
  rx: number,
  ry: number,
  zoom: number,
  mode: RenderMode = "solid",
  src?: { tri: Float32Array; stats: MeshStats },
) {
  const { gl } = G;
  if (mode === "line" && !G.line && src) {
    const { min, max } = src.stats;
    loadLines(G, src.tri, [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]);
  }
  const lines = mode === "line" && G.line;
  const W = gl.canvas.width, H = gl.canvas.height;
  const cX = Math.cos(rx), sX = Math.sin(rx), cY = Math.cos(ry), sY = Math.sin(ry);
  const sc = ((Math.min(W, H) * 0.34) / (G.size / 2)) * zoom;
  gl.viewport(0, 0, W, H);
  const R = [cY, -sY * sX, -sY * cX, sY, cY * sX, cY * cX, 0, cX, -sX];
  const k: [number, number, number] = [sc / (W / 2), sc / (H / 2), 1 / G.size];
  gl.useProgram(G.prog);
  gl.bindVertexArray(G.vao);
  gl.uniformMatrix3fv(G.R, false, R);
  gl.uniform3f(G.k, ...k);
  gl.uniform1f(G.w, lines ? 1 : 0);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (lines) {
    // White faces pushed back slightly, then visible edges on top (hidden lines removed).
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1, 1);
  }
  gl.drawArrays(gl.TRIANGLES, 0, G.count);
  if (lines && G.line) {
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.depthFunc(gl.LEQUAL);
    gl.useProgram(G.line.prog);
    gl.bindVertexArray(G.line.vao);
    gl.uniformMatrix3fv(G.line.R, false, R);
    gl.uniform3f(G.line.k, ...k);
    gl.drawArrays(gl.LINES, 0, G.line.count);
    gl.depthFunc(gl.LESS);
    gl.useProgram(G.prog);
    gl.bindVertexArray(G.vao);
  }
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

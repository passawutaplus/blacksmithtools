import { unzipSync } from "fflate";
/**
 * Reads STL (binary + ASCII) and OBJ meshes in the browser and measures them.
 * Pure functions, no DOM: shared by the quote tool and the unit tests.
 * Units are assumed to be millimetres (the norm for STL/OBJ meant for printing).
 */

export type MeshStats = {
  triangles: number;
  min: [number, number, number];
  max: [number, number, number];
  /** Bounding box size in mm (x, y, z). */
  size: [number, number, number];
  /** Enclosed volume in cm³ (absolute, signed-volume method). */
  volumeCm3: number;
  /** Surface area in cm². */
  areaCm2: number;
  /** Edges used by only one triangle: holes in the surface. */
  openEdges: number;
  /** Edges shared by 3+ triangles: overlapping / non-manifold geometry. */
  nonManifoldEdges: number;
};

export type ParsedMesh = { tri: Float32Array; format: "stl-binary" | "stl-ascii" | "obj" | "3mf" };

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_TRIANGLES = 3_000_000;
export const MESH_EXT = [".stl", ".obj", ".3mf"] as const;
/** CAD files: accepted for upload, but the shop opens them (no in-browser preview/price). */
export const CAD_EXT = [".step", ".stp"] as const;
export const ACCEPTED_EXT = [...MESH_EXT, ...CAD_EXT] as const;
export const isCadFile = (name: string) => (CAD_EXT as readonly string[]).includes(fileExt(name));

export function fileExt(name: string) {
  const m = /\.[^.]+$/.exec(name.toLowerCase());
  return m ? m[0] : "";
}

function parseBinaryStl(buf: ArrayBuffer): Float32Array | null {
  if (buf.byteLength < 84) return null;
  const dv = new DataView(buf);
  const n = dv.getUint32(80, true);
  if (84 + n * 50 !== buf.byteLength || n === 0 || n > MAX_TRIANGLES) return null;
  const tri = new Float32Array(n * 9);
  for (let i = 0; i < n; i++) {
    const o = 84 + i * 50 + 12;
    for (let k = 0; k < 9; k++) tri[i * 9 + k] = dv.getFloat32(o + k * 4, true);
  }
  return tri;
}

function parseAsciiStl(text: string): Float32Array | null {
  const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(Number(m[1]), Number(m[2]), Number(m[3]));
    if (out.length > MAX_TRIANGLES * 9) return null;
  }
  if (out.length < 9 || out.length % 9 !== 0) return null;
  return Float32Array.from(out);
}

function parseObj(text: string): Float32Array | null {
  const v: number[] = [];
  const out: number[] = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (line.startsWith("v ")) {
      const p = line.trim().split(/\s+/);
      v.push(Number(p[1]), Number(p[2]), Number(p[3]));
    } else if (line.startsWith("f ")) {
      const idx = line
        .trim()
        .split(/\s+/)
        .slice(1)
        .map((t) => {
          const i = parseInt(t.split("/")[0], 10);
          return i < 0 ? v.length / 3 + i : i - 1;
        });
      if (idx.some((i) => !Number.isInteger(i) || i < 0 || i >= v.length / 3)) return null;
      // Fan-triangulate polygons.
      for (let k = 1; k + 1 < idx.length; k++) {
        for (const j of [idx[0], idx[k], idx[k + 1]]) out.push(v[j * 3], v[j * 3 + 1], v[j * 3 + 2]);
      }
      if (out.length > MAX_TRIANGLES * 9) return null;
    }
  }
  return out.length >= 9 ? Float32Array.from(out) : null;
}

const UNIT_MM: Record<string, number> = { micron: 0.001, millimeter: 1, centimeter: 10, inch: 25.4, foot: 304.8, meter: 1000 };

/** 3MF = zip of XML ".model" files. Meshes from every part are merged (transforms ignored). */
type Mat = number[]; // 3MF 4×3 affine, row-vector: p' = [x y z 1] · M
const IDENT: Mat = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

function parseMat(a: string): Mat {
  const t = /\btransform="([^"]+)"/.exec(a)?.[1];
  if (!t) return IDENT;
  const m = t.trim().split(/\s+/).map(Number);
  return m.length === 12 && m.every(Number.isFinite) ? m : IDENT;
}

/** First apply a, then b. */
function mul(a: Mat, b: Mat): Mat {
  const r: Mat = new Array(12);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j] + (i === 3 ? b[9 + j] : 0);
  return r;
}

type Obj3mf = { tri: number[] | null; comps: { path: string; id: string; m: Mat }[] };

/**
 * 3MF: honours <build> items, <components> (incl. Bambu/Prusa p:path sub-models)
 * and transforms, so copies placed on the plate are all counted.
 */
function parse3mf(buf: ArrayBuffer): Float32Array | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf), { filter: (f) => /\.model$/i.test(f.name) });
  } catch {
    return null;
  }
  const dec = new TextDecoder();
  const norm = (p: string) => p.replace(/^\/+/, "");
  const models = new Map<string, { objects: Map<string, Obj3mf>; build: { id: string; m: Mat }[] | null; unit: number }>();
  let tooBig = false;
  for (const [name, data] of Object.entries(files)) {
    const xml = dec.decode(data);
    const unit = UNIT_MM[/<model[^>]*\bunit="([a-z]+)"/i.exec(xml)?.[1] ?? "millimeter"] ?? 1;
    const objects = new Map<string, Obj3mf>();
    let triCount = 0;
    for (const o of xml.matchAll(/<object\b([^>]*)>([\s\S]*?)<\/object>/g)) {
      const id = /\bid="([^"]+)"/.exec(o[1])?.[1];
      if (!id) continue;
      const body = o[2];
      let tri: number[] | null = null;
      const mesh = /<mesh\b[^>]*>([\s\S]*?)<\/mesh>/.exec(body);
      if (mesh) {
        const v: number[] = [];
        for (const t of mesh[1].matchAll(/<vertex\b([^>]*)\/?>/g)) {
          const a = t[1];
          v.push(
            parseFloat(/\bx="([^"]+)"/.exec(a)?.[1] ?? "NaN"),
            parseFloat(/\by="([^"]+)"/.exec(a)?.[1] ?? "NaN"),
            parseFloat(/\bz="([^"]+)"/.exec(a)?.[1] ?? "NaN"),
          );
        }
        tri = [];
        for (const t of mesh[1].matchAll(/<triangle\b([^>]*)\/?>/g)) {
          const a = t[1];
          for (const k of ["v1", "v2", "v3"]) {
            const idx = parseInt(new RegExp(`\\b${k}="(\\d+)"`).exec(a)?.[1] ?? "-1", 10);
            if (idx < 0 || idx * 3 + 2 >= v.length) return null;
            tri.push(v[idx * 3], v[idx * 3 + 1], v[idx * 3 + 2]);
          }
          if (++triCount > MAX_TRIANGLES) tooBig = true;
        }
      }
      const comps: Obj3mf["comps"] = [];
      for (const c of body.matchAll(/<component\b([^>]*)\/?>/g)) {
        const cid = /\bobjectid="([^"]+)"/.exec(c[1])?.[1];
        if (!cid) continue;
        const path = /\b(?:p:)?path="([^"]+)"/.exec(c[1])?.[1];
        comps.push({ path: path ? norm(path) : norm(name), id: cid, m: parseMat(c[1]) });
      }
      objects.set(id, { tri, comps });
    }
    const b = /<build\b[^>]*>([\s\S]*?)<\/build>/.exec(xml);
    const build = b
      ? [...b[1].matchAll(/<item\b([^>]*)\/?>/g)]
          .map((it) => ({ id: /\bobjectid="([^"]+)"/.exec(it[1])?.[1] ?? "", m: parseMat(it[1]) }))
          .filter((it) => it.id)
      : null;
    models.set(norm(name), { objects, build, unit });
  }
  if (tooBig) return null;

  const out: number[] = [];
  const push = (tri: number[], m: Mat, unit: number) => {
    for (let i = 0; i < tri.length; i += 3) {
      const x = tri[i], y = tri[i + 1], z = tri[i + 2];
      out.push(
        (x * m[0] + y * m[3] + z * m[6] + m[9]) * unit,
        (x * m[1] + y * m[4] + z * m[7] + m[10]) * unit,
        (x * m[2] + y * m[5] + z * m[8] + m[11]) * unit,
      );
    }
    if (out.length / 9 > MAX_TRIANGLES) throw new Error("too big");
  };
  const place = (path: string, id: string, m: Mat, unit: number, depth: number) => {
    const obj = models.get(path)?.objects.get(id);
    if (!obj || depth > 16) return;
    if (obj.tri) push(obj.tri, m, unit);
    for (const c of obj.comps) place(c.path, c.id, mul(c.m, m), unit, depth + 1);
  };

  try {
    const roots = [...models.entries()].filter(([, md]) => md.build && md.build.length);
    if (roots.length) {
      for (const [path, md] of roots) for (const it of md.build!) place(path, it.id, it.m, md.unit, 0);
    } else {
      // No build list: fall back to every mesh as-is.
      for (const md of models.values()) for (const o of md.objects.values()) if (o.tri) push(o.tri, IDENT, md.unit);
    }
  } catch {
    return null;
  }
  if (!out.length || out.some((n) => !Number.isFinite(n))) return null;
  return new Float32Array(out);
}

export function parseMesh(name: string, buf: ArrayBuffer): ParsedMesh | null {
  const ext = fileExt(name);
  if (ext === ".stl") {
    const bin = parseBinaryStl(buf);
    if (bin) return { tri: bin, format: "stl-binary" };
    const ascii = parseAsciiStl(new TextDecoder().decode(buf));
    return ascii ? { tri: ascii, format: "stl-ascii" } : null;
  }
  if (ext === ".3mf") {
    const tri = parse3mf(buf);
    return tri ? { tri, format: "3mf" } : null;
  }
  if (ext === ".obj") {
    const obj = parseObj(new TextDecoder().decode(buf));
    return obj ? { tri: obj, format: "obj" } : null;
  }
  return null;
}

export function analyseMesh(tri: Float32Array): MeshStats | null {
  const n = tri.length / 9;
  if (!Number.isInteger(n) || n === 0) return null;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  const ids = new Map<string, number>();
  const idx = new Int32Array(n * 3);
  let vol = 0;
  let area = 0;

  for (let i = 0; i < n * 3; i++) {
    const x = tri[i * 3], y = tri[i * 3 + 1], z = tri[i * 3 + 2];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
    const key = `${Math.round(x * 1e3)},${Math.round(y * 1e3)},${Math.round(z * 1e3)}`;
    let g = ids.get(key);
    if (g === undefined) {
      g = ids.size;
      ids.set(key, g);
    }
    idx[i] = g;
  }

  for (let i = 0; i < n; i++) {
    const o = i * 9;
    const ax = tri[o], ay = tri[o + 1], az = tri[o + 2];
    const bx = tri[o + 3], by = tri[o + 4], bz = tri[o + 5];
    const cx = tri[o + 6], cy = tri[o + 7], cz = tri[o + 8];
    vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;
    area += Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
  }

  const counts = new Map<number, number>();
  const N = ids.size;
  const add = (a: number, b: number) => {
    const k = a < b ? a * N + b : b * N + a;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  };
  for (let i = 0; i < n; i++) {
    add(idx[i * 3], idx[i * 3 + 1]);
    add(idx[i * 3 + 1], idx[i * 3 + 2]);
    add(idx[i * 3 + 2], idx[i * 3]);
  }
  let openEdges = 0;
  let nonManifoldEdges = 0;
  counts.forEach((c) => {
    if (c === 1) openEdges++;
    else if (c > 2) nonManifoldEdges++;
  });

  return {
    triangles: n,
    min,
    max,
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
    volumeCm3: Math.abs(vol) / 1000,
    areaCm2: area / 100,
    openEdges,
    nonManifoldEdges,
  };
}

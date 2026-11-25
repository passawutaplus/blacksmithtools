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
function parse3mf(buf: ArrayBuffer): Float32Array | null {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buf), { filter: (f) => /\.model$/i.test(f.name) });
  } catch {
    return null;
  }
  const out: number[] = [];
  const dec = new TextDecoder();
  for (const data of Object.values(files)) {
    const xml = dec.decode(data);
    const unit = UNIT_MM[/<model[^>]*\bunit="([a-z]+)"/i.exec(xml)?.[1] ?? "millimeter"] ?? 1;
    for (const m of xml.matchAll(/<mesh\b[^>]*>([\s\S]*?)<\/mesh>/g)) {
      const v: number[] = [];
      for (const t of m[1].matchAll(/<vertex\b([^>]*)\/?>/g)) {
        const a = t[1];
        v.push(
          parseFloat(/\bx="([^"]+)"/.exec(a)?.[1] ?? "NaN") * unit,
          parseFloat(/\by="([^"]+)"/.exec(a)?.[1] ?? "NaN") * unit,
          parseFloat(/\bz="([^"]+)"/.exec(a)?.[1] ?? "NaN") * unit,
        );
      }
      for (const t of m[1].matchAll(/<triangle\b([^>]*)\/?>/g)) {
        const a = t[1];
        for (const k of ["v1", "v2", "v3"]) {
          const idx = parseInt(new RegExp(`\\b${k}="(\\d+)"`).exec(a)?.[1] ?? "-1", 10);
          if (idx < 0 || idx * 3 + 2 >= v.length) return null;
          out.push(v[idx * 3], v[idx * 3 + 1], v[idx * 3 + 2]);
        }
        if (out.length / 9 > MAX_TRIANGLES) return null;
      }
    }
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

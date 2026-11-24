import { describe, expect, it } from "vitest";
import { analyseMesh, parseMesh } from "../print-quote/mesh";
import { estimateOrder, fileStatus } from "../print-quote/pricing";

// 10 mm cube as 12 outward-facing triangles.
const V = [
  [0, 0, 0], [10, 0, 0], [10, 10, 0], [0, 10, 0],
  [0, 0, 10], [10, 0, 10], [10, 10, 10], [0, 10, 10],
];
const F = [
  [0, 2, 1], [0, 3, 2], [4, 5, 6], [4, 6, 7],
  [0, 1, 5], [0, 5, 4], [1, 2, 6], [1, 6, 5],
  [2, 3, 7], [2, 7, 6], [3, 0, 4], [3, 4, 7],
];

function binaryStl(faces = F) {
  const buf = new ArrayBuffer(84 + faces.length * 50);
  const dv = new DataView(buf);
  dv.setUint32(80, faces.length, true);
  faces.forEach((f, i) => {
    f.forEach((vi, k) => V[vi].forEach((c, j) => dv.setFloat32(84 + i * 50 + 12 + k * 12 + j * 4, c, true)));
  });
  return buf;
}

function asciiStl() {
  const body = F.map(
    (f) => `facet normal 0 0 0\nouter loop\n${f.map((vi) => `vertex ${V[vi].join(" ")}`).join("\n")}\nendloop\nendfacet`,
  ).join("\n");
  return new TextEncoder().encode(`solid cube\n${body}\nendsolid cube`).buffer as ArrayBuffer;
}

describe("print-quote mesh", () => {
  it("reads a binary STL cube", () => {
    const m = parseMesh("cube.stl", binaryStl());
    expect(m?.format).toBe("stl-binary");
    const s = analyseMesh(m!.tri)!;
    expect(s.size).toEqual([10, 10, 10]);
    expect(s.volumeCm3).toBeCloseTo(1, 5);
    expect(s.areaCm2).toBeCloseTo(6, 5);
    expect(s.openEdges).toBe(0);
    expect(s.nonManifoldEdges).toBe(0);
  });

  it("reads an ASCII STL", () => {
    const m = parseMesh("cube.STL", asciiStl());
    expect(m?.format).toBe("stl-ascii");
    expect(analyseMesh(m!.tri)!.volumeCm3).toBeCloseTo(1, 5);
  });

  it("reads an OBJ with quads", () => {
    const obj = `${V.map((v) => `v ${v.join(" ")}`).join("\n")}
f 1 4 3 2
f 5 6 7 8
f 1 2 6 5
f 2 3 7 6
f 3 4 8 7
f 4 1 5 8`;
    const m = parseMesh("cube.obj", new TextEncoder().encode(obj).buffer as ArrayBuffer);
    expect(m?.format).toBe("obj");
    expect(analyseMesh(m!.tri)!.volumeCm3).toBeCloseTo(1, 5);
  });

  it("flags holes and rejects junk", () => {
    const s = analyseMesh(parseMesh("open.stl", binaryStl(F.slice(2)))!.tri)!;
    expect(s.openEdges).toBeGreaterThan(0);
    expect(fileStatus(s, "fdm").level).toBe("warn");
    expect(parseMesh("x.stl", new TextEncoder().encode("hello").buffer as ArrayBuffer)).toBeNull();
    expect(parseMesh("x.3mf", binaryStl())).toBeNull();
  });
});

describe("print-quote pricing", () => {
  const s = analyseMesh(parseMesh("cube.stl", binaryStl())!.tri)!;

  it("checks the build size per process", () => {
    expect(fileStatus(s, "fdm").level).toBe("ok");
    expect(fileStatus({ ...s, size: [300, 10, 10] }, "fdm").level).toBe("error");
  });

  it("returns no price until the rates are calibrated", () => {
    const e = estimateOrder([{ stats: s, qty: 3 }], "fdm", "normal");
    expect(e.pieces).toBe(3);
    expect(e.printTHB).toBeNull();
  });
});

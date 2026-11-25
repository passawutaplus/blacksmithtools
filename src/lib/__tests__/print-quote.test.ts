import { describe, expect, it } from "vitest";
import { analyseMesh, parseMesh } from "../print-quote/mesh";
import { zipSync } from "fflate";
import { estimateOrder, fileStatus, parcelFee } from "../print-quote/pricing";

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

  it("reads 3MF (zip + XML), honouring the unit", () => {
    const verts = V.map(([x, y, z]) => `<vertex x="${x / 10}" y="${y / 10}" z="${z / 10}"/>`).join("");
    const tris = F.map(([a, b, c]) => `<triangle v1="${a}" v2="${b}" v3="${c}"/>`).join("");
    const xml = `<?xml version="1.0"?><model unit="centimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources><object id="1" type="model"><mesh><vertices>${verts}</vertices><triangles>${tris}</triangles></mesh></object></resources><build><item objectid="1"/></build></model>`;
    const zip = zipSync({ "3D/3dmodel.model": new TextEncoder().encode(xml) });
    const m = parseMesh("cube.3mf", zip.buffer as ArrayBuffer);
    expect(m?.format).toBe("3mf");
    expect(analyseMesh(m!.tri)!.volumeCm3).toBeCloseTo(1, 4);
  });

  it("marks STEP as shop-checked, not an error", () => {
    expect(fileStatus(null, "fdm", undefined, true)).toMatchObject({ level: "warn", autoPrice: false });
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

  it("charges FDM ฿70/hour with a ฿70 minimum", () => {
    const e = estimateOrder([{ stats: s, qty: 3 }], "fdm", "normal");
    expect(e.pieces).toBe(3);
    expect(e.printTHB).toBe(70);
    expect(e.minApplied).toBe(true);
  });

  it("returns no resin price until the rates are calibrated", () => {
    expect(estimateOrder([{ stats: s, qty: 1 }], "resin", "normal").printTHB).toBeNull();
  });

  it("matches the shop's real FDM prices (area/volume of real jobs)", () => {
    const job = (areaCm2: number, volumeCm3: number) =>
      estimateOrder([{ stats: { ...s, areaCm2, volumeCm3 }, qty: 1 }], "fdm", "normal").printTHB;
    expect(job(173, 67.7)).toBe(70); // M12 battery holder
    expect(job(256, 87.2)).toBe(105); // M18 battery holder, 1h28m
    expect(job(454, 36.2)).toBe(140); // blower, 1h58m
    expect(job(1660, 211.6)).toBe(560); // M18 GEN3 stubby, 8h05m
  });

  it("ships free from 1,000 THB", () => {
    expect(parcelFee(null)).toBe(50);
    expect(parcelFee(999)).toBe(50);
    expect(parcelFee(1000)).toBe(0);
  });
});

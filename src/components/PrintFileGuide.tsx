import {
  Box,
  Check,
  FileDown,
  FileWarning,
  Ruler,
} from "lucide-react";

const FORMATS = [
  {
    ext: "3MF",
    rec: "แนะนำ",
    body: "เก็บหน่วยเป็นมิลลิเมตร ส่งหลายชิ้นในไฟล์เดียวได้ ร้านเปิดในโปรแกรมเตรียมพิมพ์แล้วสเกลไม่เพี้ยนง่าย",
  },
  {
    ext: "STL",
    rec: "ใช้ได้ทั่วไป",
    body: "เซฟแบบ Binary ไม่ใช่ ASCII ไฟล์เล็ก เปิดได้ทุกเครื่อง ต้องตั้งหน่วยเป็น มม. ก่อนส่ง เพราะ STL ไม่เก็บหน่วย",
  },
  {
    ext: "STEP / STP",
    rec: "งาน CAD",
    body: "ไฟล์จาก Fusion, SolidWorks, Inventor เส้นโค้งยังคม ร้านแปลงเป็นตาข่ายตอนเปิด ไม่เพี้ยนเท่า STL ที่หยาบเกินไป",
  },
  {
    ext: "OBJ",
    rec: "งานโมเดล",
    body: "ใช้ได้จาก Blender, ZBrush, SketchUp เช็กว่าหน้าชิ้นหันออกด้านนอก ไม่ต้องส่งไฟล์ MTL ตามมาถ้าพิมพ์สีเดียว",
  },
];

const APPS = [
  ["Fusion 360", "คลิกขวาบอดี้ → Save As Mesh → เลือก 3MF หรือ STL Binary, Refinement High, หน่วย Millimeters"],
  ["SolidWorks", "File → Save As → เลือก STEP หรือ STL แล้วกด Options: Binary, Resolution Fine, หน่วย มม."],
  ["Inventor / AutoCAD", "งานชิ้นตัน Save As เป็น STEP หรือ STL อย่าส่งแค่ไฟล์ .dwg ที่มีแค่เส้น 2D"],
  ["Onshape", "คลิกขวาพาร์ต → Export → 3MF หรือ STL, หน่วย millimeter, ความละเอียด Fine"],
  ["FreeCAD", "เลือกชิ้น → File → Export → STEP หรือ STL ตั้ง Mesh deviation ประมาณ 0.05–0.1 มม."],
  ["Rhino", "File → Export Selected → STL หรือ 3MF, ตั้ง Maximum distance 0.05–0.1 มม. อย่าปล่อยตาข่ายหยาบ"],
  ["SketchUp", "File → Export → 3D Model → .stl หรือ .obj หน่วยมม. (บางรุ่นต้องลงส่วนขยาย STL ก่อน)"],
  ["Tinkercad", "Export → .STL หรือ .3MF ขนาดในโปรแกรมเป็นมม. อยู่แล้ว"],
  ["Blender", "ตั้ง Scene Units เป็น Metric / Millimeters, กด Apply All Transforms แล้ว Export STL หรือ 3MF แบบ Selection Only"],
  ["ZBrush", "Decimation Master ให้ตาข่ายไม่หนาเกิน แล้ว Export STL หรือ OBJ"],
];

const CHECKS = [
  "หน่วยเป็นมิลลิเมตร ก่อนเซฟ อย่าปล่อยเป็นนิ้วหรือเมตร",
  "ชิ้นตัน ปิดผิว ไม่มีรูรั่ว ผนังบางเกินไปพิมพ์ไม่ติด",
  "งาน FDM ผนังอย่างน้อยประมาณ 1.2 มม. งาน SLA บางกว่านี้ได้ถ้าชิ้นเล็ก",
  "STL เลือก Binary ไฟล์ใหญ่เกิน 200 MB มักตาข่ายละเอียดเกิน ร้านขอให้เซฟใหม่",
  "อย่าส่งแค่ .blend .sldprt .f3d .skp ถ้าเซฟออกเป็น STL / 3MF / STEP ได้",
];

export function PrintFileGuide() {
  return (
    <section id="files" className="scroll-mt-24 border-t border-steel bg-steel/50 py-12 md:py-16">
      <div className="container-bs">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded bg-navy text-white">
            <FileDown className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-semibold tracking-wide text-forge">ก่อนส่งร้าน</p>
            <h2 className="mt-1 text-2xl font-bold text-navy md:text-3xl">เซฟไฟล์สำหรับพิมพ์</h2>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-navy/90">
          ร้านเปิดไฟล์ในโปรแกรมเตรียมพิมพ์ของเครื่อง P2S ได้จาก STL, 3MF, OBJ และ STEP
          ส่งนามสกุลพวกนี้ดีกว่าส่งไฟล์โปรเจกต์ดิบ เพราะสเกลและผิวงานจะตรงกับที่เห็นในโปรแกรมออกแบบ
        </p>

        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <li key={f.ext} className="card p-4">
              <p className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-semibold text-navy">
                  <Box className="h-4 w-4 text-forge" aria-hidden />
                  {f.ext}
                </span>
                <span className="text-xs font-semibold text-forge">{f.rec}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-10 flex items-center gap-2 text-lg font-bold text-navy">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-white">
            <Ruler className="h-4 w-4 text-forge" aria-hidden />
          </span>
          เซฟจากโปรแกรมไหน
        </h3>
        <p className="mt-2 text-sm text-muted">เลือก Export / Save As ไม่ใช่ Save โปรเจกต์ปกติ</p>
        <div className="card mt-4 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th className="w-48">โปรแกรม</th>
                  <th>วิธีเซฟ</th>
                </tr>
              </thead>
              <tbody>
                {APPS.map(([app, how]) => (
                  <tr key={app}>
                    <td className="font-semibold">{app}</td>
                    <td>{how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <h3 className="mt-10 flex items-center gap-2 text-lg font-bold text-navy">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-white">
            <Check className="h-4 w-4 text-forge" aria-hidden />
          </span>
          เช็กก่อนส่ง
        </h3>
        <ul className="mt-4 space-y-2">
          {CHECKS.map((item) => (
            <li key={item} className="card flex items-start gap-2 px-4 py-3 text-sm text-navy/90">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-4 flex items-start gap-2 text-sm text-muted">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-forge" aria-hidden />
          <span>
            เซฟออกไม่ได้ ส่งไฟล์โปรเจกต์มาทาง LINE ได้ ร้านแปลงให้ก่อนทำราคา งานจากแคดแนะนำ STEP คู่กับ STL
          </span>
        </p>
      </div>
    </section>
  );
}

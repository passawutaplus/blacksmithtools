import {
  BREAKER_SIZES,
  CABLE_TABLE_5_20,
  CABLE_TABLE_SOURCE,
  DISCLAIMER_C,
  PVC_PIPES,
  REFRIGERANT_PT,
} from "@/lib/chang/constants";

export const metadata = {
  title: "ตารางอ้างอิงงานช่าง",
  description: "ตารางสายไฟ วสท. ขนาดท่อ PVC และ P–T น้ำยาแอร์ จากค่าคงที่ในระบบ — ไม่มีการคำนวณ",
};

export default function AssistantTablesPage() {
  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">ตารางอ้างอิง</h1>
        <p className="mt-1 text-sm text-muted">
          เปิดดูอย่างเดียว ไม่มีการคำนวณ — ใช้เทียบของที่ร้านกับตารางในระบบ
        </p>
      </div>

      <section className="card overflow-x-auto p-4">
        <h2 className="text-lg font-bold text-navy">สายทองแดง THW ในท่อ</h2>
        <p className="mt-1 text-xs text-muted">{CABLE_TABLE_SOURCE}</p>
        <table className="mt-3 w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-steel text-xs text-muted">
              <th className="py-2 pr-3">ตร.มม.</th>
              <th className="py-2 pr-3">กลุ่ม 1 · 1 เฟส</th>
              <th className="py-2 pr-3">กลุ่ม 1 · 3 เฟส</th>
              <th className="py-2 pr-3">กลุ่ม 2 · 1 เฟส</th>
              <th className="py-2">กลุ่ม 2 · 3 เฟส</th>
            </tr>
          </thead>
          <tbody>
            {CABLE_TABLE_5_20.map((row) => (
              <tr key={row.mm2} className="border-b border-steel/60">
                <td className="py-2 pr-3 font-semibold text-navy">{row.mm2}</td>
                <td className="py-2 pr-3">{row.g1c2} A</td>
                <td className="py-2 pr-3">{row.g1c3} A</td>
                <td className="py-2 pr-3">{row.g2c2} A</td>
                <td className="py-2">{row.g2c3} A</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          เบรกเกอร์มาตรฐานที่ระบบรู้จัก: {BREAKER_SIZES.join(", ")} A
        </p>
        <p className="mt-2 text-xs leading-relaxed text-navy">{DISCLAIMER_C}</p>
      </section>

      <section className="card overflow-x-auto p-4">
        <h2 className="text-lg font-bold text-navy">ท่อ PVC น้ำใช้ — ID ใน (มอก. 17)</h2>
        <table className="mt-3 w-full min-w-[28rem] text-left text-sm">
          <thead>
            <tr className="border-b border-steel text-xs text-muted">
              <th className="py-2 pr-3">ขนาดเรียก</th>
              <th className="py-2 pr-3">ID ชั้น 8.5</th>
              <th className="py-2">ID ชั้น 13.5</th>
            </tr>
          </thead>
          <tbody>
            {PVC_PIPES.map((p) => (
              <tr key={p.nom} className="border-b border-steel/60">
                <td className="py-2 pr-3 font-semibold text-navy">{p.nom} มม.</td>
                <td className="py-2 pr-3">{p.id85} มม.</td>
                <td className="py-2">{p.id135} มม.</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card overflow-x-auto p-4">
        <h2 className="text-lg font-bold text-navy">ตาราง P–T น้ำยาแอร์ (แรงดันเกจ → อุณหภูมิอิ่มตัว)</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          {Object.entries(REFRIGERANT_PT).map(([kind, table]) => (
            <div key={kind}>
              <h3 className="text-sm font-bold text-navy">{kind}</h3>
              <table className="mt-1 w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-steel text-xs text-muted">
                    <th className="py-1 pr-3">psig</th>
                    <th className="py-1">°C</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map(([psi, t]) => (
                    <tr key={`${kind}-${psi}`} className="border-b border-steel/40">
                      <td className="py-1 pr-3">{psi}</td>
                      <td className="py-1">{t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

type WorkItem = { src: string; label: string };

export const FDM_WORKS: WorkItem[] = [
  { src: "/print/works/fdm-1.png", label: "ที่เก็บเครื่องมือ" },
  { src: "/print/works/fdm-2.png", label: "ที่เก็บแบต" },
  { src: "/print/works/fdm-3.png", label: "ท่อเป่าลม" },
  { src: "/print/works/fdm-4.png", label: "ถาดกล่อง" },
  { src: "/print/works/fdm-5.png", label: "ที่ชาร์จติดผนัง" },
  { src: "/print/works/fdm-6.png", label: "หัวเป่าลม" },
  { src: "/print/works/fdm-7.png", label: "ถาดดอกสว่าน" },
  { src: "/print/works/fdm-8.png", label: "ราวแขวนประแจ" },
];

export const SLA_WORKS: WorkItem[] = [
  { src: "/print/works/sla-1.png", label: "คลิป / แลตช์" },
  { src: "/print/works/sla-2.png", label: "ต้นแบบละเอียด" },
  { src: "/print/works/sla-3.png", label: "เคสชิ้นเล็ก" },
  { src: "/print/works/sla-4.png", label: "จิ๊กคม" },
  { src: "/print/works/sla-5.png", label: "คลิปขาว" },
  { src: "/print/works/sla-6.png", label: "ฟิตติ้งสีเนื้อ" },
  { src: "/print/works/sla-7.png", label: "เคสสแนปฟิต" },
  { src: "/print/works/sla-8.png", label: "จิ๊กจับชิ้น" },
];

export function PrintWorksRow({ items, reverse }: { items: WorkItem[]; reverse?: boolean }) {
  const loop = [...items, ...items];
  return (
    <div className="overflow-hidden">
      <div
        className={`marquee-track ${reverse ? "marquee-right" : "marquee-left"}`}
      >
        {loop.map((item, i) => (
          <figure
            key={`${item.src}-${i}`}
            className="w-[220px] card shrink-0 overflow-hidden sm:w-[260px]"
          >
            <img src={item.src} alt={item.label} className="aspect-square w-full object-cover" />
            <figcaption className="px-3 py-2 text-sm font-semibold text-navy">{item.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

export function PrintWorksBand({ items }: { items: WorkItem[] }) {
  const top = items;
  const bottom = [...items.slice(2), ...items.slice(0, 2)];
  return (
    <div className="marquee-band space-y-3">
      <PrintWorksRow items={top} />
      <PrintWorksRow items={bottom.length ? bottom : items} reverse />
    </div>
  );
}

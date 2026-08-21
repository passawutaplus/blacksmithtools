import Link from "next/link";

const SLIDES = [
  { src: "/hero/brands/milwaukee-dewalt.png", href: "/shop/milwaukee", label: "Milwaukee และ Dewalt" },
  { src: "/hero/brands/makita-bosch.png", href: "/shop/makita", label: "Makita และ Bosch" },
  { src: "/hero/brands/stanley-osuka.png", href: "/shop/osuka", label: "Stanley และ Osuka" },
  { src: "/hero/brands/total-ingco.png", href: "/shop/total", label: "Total และ Ingco" },
  { src: "/hero/brands/aeg-dongcheng.png", href: "/shop/dongcheng", label: "AEG และ DongCheng" },
  { src: "/hero/brands/skil-ryobi.png", href: "/shop?q=Skil", label: "Skil และ Ryobi" },
];

export function HeroBrandSlider() {
  const loop = [...SLIDES, ...SLIDES];
  return (
    <div className="absolute inset-x-0 bottom-0 z-10">
      <div className="pb-4 pt-6">
        <p className="container-bs mb-3 text-[11px] font-semibold tracking-wide text-white/70">
          เข้ากับยี่ห้อเครื่องมือ
        </p>
        <div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
          <div className="marquee-track marquee-left gap-6 px-4 sm:gap-8">
            {loop.map((slide, i) => (
              <Link
                key={`${slide.src}-${i}`}
                href={slide.href}
                className="relative flex h-28 w-40 shrink-0 items-center justify-center sm:h-36 sm:w-52 md:h-40 md:w-56"
                aria-label={slide.label}
              >
                <img
                  src={slide.src}
                  alt=""
                  className="h-full w-full object-contain mix-blend-screen"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

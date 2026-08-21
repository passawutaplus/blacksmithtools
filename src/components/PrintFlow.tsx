import type { LucideIcon } from "lucide-react";
import {
  MessageCircle,
  FileSearch,
  Wrench,
  CircleDollarSign,
  Wallet,
  Printer,
  Truck,
  RotateCcw,
} from "lucide-react";

type Step = { n: string; t: string; d: string };

const STEP_ICONS: LucideIcon[] = [
  MessageCircle,
  FileSearch,
  Wrench,
  CircleDollarSign,
  Wallet,
  Printer,
  Truck,
  RotateCcw,
];

function Arrow() {
  return (
    <svg className="shrink-0 text-forge" width="22" height="14" viewBox="0 0 22 14" aria-hidden>
      <path d="M0 7h16M12 2l8 5-8 5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function DownArrow() {
  return (
    <svg className="text-forge" width="14" height="22" viewBox="0 0 14 22" aria-hidden>
      <path d="M7 0v16M2 12l5 8 5-8" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function StepCard({ step, icon: Icon }: { step: Step; icon: LucideIcon }) {
  return (
    <div className="card h-full p-4">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forge text-sm font-black text-white">
          {step.n}
        </span>
        <Icon className="h-4 w-4 text-navy" aria-hidden />
      </div>
      <p className="mt-3 font-semibold text-navy">{step.t}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{step.d}</p>
    </div>
  );
}

export function PrintFlow({ steps }: { steps: Step[] }) {
  const top = steps.slice(0, 4);
  const bottom = steps.slice(4);

  return (
    <div className="mt-8">
      <ol className="lg:hidden">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[i] ?? MessageCircle;
          return (
            <li key={step.n}>
              <div className="flex gap-3">
                <div className="flex w-8 shrink-0 flex-col items-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-forge text-sm font-black text-white">
                    {step.n}
                  </span>
                  {i < steps.length - 1 ? <div className="min-h-8 w-0.5 flex-1 bg-forge/30" /> : null}
                </div>
                <div className="card mb-4 flex-1 p-4">
                  <p className="flex items-center gap-2 font-semibold text-navy">
                    <Icon className="h-4 w-4 text-forge" aria-hidden />
                    {step.t}
                  </p>
                  <p className="mt-1 text-sm text-muted">{step.d}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="hidden lg:block">
        <div className="mb-3 flex justify-between text-xs font-semibold text-forge">
          <span>เตรียมไฟล์ — ยังไม่ล็อกราคา</span>
          <span>เสนอราคา แล้วจ่ายก่อนพิมพ์</span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch">
          {top.map((step, i) => (
            <div key={step.n} className="contents">
              <StepCard step={step} icon={STEP_ICONS[i]} />
              {i < top.length - 1 ? (
                <div className="flex items-center px-1">
                  <Arrow />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className="flex justify-end pr-[11%]">
          <div className="flex flex-col items-center py-2">
            <DownArrow />
            <span className="text-[11px] font-semibold text-forge">ถัดไป</span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch">
          {bottom.map((step, i) => (
            <div key={step.n} className="contents">
              <StepCard step={step} icon={STEP_ICONS[i + 4]} />
              {i < bottom.length - 1 ? (
                <div className="flex items-center px-1">
                  <Arrow />
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <RotateCcw className="h-4 w-4 text-forge" aria-hidden />
          งานมีปัญหา กลับไปขั้นพิมพ์งาน ร้านพิมพ์แก้แล้วส่งใหม่
        </p>
      </div>
    </div>
  );
}

import { AssistantChrome } from "@/components/chang/AssistantChrome";

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white">
      <div className="container-bs py-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <AssistantChrome />
          {children}
        </div>
      </div>
    </div>
  );
}

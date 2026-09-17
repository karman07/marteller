import { PageHeader } from "@/components/dashboard/PageHeader";

export default function AiAssistantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="AI Assistant"
        description="A knowledge-base assistant that can auto-reply on WhatsApp, Email, and SMS."
      />
      <div className="px-8 py-6">{children}</div>
    </>
  );
}

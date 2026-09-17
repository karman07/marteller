import { PageHeader } from "@/components/dashboard/PageHeader";

export default function EmailLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Email"
        description="Sending domains and SMTP credentials for your self-hosted mail infrastructure."
      />
      <div className="px-8 py-6">{children}</div>
    </>
  );
}

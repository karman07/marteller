import { WorkflowEditorView } from "@/components/dashboard/workflows/WorkflowEditorView";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="h-full">
      <WorkflowEditorView workflowId={id} />
    </div>
  );
}

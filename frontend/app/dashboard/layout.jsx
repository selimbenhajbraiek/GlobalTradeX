import { DashboardShell } from "@/components/app/DashboardShell";
import { AssistantProvider } from "@/context/AssistantContext";

export default function DashboardLayout({ children }) {
  return (
    <AssistantProvider>
      <DashboardShell>{children}</DashboardShell>
    </AssistantProvider>
  );
}

import { VideoAssistantModal } from "@/components/assistant/VideoAssistantModal";
import { Chatbot } from "@/components/Chatbot";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AssistantProvider } from "@/context/AssistantContext";

export default function DashboardLayout({ children }) {
  return (
    <AssistantProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
        <Chatbot />
        <VideoAssistantModal />
      </div>
    </AssistantProvider>
  );
}

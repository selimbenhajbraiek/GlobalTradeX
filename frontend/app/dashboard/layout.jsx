import { Chatbot } from "@/components/Chatbot";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header />
        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
      <Chatbot />
    </div>
  );
}

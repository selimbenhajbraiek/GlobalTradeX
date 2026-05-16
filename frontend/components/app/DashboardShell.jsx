"use client";

import { VideoAssistantModal } from "@/components/assistant/VideoAssistantModal";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Chatbot } from "@/components/Chatbot";
import { useAuth } from "@/context/AuthContext";

import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

export function DashboardShell({ children }) {
  const { user, isLoading } = useAuth();
  const editorialRoles = ["admin", "importateur", "exportateur", "courtier", "transitaire"];
  const useEditorialShell = editorialRoles.includes(user?.role);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-kinetic border-t-transparent"
          aria-hidden
        />
      </div>
    );
  }

  if (useEditorialShell) {
    return (
      <>
        <div className="flex min-h-screen bg-background">
          <AppSidebar />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto px-6 py-8">{children}</main>
          </div>
        </div>
        <Chatbot />
        <VideoAssistantModal />
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
      <Chatbot />
      <VideoAssistantModal />
    </>
  );
}

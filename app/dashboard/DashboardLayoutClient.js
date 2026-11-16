
"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export default function DashboardLayoutClient({
  children,
  initialMode = "vertical",
}) {
  const [mode, setMode] = useState(initialMode);
  const [collapsed, setCollapsed] = useState(false);

  const isHorizontal = mode === "horizontal";

  function toggleSidebar() {
    setCollapsed((current) => !current);
  }

  return (
    <div
      className="erp-page-gradient min-h-dvh w-full"
      style={{
        backgroundColor: "var(--erp-page)",
        color: "var(--erp-text)",
      }}
    >
      <div
        className={
          isHorizontal
            ? "flex min-h-dvh w-full flex-col"
            : "flex min-h-dvh w-full flex-col md:flex-row"
        }
      >
        <Sidebar
          mode={mode}
          onModeChange={setMode}
          collapsed={collapsed}
          onToggleCollapsed={toggleSidebar}
        />

        <div
          className={
            isHorizontal
              ? "flex min-h-0 min-w-0 w-full flex-1 flex-col"
              : "flex min-h-dvh min-w-0 w-full flex-1 flex-col md:min-h-0"
          }
        >
          <div
            className="sticky top-0 z-30 shrink-0 border-b backdrop-blur-xl"
            style={{
              backgroundColor: "var(--erp-surface)",
              borderColor: "var(--erp-border)",
            }}
          >
            <Header />
          </div>

          <main className="min-h-0 min-w-0 w-full flex-1 px-4 py-5 sm:px-6 sm:py-7 xl:px-9 xl:py-8">
            <div className="mx-auto w-full max-w-[1800px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

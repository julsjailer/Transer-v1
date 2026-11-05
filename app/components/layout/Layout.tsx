import { HeaderActionsProvider } from "@agent-native/toolkit/app-shell";
import { AgentSidebar } from "@agent-native/toolkit/app/chat";

import { TAB_ID } from "@/lib/tab-id";

interface LayoutProps {
  children: React.ReactNode;
}

/** The right agent rail is opened only by explicit handoffs from Transer UI. */
export function Layout({ children }: LayoutProps) {
  return (
    <HeaderActionsProvider>
      <AgentSidebar
        position="right"
        storageKey="transer-agent-chat"
        browserTabId={TAB_ID}
        showModelSelector
      >
        <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground">
          <main className="agent-native-app-main min-w-0 flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
      </AgentSidebar>
    </HeaderActionsProvider>
  );
}

import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ExodusSidebar } from '@/components/admin/ExodusSidebar';

export default function ExodusLayout() {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden bg-background">
        <ExodusSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-12 flex items-center border-b border-border px-2 shrink-0 bg-card">
            <SidebarTrigger className="ml-1 text-muted-foreground hover:text-accent" />
            <span className="ml-3 text-accent font-bold tracking-wider text-sm">EXODUS: 10개의 재앙</span>
          </header>
          <main className="flex-1 overflow-y-auto overscroll-contain bg-background text-foreground" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

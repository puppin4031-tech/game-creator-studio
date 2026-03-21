import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { ExodusSidebar } from '@/components/admin/ExodusSidebar';

export default function ExodusLayout() {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden bg-[#0a1628]">
        <ExodusSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-12 flex items-center border-b border-[#1e2d4a] px-2 shrink-0 bg-[#0f1d32]">
            <SidebarTrigger className="ml-1 text-[#7b8da6] hover:text-[#d4a843]" />
            <span className="ml-3 text-[#d4a843] font-bold tracking-wider text-sm">EXODUS: 10개의 재앙</span>
          </header>
          <main className="flex-1 overflow-y-auto overscroll-contain bg-[#0a1628] text-[#e8e0d0]" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

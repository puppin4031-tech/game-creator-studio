import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export default function AdminLayout() {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-12 flex items-center border-b border-border px-2 shrink-0">
            <SidebarTrigger className="ml-1" />
          </header>
          <main className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

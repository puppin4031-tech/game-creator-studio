import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { LayoutDashboard, List, Users, Package, Puzzle, ArrowLeft, LogOut, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { title: '대시보드 홈', url: '/admin/exodus', icon: LayoutDashboard },
  { title: '10대 재앙 스테이지', url: '/admin/exodus/stages', icon: List },
  { title: 'NPC 도감', url: '/admin/exodus/npcs', icon: Users },
  { title: '아이템 프리셋', url: '/admin/exodus/items', icon: Package },
  { title: '퍼즐/퀴즈 메이커', url: '/admin/exodus/puzzle-maker', icon: Puzzle },
  { title: '스팟 관리', url: '/admin/exodus/spots', icon: MapPin },
];

export function ExodusSidebar() {
  const { profile, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r border-[#1e2d4a]">
      <SidebarContent className="bg-[#0f1d32]">
        {/* Back to admin */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/admin" className="text-[#7b8da6] hover:text-[#d4a843] hover:bg-[#162340]" activeClassName="">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    {!collapsed && <span className="text-[15px]">관리자 홈</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Exodus menu */}
        <SidebarGroup>
          <SidebarGroupLabel className="px-3">
            {!collapsed ? (
              <span className="text-[#d4a843] font-bold tracking-widest text-xs uppercase">⚡ Exodus</span>
            ) : (
              <span className="text-[#d4a843]">⚡</span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin/exodus'}
                      className="text-[#7b8da6] hover:text-[#e8e0d0] hover:bg-[#162340]"
                      activeClassName="bg-[#162340] text-[#d4a843] font-medium"
                    >
                      <item.icon className="mr-2 h-5 w-5" />
                      {!collapsed && <span className="text-[15px]">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2 bg-[#0f1d32] border-t border-[#1e2d4a]">
        {!collapsed && profile && (
          <div className="px-2 py-1 text-sm text-[#7b8da6] truncate mb-1">
            {profile.display_name || profile.email}
          </div>
        )}
        <Button
          variant="ghost" size="sm"
          className="w-full justify-start text-[15px] text-[#7b8da6] hover:text-[#d4a843] hover:bg-[#162340]"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-2" />
          {!collapsed && '로그아웃'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

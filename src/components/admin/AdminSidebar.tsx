import { useAuth } from '@/contexts/AuthContext';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Map, Users, CheckSquare, LayoutDashboard, PlusCircle, ClipboardList, LogOut, MapPin, Home, Palette, Zap, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';

const mainAdminItems = [
  { title: '대시보드', url: '/admin', icon: LayoutDashboard },
  { title: '전체 지도', url: '/admin/map', icon: Map },
  { title: '테마 관리', url: '/admin/themes', icon: Palette },
  { title: '관리자 관리', url: '/admin/users', icon: Users },
  { title: '캐릭터 애니메이션', url: '/admin/sprites', icon: Film },
  { title: '생존 아이템', url: '/admin/items', icon: Package },
  { title: '승인 관리', url: '/admin/approvals', icon: CheckSquare },
];

const subAdminItems = [
  { title: '내 구역', url: '/admin', icon: Map },
  { title: '미션 제작', url: '/admin/create-mission', icon: PlusCircle },
  { title: '승인 현황', url: '/admin/my-missions', icon: ClipboardList },
];

export function AdminSidebar() {
  const { profile, signOut, isMainAdmin } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const items = isMainAdmin ? mainAdminItems : subAdminItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Home link */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" className="hover:bg-muted/50" activeClassName="">
                    <Home className="mr-2 h-5 w-5" />
                    {!collapsed && <span className="text-[15px]">홈으로</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {!collapsed && (
              <span className="text-sm font-bold text-primary">
                {isMainAdmin ? 'Main Admin' : 'Sub Admin'}
              </span>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/admin'}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-medium"
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

        {/* EXODUS 대시보드 */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            {!collapsed && <span className="text-xs font-bold text-amber-500 tracking-wider">EXODUS</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/admin/exodus"
                    className="hover:bg-amber-500/10"
                    activeClassName="bg-amber-500/10 text-amber-600 font-medium"
                  >
                    <Zap className="mr-2 h-5 w-5" />
                    {!collapsed && <span className="text-[15px]">EXODUS 대시보드</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        {!collapsed && profile && (
          <div className="px-2 py-1 text-sm text-muted-foreground truncate mb-1">
            {profile.display_name || profile.email}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-[15px]" onClick={signOut}>
          <LogOut className="h-5 w-5 mr-2" />
          {!collapsed && '로그아웃'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

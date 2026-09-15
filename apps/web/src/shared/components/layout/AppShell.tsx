import { canManageInstructions, canSeeSettings, type SessionUser } from '@app/domain';
import { FileStack, GraduationCap, Grid3x3, Settings, Sparkles } from 'lucide-react';
import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
} from '@/shared/components/ui/sidebar';
import { useSessionUser } from '@/shared/lib/session/SessionContext';

interface NavItem {
    readonly to: string;
    readonly label: string;
    readonly icon: typeof FileStack;
    readonly isVisible: (user: SessionUser) => boolean;
}

const NAV_ITEMS: readonly NavItem[] = [
    { to: '/processes', label: 'Prozesse', icon: FileStack, isVisible: () => true },
    {
        to: '/instructions',
        label: 'Unterweisungen',
        icon: GraduationCap,
        isVisible: (u) => u.isQm || canManageInstructions(u),
    },
    {
        to: '/qualifications',
        label: 'Qualifikationsmatrix',
        icon: Grid3x3,
        isVisible: (u) => u.isAdministrator || u.isQm,
    },
    { to: '/assistant', label: 'Chatbot-Assistent', icon: Sparkles, isVisible: () => true },
    { to: '/settings', label: 'Einstellungen', icon: Settings, isVisible: canSeeSettings },
];

const ROLE_LABELS: readonly { readonly key: keyof SessionUser; readonly label: string }[] = [
    { key: 'isAdministrator', label: 'Administrator' },
    { key: 'isQm', label: 'QM' },
    { key: 'isProcessOwner', label: 'Prozessverantwortlicher' },
    { key: 'isAuthor', label: 'Verfasser' },
];

const initials = (name: string): string =>
    name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

function CurrentUser({ user }: { user: SessionUser }) {
    const roles = ROLE_LABELS.filter(({ key }) => user[key] === true)
        .map(({ label }) => label)
        .join(' · ');

    return (
        <div className="flex items-center gap-3 px-1 py-1">
            <div className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold">
                {initials(user.displayName)}
            </div>
            <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-medium">{user.displayName}</p>
                <p className="text-muted-foreground truncate text-xs">{roles || 'Keine Rolle'}</p>
            </div>
        </div>
    );
}

export function AppShell({ children }: { children: ReactNode }) {
    const user = useSessionUser();
    const { pathname } = useLocation();
    const items = NAV_ITEMS.filter((item) => item.isVisible(user));
    const current = items.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

    return (
        <SidebarProvider>
            <Sidebar collapsible="offcanvas" className="border-border/40 bg-sidebar/70 backdrop-blur-xl">
                <SidebarHeader className="border-sidebar-border border-b p-4">
                    <Link to="/processes" className="leading-tight">
                        <span className="block text-sm font-semibold tracking-tight">PRETTL electronics</span>
                        <span className="text-muted-foreground block text-xs">Prozessdokumentation</span>
                    </Link>
                </SidebarHeader>
                <SidebarContent className="px-2 py-4">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {items.map((item) => (
                                    <SidebarMenuItem key={item.to}>
                                        <SidebarMenuButton asChild isActive={item === current} tooltip={item.label}>
                                            <Link to={item.to}>
                                                <item.icon className="size-5" />
                                                <span>{item.label}</span>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter className="border-sidebar-border border-t p-4">
                    <CurrentUser user={user} />
                </SidebarFooter>
            </Sidebar>
            <SidebarInset className="flex min-w-0 flex-col bg-transparent">
                <header className="border-border/40 bg-background/70 sticky top-0 z-10 flex h-14 items-center gap-4 border-b px-4 backdrop-blur-xl md:hidden">
                    <SidebarTrigger />
                    <span className="text-sm font-medium">{current?.label ?? 'Prozessdokumentation'}</span>
                </header>
                <main className="flex-1 overflow-auto px-4 py-6 md:px-6 md:py-10">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}

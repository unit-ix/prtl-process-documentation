import { type ReactNode } from 'react';
import { LayoutDashboard, PanelsTopLeft } from 'lucide-react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/shared/components/ui/sidebar';
import { Button } from '@/shared/components/ui/button';
import { PERSONAS, type Persona, useRole } from '@/shared/lib/role/RoleContext';

// Statische Tag-1-Navigation. Die /prototype-Engine (Part E) hängt hier pro Feature
// eine react-router-NavLink-Zeile ein; A4 verdrahtet das _example-Feature.
const NAV_ITEMS = [{ label: 'Übersicht', icon: LayoutDashboard, active: true }] as const;

const PERSONA_LABELS: Record<Persona, string> = {
    admin: 'Admin',
    manager: 'Manager',
    employee: 'Mitarbeiter',
};

// PROTOTYPE-ONLY: Persona-Wechsel per UI. Produktion leitet die Persona aus dem
// Host-User ab (siehe RoleProvider) — dieser Switcher fällt dann weg.
function RoleSwitcher() {
    const { persona, setPersona } = useRole();
    return (
        <div className="flex flex-col gap-1.5">
            <span className="text-muted-foreground px-2 text-xs font-medium">Rolle (Prototyp)</span>
            <div className="flex flex-wrap gap-1">
                {PERSONAS.map((option) => (
                    <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant={option === persona ? 'default' : 'outline'}
                        onClick={() => setPersona(option)}
                    >
                        {PERSONA_LABELS[option]}
                    </Button>
                ))}
            </div>
        </div>
    );
}

// Die eine App-Shell: linke Sidebar (Header/Content/Footer/Rail) + SidebarInset für
// den Seiteninhalt. Feature-Seiten rendern als `children` in den Inset-Bereich.
export function AppShell({ children }: { children: ReactNode }) {
    return (
        <SidebarProvider>
            <Sidebar collapsible="icon">
                <SidebarHeader>
                    <div className="flex items-center gap-2 px-1 py-1">
                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md">
                            <PanelsTopLeft className="size-4" />
                        </div>
                        <div className="flex flex-col leading-tight">
                            <span className="text-sm font-semibold">UNIT IX</span>
                            <span className="text-muted-foreground text-xs">Prototype</span>
                        </div>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {NAV_ITEMS.map((item) => (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton isActive={item.active} tooltip={item.label}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
                <SidebarFooter>
                    <RoleSwitcher />
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <SidebarInset>
                <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
                    <SidebarTrigger />
                    <span className="text-sm font-medium">Prototype</span>
                </header>
                <main className="flex-1 p-4">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}

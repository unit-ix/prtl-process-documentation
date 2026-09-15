import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AreaSettings } from '../components/AreaSettings';
import { UserSettings } from '../components/UserSettings';

export function SettingsPage() {
    return (
        <div className="space-y-8">
            <header className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium tracking-[0.2em] uppercase">
                    PRETTL electronics
                </p>
                <h1 className="text-gradient-primary text-2xl font-semibold tracking-tight md:text-3xl">
                    Einstellungen
                </h1>
            </header>

            <Tabs defaultValue="areas">
                <TabsList>
                    <TabsTrigger value="areas">Bereiche</TabsTrigger>
                    <TabsTrigger value="users">Benutzer</TabsTrigger>
                </TabsList>
                <TabsContent value="areas">
                    <AreaSettings />
                </TabsContent>
                <TabsContent value="users">
                    <UserSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}

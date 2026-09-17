import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AreaSettings } from '../components/AreaSettings';
import { UserSettings } from '../components/UserSettings';

export function SettingsPage() {
    return (
        <div className="space-y-8">
            <PageHeader title="Einstellungen" description="Bereiche, Prozessverantwortliche und Rollen der Mitarbeiter." />

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

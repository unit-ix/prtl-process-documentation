import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { AreaSettings } from '../components/AreaSettings';
import { UserSettings } from '../components/UserSettings';

export function SettingsPage() {
    // Gesteuert statt defaultValue, damit die Reiter sich gegenseitig aufrufen können.
    const [tab, setTab] = useState('areas');

    return (
        <div className="space-y-8">
            <PageHeader title="Einstellungen" description="Bereiche, Prozessverantwortliche und Rollen der Mitarbeiter." />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="areas">Bereiche</TabsTrigger>
                    <TabsTrigger value="users">Benutzer</TabsTrigger>
                </TabsList>
                <TabsContent value="areas">
                    <AreaSettings onSwitch={() => setTab('users')} />
                </TabsContent>
                <TabsContent value="users">
                    <UserSettings onSwitch={() => setTab('areas')} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

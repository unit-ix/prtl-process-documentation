import { canChangeNumbers } from '@app/domain';
import { useState } from 'react';
import { PageHeader } from '@/shared/components/layout/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useSessionUser } from '@/shared/lib/session/SessionContext';
import { AreaSettings } from '../components/AreaSettings';
import { NumberSettings } from '../components/NumberSettings';
import { UserSettings } from '../components/UserSettings';

export function SettingsPage() {
    // Gesteuert statt defaultValue, damit die Reiter sich gegenseitig aufrufen können.
    const [tab, setTab] = useState('areas');
    const showNumbers = canChangeNumbers(useSessionUser());

    return (
        <div className="space-y-8">
            <PageHeader title="Einstellungen" description="Bereiche, Prozessverantwortliche, Rollen der Mitarbeiter und Dokumentnummern." />

            <Tabs value={tab} onValueChange={setTab}>
                <TabsList>
                    <TabsTrigger value="areas">Bereiche</TabsTrigger>
                    <TabsTrigger value="users">Benutzer</TabsTrigger>
                    {showNumbers ? <TabsTrigger value="numbers">Nummern</TabsTrigger> : null}
                </TabsList>
                <TabsContent value="areas">
                    <AreaSettings onSwitch={() => setTab('users')} />
                </TabsContent>
                <TabsContent value="users">
                    <UserSettings onSwitch={() => setTab('areas')} />
                </TabsContent>
                {showNumbers ? (
                    <TabsContent value="numbers">
                        <NumberSettings />
                    </TabsContent>
                ) : null}
            </Tabs>
        </div>
    );
}

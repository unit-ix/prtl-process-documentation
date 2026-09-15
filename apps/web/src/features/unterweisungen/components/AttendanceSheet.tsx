import type { InstructionDetailView } from '@app/domain';

// §7.4 — das einzige Druckerzeugnis der Anwendung. Sichtbar nur im Druck: kein zweiter Renderer,
// keine PDF-Bibliothek, und die Liste zeigt genau die Teilnehmer, die auch in der App stehen.
function MetaBlock({ instruction }: { instruction: InstructionDetailView }) {
    const rows = [
        ['Frist', instruction.dueDate ?? '—'],
        ['Wiederholung', instruction.recurrence],
        ['Hinweis', instruction.note ?? '—'],
    ];

    return (
        <table style={{ fontSize: '10pt', marginBottom: '16pt' }}>
            <tbody>
                {rows.map(([label, value]) => (
                    <tr key={label}>
                        <td style={{ paddingRight: '16pt', verticalAlign: 'top' }}>{label}</td>
                        <td>{value}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function AttendanceSheet({ instruction }: { instruction: InstructionDetailView }) {
    const title = instruction.instructionType === 'Sammel' ? 'Sammelunterweisung' : 'Einzelunterweisung';

    return (
        <div className="attendance-sheet hidden print:block">
            <h1 style={{ fontSize: '18pt', margin: '0 0 4pt' }}>{title}</h1>
            <p style={{ fontSize: '11pt', margin: '0 0 16pt' }}>
                {instruction.process.identifier ? `${instruction.process.identifier} · ` : ''}
                {instruction.process.title}
            </p>

            <MetaBlock instruction={instruction} />

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                <thead>
                    <tr>
                        <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left' }}>Name</th>
                        <th style={{ border: '1px solid #000', padding: '6pt', textAlign: 'left' }}>Abteilung</th>
                        <th style={{ border: '1px solid #000', padding: '6pt', width: '40%' }}>Unterschrift</th>
                    </tr>
                </thead>
                <tbody>
                    {instruction.participants.map((participant) => (
                        <tr key={participant.id}>
                            <td style={{ border: '1px solid #000', padding: '10pt 6pt' }}>
                                {participant.user.displayName}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '10pt 6pt' }}>
                                {participant.user.areaTitle ?? ''}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '10pt 6pt' }} />
                        </tr>
                    ))}
                </tbody>
            </table>

            <p style={{ fontSize: '9pt', marginTop: '16pt' }}>
                Erstellt am {new Date(instruction.createdAt).toLocaleDateString('de-DE')}
            </p>
        </div>
    );
}

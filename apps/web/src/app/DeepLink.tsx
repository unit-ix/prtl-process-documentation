import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Mails verlinken seit der Canvas-App mit `?pid=<id>` (§7.6) — der Parametername bleibt, damit
 * Links aus alten Mails weiter auflösen. Er steht VOR dem Hash, also in `location.search`, und
 * gehört dem HashRouter nicht: wir lesen ihn einmal, springen in die Detailseite und räumen ihn
 * aus der Adresszeile, damit ein Neuladen nicht erneut umleitet.
 */
export function DeepLink() {
    const navigate = useNavigate();

    useEffect(() => {
        const processId = new URLSearchParams(window.location.search).get('pid');
        if (processId === null || processId === '') return;

        window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
        navigate(`/processes/${processId}`, { replace: true });
    }, [navigate]);

    return null;
}

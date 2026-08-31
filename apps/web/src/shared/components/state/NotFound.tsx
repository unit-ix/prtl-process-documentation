import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';

interface NotFoundProps {
    title?: string;
    description?: string;
    homeHref?: string;
}

export function NotFound({
    title = 'Seite nicht gefunden',
    description = 'Diese Seite existiert nicht (mehr).',
    homeHref = '/',
}: NotFoundProps) {
    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
            <div className="space-y-1">
                <p className="text-4xl font-semibold tracking-tight">404</p>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-muted-foreground text-sm">{description}</p>
            </div>
            <Button asChild variant="outline" size="sm">
                <Link to={homeHref}>Zur Startseite</Link>
            </Button>
        </div>
    );
}

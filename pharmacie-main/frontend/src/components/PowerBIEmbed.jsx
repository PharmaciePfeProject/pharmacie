import { AlertCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function PowerBIEmbed({ title, url, height = "600px", className = "" }) {
  if (!url) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Rapport Power BI non configuré. Veuillez ajouter l'URL du rapport dans les variables d'environnement.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Button
          asChild
          size="sm"
          className="rounded-lg"
        >
          <a href={url} target="_blank" rel="noopener noreferrer">
            Ouvrir
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        <iframe
          title={title}
          src={url}
          width="100%"
          height={height}
          className="rounded-lg border border-border"
          frameBorder="0"
          allowFullScreen={true}
          allow="fullscreen clipboard-write clipboard-read xr-spatial-tracking"
          sandbox="allow-same-origin allow-scripts allow-popups allow-presentation allow-forms allow-popups-to-escape-sandbox"
        />
      </CardContent>
    </Card>
  );
}

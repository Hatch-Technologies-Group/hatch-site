import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function MarketingPage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold">Marketing</h1>
        <p className="text-sm text-muted-foreground">
          Choose what you want to work on — campaigns, templates, and the Marketing Studio.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Marketing Studio <Badge variant="secondary">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Generate listing flyers and branded assets from templates. Swap photos, update contact info, export PDF.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" asChild>
                <Link href="/dashboard/marketing/studio">Open Studio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Draft AI-powered emails and SMS campaigns, review them, and schedule sends.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/dashboard/marketing/campaigns">View campaigns</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              Lead Generation <Badge variant="secondary">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Build acquisition campaigns, publish landing pages, track conversions, and export audiences — all without external ad platform integrations.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" asChild>
                <Link href="/dashboard/marketing/lead-gen">Open lead gen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

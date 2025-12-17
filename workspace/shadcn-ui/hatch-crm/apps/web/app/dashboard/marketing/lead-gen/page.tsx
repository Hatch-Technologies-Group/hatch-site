import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LeadGenHomePage() {
  return (
    <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-semibold">Lead Generation</h1>
            <Badge variant="secondary">Beta</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Build acquisition campaigns, publish landing pages, track conversions, and export audiences.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/marketing">Marketing overview</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Acquisition Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Define channel/objective, generate clean UTMs, and track spend + CPL in Hatch.
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/marketing/lead-gen/campaigns">Manage campaigns</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Landing Pages</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Publish fast, conversion-focused pages with built-in attribution + consent capture.
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/marketing/lead-gen/landing-pages">Manage landing pages</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Audiences</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Define reusable audiences from your CRM and export hashed match files for ad platforms.
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/marketing/lead-gen/audiences">Manage audiences</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Conversions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              View conversion events and export offline conversions as CSV (manual upload workflow).
            </p>
            <Button size="sm" asChild>
              <Link href="/dashboard/marketing/lead-gen/conversions">View conversions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

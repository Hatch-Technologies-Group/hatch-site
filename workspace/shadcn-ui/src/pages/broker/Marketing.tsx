import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BrokerMarketingPage() {
  return (
    <div className="space-y-6">
      <Card className="!rounded-3xl p-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/45 via-white/12 to-white/0 dark:from-white/10 dark:via-white/5"
        />
        <div className="relative space-y-2">
          <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Marketing</p>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Choose a marketing workspace—generate listing assets, run AI campaigns, or manage drip automations.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              Marketing Studio <Badge variant="secondary">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Generate listing flyers and branded assets from templates. Swap photos, update contact info, then export.</p>
            <Button asChild size="sm">
              <Link to="/broker/marketing/studio">Open Studio</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">AI Campaign Center</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create and manage AI-generated nurture + listing campaigns. Draft with Haven or Lumen, then send.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/broker/marketing/campaign-center">Open Campaign Center</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Drip Campaigns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Build lightweight drips that run through Playbooks—no new AI surfaces required.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/broker/marketing/campaigns">Open Drips</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              Lead Generation <Badge variant="secondary">Beta</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Create acquisition campaigns, publish landing pages, track conversions, and export audiences.</p>
            <Button asChild size="sm" variant="outline">
              <Link to="/broker/marketing/lead-gen">Open Lead Gen</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

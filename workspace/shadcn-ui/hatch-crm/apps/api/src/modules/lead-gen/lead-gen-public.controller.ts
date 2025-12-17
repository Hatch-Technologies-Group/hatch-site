import { Body, Controller, Get, Param, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { ApiModule, ApiStandardErrors } from '../common';
import { CreateLeadDto } from '../org-leads/dto/create-lead.dto';
import { LeadGenService } from './lead-gen.service';

@ApiModule('Lead Gen Public', { secure: false })
@ApiTags('beta')
@ApiStandardErrors()
@Controller('lead-gen')
export class LeadGenPublicController {
  constructor(private readonly leadGen: LeadGenService) {}

  @Get('pixel.js')
  @ApiOkResponse({ schema: { type: 'string' } })
  async pixelJs(
    @Query('orgId') orgId: string,
    @Query('campaignId') campaignId: string | undefined,
    @Query('landingPageId') landingPageId: string | undefined,
    @Res() reply: FastifyReply,
    @Req() req: FastifyRequest
  ) {
    const resolvedOrgId = (orgId ?? '').trim();
    if (!resolvedOrgId) {
      reply.code(400);
      reply.header('Content-Type', 'application/javascript; charset=utf-8');
      return reply.send('throw new Error("orgId is required");');
    }

    const hostHeader = (req.headers['host'] as string | undefined)?.trim();
    const protocol = (req.headers['x-forwarded-proto'] as string) ?? ((req as any).protocol as string) ?? 'http';
    const requestOrigin = hostHeader ? `${protocol}://${hostHeader}` : `${protocol}://localhost`;

    const script = this.buildPixelScript({
      orgId: resolvedOrgId,
      campaignId: campaignId?.trim() || null,
      landingPageId: landingPageId?.trim() || null,
      requestOrigin
    });

    reply.header('Content-Type', 'application/javascript; charset=utf-8');
    reply.header('Cache-Control', 'public, max-age=300');
    return reply.send(script);
  }

  @Get('public/organizations/:orgId/landing-pages/:slug')
  async getPublicLandingPage(@Param('orgId') orgId: string, @Param('slug') slug: string) {
    const page = await this.leadGen.getPublicLandingPage(orgId, slug);
    return {
      id: page.id,
      organizationId: page.organizationId,
      campaignId: page.campaignId,
      slug: page.slug,
      title: page.title,
      description: page.description,
      seoTitle: page.seoTitle,
      seoDescription: page.seoDescription,
      layout: page.layout,
      formSchema: page.formSchema,
      publishedAt: page.publishedAt
    };
  }

  @Post('public/organizations/:orgId/landing-pages/:slug/submit')
  async submitPublicLandingPage(
    @Param('orgId') orgId: string,
    @Param('slug') slug: string,
    @Body() dto: CreateLeadDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('redirect') redirectUrl?: string,
    @Query('mode') mode?: string,
    @Query('debug') debug?: string
  ) {
    const lead = await this.leadGen.submitPublicLandingPageLead({
      orgId,
      slug,
      dto,
      req: { ip: req.ip, headers: req.headers as any }
    });

    const wantsRedirect = typeof redirectUrl === 'string' && redirectUrl.trim().length > 0;
    const resolvedMode = (mode ?? '').toLowerCase();

    if (wantsRedirect && resolvedMode !== 'json') {
      reply.redirect(302, redirectUrl);
      return reply;
    }

    if (debug === 'true') {
      return { ok: true, lead };
    }
    return { ok: true, leadId: lead.id };
  }

  private buildPixelScript(params: { orgId: string; campaignId: string | null; landingPageId: string | null; requestOrigin: string }) {
    const safe = (value: string | null) => (value ? value.replace(/\\/g, '\\\\').replace(/`/g, '\\`') : '');
    const orgId = safe(params.orgId);
    const campaignId = safe(params.campaignId);
    const landingPageId = safe(params.landingPageId);

    return `
(function(){
  var ORG_ID = \`${orgId}\`;
  var CAMPAIGN_ID = \`${campaignId}\` || null;
  var LANDING_PAGE_ID = \`${landingPageId}\` || null;

  function parseQuery(search){
    try {
      var s = (search || '').replace(/^\\?/, '');
      if (!s) return {};
      var out = {};
      s.split('&').forEach(function(kv){
        var parts = kv.split('=');
        var k = decodeURIComponent(parts[0] || '').trim();
        if (!k) return;
        var v = decodeURIComponent(parts.slice(1).join('=') || '').trim();
        out[k] = v;
      });
      return out;
    } catch(_e){ return {}; }
  }

  function uuid(){
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      var buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      buf[6] = (buf[6] & 0x0f) | 0x40;
      buf[8] = (buf[8] & 0x3f) | 0x80;
      var hex = Array.prototype.map.call(buf, function(b){ return ('00' + b.toString(16)).slice(-2); }).join('');
      return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
      var r = Math.random()*16|0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function getAnonId(){
    try {
      var key = 'hatch_anonymous_id';
      var v = localStorage.getItem(key);
      if (v && v.length > 10) return v;
      v = uuid();
      localStorage.setItem(key, v);
      return v;
    } catch(_e) {
      return uuid();
    }
  }

  function apiBase(){
    try {
      var src = document.currentScript && document.currentScript.src;
      var url = src ? new URL(src) : null;
      return url ? (url.origin + '/api/v1') : '${params.requestOrigin}/api/v1';
    } catch(_e) {
      return '${params.requestOrigin}/api/v1';
    }
  }

  function postEvent(name, props){
    var payload = {
      name: name,
      anonymousId: getAnonId(),
      orgId: ORG_ID,
      timestamp: new Date().toISOString(),
      properties: props || {}
    };
    if (CAMPAIGN_ID) payload.properties.campaignId = CAMPAIGN_ID;
    if (LANDING_PAGE_ID) payload.properties.landingPageId = LANDING_PAGE_ID;

    var url = apiBase() + '/tracking/events';
    try {
      if (navigator.sendBeacon) {
        var ok = navigator.sendBeacon(url, new Blob([JSON.stringify(payload)], { type: 'application/json' }));
        if (ok) return;
      }
    } catch(_e) {}

    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        credentials: 'omit'
      }).catch(function(){});
    } catch(_e) {}
  }

  function trackPage(){
    var q = parseQuery(location.search || '');
    postEvent('leadgen.page_viewed', {
      url: location.href,
      path: location.pathname,
      referrer: document.referrer || null,
      utm_source: q.utm_source || q.utmSource || null,
      utm_medium: q.utm_medium || q.utmMedium || null,
      utm_campaign: q.utm_campaign || q.utmCampaign || null,
      gclid: q.gclid || null,
      fbclid: q.fbclid || null
    });
  }

  function trackSession(){
    try {
      var key = 'hatch_session_started_at';
      var ts = sessionStorage.getItem(key);
      var now = Date.now();
      if (!ts || (now - Number(ts)) > (30 * 60 * 1000)) {
        sessionStorage.setItem(key, String(now));
        postEvent('session.started', { url: location.href, referrer: document.referrer || null });
      }
    } catch(_e) {}
  }

  trackSession();
  trackPage();

  window.HatchPixel = window.HatchPixel || {};
  window.HatchPixel.track = function(name, props){ postEvent(String(name || ''), props || {}); };
  window.HatchPixel.identify = function(personId){
    try { postEvent('leadgen.identify', { personId: String(personId || '') }); } catch(_e) {}
  };
})();`;
  }
}

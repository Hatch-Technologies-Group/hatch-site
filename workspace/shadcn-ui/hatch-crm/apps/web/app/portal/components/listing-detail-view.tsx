'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/errors';
import { createAuthenticatedLead, createPublicLead } from '@/lib/api/leads';
import { createAuthenticatedOfferIntent, createPublicOfferIntent } from '@/lib/api/lois';
import type { OrgListingDetail } from '@/lib/api/org-listings';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const financingOptions = ['CASH', 'CONVENTIONAL', 'FHA', 'VA', 'OTHER'];

interface ListingDetailViewProps {
  orgId: string;
  listing: OrgListingDetail;
}

export function ListingDetailView({ orgId, listing }: ListingDetailViewProps) {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState({
    offeredPrice: '',
    financingType: '',
    closingTimeline: '',
    contingencies: '',
    comments: ''
  });
  const [offerStatusMessage, setOfferStatusMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        listingId: listing.id,
        ...formState
      };
      try {
        return await createAuthenticatedLead(orgId, payload);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return createPublicLead(orgId, payload);
        }
        throw error;
      }
    },
    onSuccess: () => {
      setStatusMessage('Thanks! Our team will be in touch shortly.');
      setFormState({ name: '', email: '', phone: '', message: '' });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to submit request. Please try again.';
      setStatusMessage(message);
    }
  });

  const handleChange = (field: keyof typeof formState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleOfferChange = (field: keyof typeof offerForm, value: string) => {
    setOfferForm((prev) => ({ ...prev, [field]: value }));
  };

  const offerMutation = useMutation({
    mutationFn: async () => {
      const offeredPriceValue = offerForm.offeredPrice.trim() ? Number(offerForm.offeredPrice) : undefined;
      const payload = {
        listingId: listing.id,
        offeredPrice: Number.isFinite(offeredPriceValue ?? NaN) ? offeredPriceValue : undefined,
        financingType: offerForm.financingType || undefined,
        closingTimeline: offerForm.closingTimeline || undefined,
        contingencies: offerForm.contingencies || undefined,
        comments: offerForm.comments || undefined
      };
      try {
        return await createAuthenticatedOfferIntent(orgId, payload);
      } catch (error) {
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          return createPublicOfferIntent(orgId, payload);
        }
        throw error;
      }
    },
    onSuccess: () => {
      setOfferStatusMessage('Offer submitted! Our team will reach out shortly.');
      setOfferForm({
        offeredPrice: '',
        financingType: '',
        closingTimeline: '',
        contingencies: '',
        comments: ''
      });
    },
    onError: (error) => {
      const message = error instanceof ApiError ? error.message : 'Unable to submit offer. Please try again.';
      setOfferStatusMessage(message);
    }
  });

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:flex-row">
      <div className="flex-1 space-y-4">
        <Link href="/portal" className="text-sm text-brand-600">
          ← Back to listings
        </Link>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">{listing.propertyType ?? 'Residential'}</p>
          <h1 className="text-3xl font-semibold text-slate-900">{listing.addressLine1}</h1>
          <p className="text-sm text-slate-500">
            {listing.city}, {listing.state} {listing.postalCode}
          </p>
        </div>
        <p className="text-2xl font-semibold text-slate-900">
          {listing.listPrice ? currency.format(listing.listPrice) : 'Price on request'}
        </p>
        <div className="text-sm text-slate-500">
          <span>{listing.bedrooms ?? '-'} bd</span> · <span>{listing.bathrooms ?? '-'} ba</span> ·{' '}
          <span>{listing.squareFeet ?? '—'} sqft</span>
        </div>
        <div className="space-y-2 text-sm text-slate-600">
          <p>This listing is exclusively represented by the Hatch brokerage.</p>
          {listing.agentProfile?.user ? (
            <p>
              Contact: {listing.agentProfile.user.firstName} {listing.agentProfile.user.lastName} ·{' '}
              {listing.agentProfile.user.email}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex-1 space-y-4">
        <Card id="inquiry" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Request info</h2>
            <p className="text-sm text-slate-500">Tell us how to reach you and what you&apos;re looking for.</p>
          </div>
          <Input
            placeholder="Your name"
            value={formState.name}
            onChange={(event) => handleChange('name', event.target.value)}
          />
          <Input
            placeholder="Email"
            type="email"
            value={formState.email}
            onChange={(event) => handleChange('email', event.target.value)}
          />
          <Input
            placeholder="Phone"
            value={formState.phone}
            onChange={(event) => handleChange('phone', event.target.value)}
          />
          <Textarea
            placeholder="Message"
            value={formState.message}
            onChange={(event) => handleChange('message', event.target.value)}
          />
          {statusMessage ? <p className="text-sm text-slate-500">{statusMessage}</p> : null}
          <Button className="w-full" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Sending...' : 'Submit request'}
          </Button>
        </Card>

        <Card className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Submit an Offer of Intent</h2>
            <p className="text-sm text-slate-500">
              Share your pricing, timeline, and contingencies so our brokerage can review a formal letter of intent.
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="offer-price" className="text-sm font-medium text-slate-700">
              Offered price
            </label>
            <Input
              id="offer-price"
              type="number"
              min={0}
              placeholder="500000"
              value={offerForm.offeredPrice}
              onChange={(event) => handleOfferChange('offeredPrice', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="offer-financing" className="text-sm font-medium text-slate-700">
              Financing type
            </label>
            <select
              id="offer-financing"
              aria-label="Financing type"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              value={offerForm.financingType}
              onChange={(event) => handleOfferChange('financingType', event.target.value)}
            >
              <option value="">Select financing</option>
              {financingOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="offer-timeline" className="text-sm font-medium text-slate-700">
              Closing timeline
            </label>
            <Input
              id="offer-timeline"
              placeholder="e.g. 30 days"
              value={offerForm.closingTimeline}
              onChange={(event) => handleOfferChange('closingTimeline', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="offer-contingencies" className="text-sm font-medium text-slate-700">
              Contingencies
            </label>
            <Textarea
              id="offer-contingencies"
              placeholder="Financing, inspections, sale of current home, etc."
              value={offerForm.contingencies}
              onChange={(event) => handleOfferChange('contingencies', event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="offer-comments" className="text-sm font-medium text-slate-700">
              Additional comments
            </label>
            <Textarea
              id="offer-comments"
              placeholder="Share any context for the brokerage team."
              value={offerForm.comments}
              onChange={(event) => handleOfferChange('comments', event.target.value)}
            />
          </div>
          {offerStatusMessage ? <p className="text-sm text-slate-500">{offerStatusMessage}</p> : null}
          <Button className="w-full" disabled={offerMutation.isPending} onClick={() => offerMutation.mutate()}>
            {offerMutation.isPending ? 'Submitting offer...' : 'Send offer of intent'}
          </Button>
        </Card>
      </div>
    </section>
  );
}

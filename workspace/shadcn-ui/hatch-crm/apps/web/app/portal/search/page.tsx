'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ListingSearchResult, searchListings } from '@/lib/api/search';
import { useOrgId } from '@/lib/hooks/useOrgId';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

type RentalFilter = 'all' | 'sale' | 'rental';

export default function PortalSearchPage() {
  const orgId = useOrgId();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minBedrooms, setMinBedrooms] = useState('');
  const [maxBedrooms, setMaxBedrooms] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [rentalFilter, setRentalFilter] = useState<RentalFilter>('all');

  const [results, setResults] = useState<ListingSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!orgId) return;
    setLoading(true);
    setError(null);
    setHasSearched(true);

    const payload: Parameters<typeof searchListings>[1] = { limit: 24 };
    const trimmedQuery = query.trim();
    if (trimmedQuery) payload.query = trimmedQuery;
    const trimmedCity = city.trim();
    if (trimmedCity) payload.city = trimmedCity;
    const trimmedState = stateRegion.trim();
    if (trimmedState) payload.state = trimmedState;
    const trimmedPostal = postalCode.trim();
    if (trimmedPostal) payload.postalCode = trimmedPostal;
    if (minPrice) payload.minPrice = Number(minPrice);
    if (maxPrice) payload.maxPrice = Number(maxPrice);
    if (minBedrooms) payload.minBedrooms = Number(minBedrooms);
    if (maxBedrooms) payload.maxBedrooms = Number(maxBedrooms);
    const trimmedPropertyType = propertyType.trim();
    if (trimmedPropertyType) payload.propertyType = trimmedPropertyType;
    if (rentalFilter !== 'all') {
      payload.isRental = rentalFilter === 'rental';
    }

    try {
      const response = await searchListings(orgId, payload);
      setResults(response.items);
    } catch (err) {
      console.error(err);
      setError('Unable to search listings right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold text-slate-900">MLS & brokerage listings</CardTitle>
          <p className="text-sm text-slate-500">Search across MLS feeds connected to this brokerage plus its in-house listings.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-3 md:grid-cols-4">
            <Input
              className="md:col-span-2"
              placeholder="City, zip, MLS #, address..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Input placeholder="City" value={city} onChange={(event) => setCity(event.target.value)} />
            <Input placeholder="State" value={stateRegion} onChange={(event) => setStateRegion(event.target.value)} />
            <Input placeholder="Postal code" value={postalCode} onChange={(event) => setPostalCode(event.target.value)} />
            <Input
              type="number"
              placeholder="Min price"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Max price"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Min beds"
              value={minBedrooms}
              onChange={(event) => setMinBedrooms(event.target.value)}
            />
            <Input
              type="number"
              placeholder="Max beds"
              value={maxBedrooms}
              onChange={(event) => setMaxBedrooms(event.target.value)}
            />
            <Input
              className="md:col-span-2"
              placeholder="Property type (e.g. RESIDENTIAL)"
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
            />
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span>Showing:</span>
              <div className="flex gap-2">
                {(['all', 'sale', 'rental'] as RentalFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      rentalFilter === option ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-600'
                    }`}
                    onClick={() => setRentalFilter(option)}
                  >
                    {option === 'all' ? 'All' : option === 'sale' ? 'For Sale' : 'Rentals'}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" disabled={loading} className="md:col-span-1">
              {loading ? 'Searching…' : 'Search'}
            </Button>
          </form>
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {hasSearched && results.length === 0 && !loading ? (
          <p className="col-span-full rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            No listings match those filters. Try broadening your search.
          </p>
        ) : null}

        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={`search-skeleton-${index}`} className="h-48 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))
          : results.map((result) => <SearchResultCard key={result.id} result={result} />)}
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: ListingSearchResult }) {
  return (
    <Card className="rounded-2xl border border-slate-200 bg-white">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-slate-900">
          {result.addressLine1}
          {result.addressLine2 ? `, ${result.addressLine2}` : ''}
        </CardTitle>
        <p className="text-sm text-slate-500">
          {result.city}, {result.state} {result.postalCode}
        </p>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-slate-600">
        {result.listPrice != null ? <p className="text-lg font-semibold text-slate-900">{currency.format(result.listPrice)}</p> : null}
        <p>
          {result.bedrooms ?? 0} bd • {result.bathrooms ?? 0} ba • {result.squareFeet ?? 0} sqft
        </p>
        <p className="text-xs text-slate-500">
          {result.isRental ? 'Rental' : 'For Sale'}
          {result.propertyType ? ` • ${result.propertyType}` : ''}
          {result.mlsNumber ? ` • MLS #${result.mlsNumber}` : ''}
        </p>
      </CardContent>
    </Card>
  );
}

import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import { mockConsumerProperties, MockConsumerProperty } from './consumer.mock';

@Controller('consumer-properties')
export class ConsumerPropertiesController {
  @Get()
  list(@Query('limit') limit?: string, @Query('q') query?: string, @Query('filters') filters?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    const parsedFilters = parseFilters(filters);

    let items = applyQuery(mockConsumerProperties, query);
    items = applyFilters(items, parsedFilters);
    const total = items.length;
    const data = parsedLimit ? items.slice(0, parsedLimit) : items;

    return {
      data,
      total
    };
  }

  @Get(':identifier')
  detail(@Param('identifier') identifier: string) {
    const decoded = decodeURIComponent(identifier).toLowerCase();
    const property = mockConsumerProperties.find(
      (item) => item.id.toLowerCase() === decoded || (item.slug ?? '').toLowerCase() === decoded
    );

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return {
      data: property
    };
  }
}

type ParsedFilters = {
  priceMin?: number
  priceMax?: number
  propertyType?: string
  beds?: number
  bedroomsMin?: number
  baths?: number
  bathroomsMin?: number
  status?: string
}

const parseFilters = (filters?: string): ParsedFilters => {
  if (!filters) return {};
  try {
    const parsed = JSON.parse(filters);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const applyQuery = (items: MockConsumerProperty[], query?: string) => {
  if (!query) return items;
  const term = query.trim().toLowerCase();
  if (!term) return items;
  return items.filter((item) => {
    const values = [
      item.address_line,
      item.city,
      item.state_code,
      item.zip_code,
      item.property_type,
      item.property_sub_type,
      item.public_remarks
    ];
    return values.some((value) => value?.toLowerCase().includes(term));
  });
};

const applyFilters = (items: MockConsumerProperty[], filters: ParsedFilters) => {
  let results = items;

  if (typeof filters.priceMin === 'number' && Number.isFinite(filters.priceMin)) {
    results = results.filter((item) => (item.list_price ?? 0) >= filters.priceMin!);
  }

  if (typeof filters.priceMax === 'number' && Number.isFinite(filters.priceMax)) {
    results = results.filter((item) => (item.list_price ?? 0) <= filters.priceMax!);
  }

  const minBeds = filters.bedroomsMin ?? filters.beds;
  if (typeof minBeds === 'number' && Number.isFinite(minBeds) && minBeds > 0) {
    results = results.filter((item) => (item.bedrooms_total ?? 0) >= minBeds);
  }

  const minBaths = filters.bathroomsMin ?? filters.baths;
  if (typeof minBaths === 'number' && Number.isFinite(minBaths) && minBaths > 0) {
    results = results.filter((item) => (item.bathrooms_total ?? 0) >= minBaths);
  }

  if (typeof filters.propertyType === 'string' && filters.propertyType.trim()) {
    const typeTerm = filters.propertyType.trim().toLowerCase();
    results = results.filter((item) => (item.property_type ?? '').toLowerCase().includes(typeTerm));
  }

  if (filters.status === 'sold') {
    results = results.filter((item) => item.state === 'SOLD');
  } else if (filters.status === 'pending') {
    results = results.filter((item) => item.state === 'PROPERTY_PENDING');
  } else if (filters.status === 'active') {
    results = results.filter((item) => item.state === 'LIVE');
  }

  return results;
};

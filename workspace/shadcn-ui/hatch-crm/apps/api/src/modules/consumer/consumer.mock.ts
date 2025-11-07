export interface MockConsumerProperty {
  id: string
  slug: string | null
  status: string | null
  state: 'PROPERTY_PENDING' | 'LIVE' | 'SOLD'
  published_at: string | null
  updated_at: string
  address_line: string | null
  street_number: string | null
  street_name: string | null
  street_suffix: string | null
  city: string | null
  state_code: string | null
  zip_code: string | null
  latitude: number | null
  longitude: number | null
  list_price: number | null
  bedrooms_total: number | null
  bathrooms_total: number | null
  bathrooms_full: number | null
  bathrooms_half: number | null
  living_area_sq_ft: number | null
  lot_size_sq_ft: number | null
  lot_size_acres: number | null
  year_built: number | null
  property_type: string | null
  property_sub_type: string | null
  cover_photo_url: string | null
  photos: string[] | null
  public_remarks: string | null
  brokerage_name: string | null
  brokerage_phone: string | null
}

const basePublishedAt = '2025-02-10T10:00:00.000Z'

export const mockConsumerProperties: MockConsumerProperty[] = [
  {
    id: 'consumer-1',
    slug: '123-harbor-way-miami-fl-33101',
    status: 'Active',
    state: 'LIVE',
    published_at: basePublishedAt,
    updated_at: basePublishedAt,
    address_line: '123 Harbor Way',
    street_number: '123',
    street_name: 'Harbor',
    street_suffix: 'Way',
    city: 'Miami',
    state_code: 'FL',
    zip_code: '33101',
    latitude: 25.7826,
    longitude: -80.1341,
    list_price: 975000,
    bedrooms_total: 3,
    bathrooms_total: 2.5,
    bathrooms_full: 2,
    bathrooms_half: 1,
    living_area_sq_ft: 2100,
    lot_size_sq_ft: 5400,
    lot_size_acres: 0.12,
    year_built: 2015,
    property_type: 'SINGLE_FAMILY',
    property_sub_type: 'DETACHED',
    cover_photo_url: 'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=1200&auto=format',
    photos: [
      'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?w=1200&auto=format',
      'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&auto=format',
      'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&auto=format'
    ],
    public_remarks:
      'Waterfront residence with private dock, chef kitchen, and panoramic bay views. Minutes from the Miami Design District.',
    brokerage_name: 'Harborfront Realty',
    brokerage_phone: '+1 (305) 555-0112'
  },
  {
    id: 'consumer-2',
    slug: '789-bayfront-drive-miami-fl-33132',
    status: 'Active',
    state: 'LIVE',
    published_at: basePublishedAt,
    updated_at: basePublishedAt,
    address_line: '789 Bayfront Drive',
    street_number: '789',
    street_name: 'Bayfront',
    street_suffix: 'Drive',
    city: 'Miami',
    state_code: 'FL',
    zip_code: '33132',
    latitude: 25.7859,
    longitude: -80.1870,
    list_price: 1250000,
    bedrooms_total: 4,
    bathrooms_total: 3,
    bathrooms_full: 3,
    bathrooms_half: 0,
    living_area_sq_ft: 2850,
    lot_size_sq_ft: 6200,
    lot_size_acres: 0.14,
    year_built: 2018,
    property_type: 'SINGLE_FAMILY',
    property_sub_type: 'DETACHED',
    cover_photo_url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&auto=format',
    photos: [
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&auto=format',
      'https://images.unsplash.com/photo-1628744393981-5e0fc873d4a5?w=1200&auto=format',
      'https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&auto=format'
    ],
    public_remarks:
      'Bayfront modern masterpiece featuring floor-to-ceiling glass, saltwater pool, and smart home automation throughout.',
    brokerage_name: 'Skyline Estates',
    brokerage_phone: '+1 (305) 555-0198'
  },
  {
    id: 'consumer-3',
    slug: '55-ocean-breeze-ave-fort-lauderdale-fl-33301',
    status: 'Active',
    state: 'LIVE',
    published_at: basePublishedAt,
    updated_at: basePublishedAt,
    address_line: '55 Ocean Breeze Ave',
    street_number: '55',
    street_name: 'Ocean Breeze',
    street_suffix: 'Ave',
    city: 'Fort Lauderdale',
    state_code: 'FL',
    zip_code: '33301',
    latitude: 26.1224,
    longitude: -80.1373,
    list_price: 835000,
    bedrooms_total: 3,
    bathrooms_total: 2,
    bathrooms_full: 2,
    bathrooms_half: 0,
    living_area_sq_ft: 1980,
    lot_size_sq_ft: 4800,
    lot_size_acres: 0.11,
    year_built: 2012,
    property_type: 'TOWNHOUSE',
    property_sub_type: 'ATTACHED',
    cover_photo_url: 'https://images.unsplash.com/photo-1499956794511-58caceb28816?w=1200&auto=format',
    photos: [
      'https://images.unsplash.com/photo-1499956794511-58caceb28816?w=1200&auto=format',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&auto=format',
      'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1200&auto=format'
    ],
    public_remarks:
      'Townhome in the Las Olas Isles with rooftop terrace, private elevator, and walkability to premier dining.',
    brokerage_name: 'Coastal Luxe Group',
    brokerage_phone: '+1 (954) 555-0147'
  },
  {
    id: 'consumer-4',
    slug: '4422-coral-reef-way-key-biscayne-fl-33149',
    status: 'Active',
    state: 'LIVE',
    published_at: basePublishedAt,
    updated_at: basePublishedAt,
    address_line: '4422 Coral Reef Way',
    street_number: '4422',
    street_name: 'Coral Reef',
    street_suffix: 'Way',
    city: 'Key Biscayne',
    state_code: 'FL',
    zip_code: '33149',
    latitude: 25.6938,
    longitude: -80.1580,
    list_price: 1645000,
    bedrooms_total: 5,
    bathrooms_total: 4.5,
    bathrooms_full: 4,
    bathrooms_half: 1,
    living_area_sq_ft: 3480,
    lot_size_sq_ft: 7800,
    lot_size_acres: 0.18,
    year_built: 2020,
    property_type: 'SINGLE_FAMILY',
    property_sub_type: 'DETACHED',
    cover_photo_url: 'https://images.unsplash.com/photo-1430285561322-7808604715df?w=1200&auto=format',
    photos: [
      'https://images.unsplash.com/photo-1430285561322-7808604715df?w=1200&auto=format',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&auto=format',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=1200&auto=format'
    ],
    public_remarks:
      'Key Biscayne luxury with resort-style pool, summer kitchen, and private beach club membership eligibility.',
    brokerage_name: 'Island Signature Homes',
    brokerage_phone: '+1 (305) 555-0177'
  }
]

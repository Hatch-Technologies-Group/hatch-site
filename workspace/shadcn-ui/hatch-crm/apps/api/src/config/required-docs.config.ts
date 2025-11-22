export type RequiredDocsMapping = Record<
  string,
  Record<string, string[]>
>;

// Simple static mapping TC/AI can use to reason about required forms.
export const REQUIRED_DOCS: RequiredDocsMapping = {
  NABOR: {
    ResidentialSale: [
      'NABOR Residential Sales Contract',
      'NABOR Seller Disclosure',
      'Lead Paint Addendum'
    ]
  },
  Florida: {
    FR_SPA: [
      'FR Residential Contract for Sale and Purchase',
      'FR Condo Addendum',
      'FR HOA Disclosure'
    ]
  },
  FannieMae: {
    REO_Sale: ['Fannie Mae REO Contract', 'Fannie Mae REO Addendum'],
    Loan: ['Fannie Mae Uniform Residential Loan Application']
  }
};

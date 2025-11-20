export class OfferIntentResponseDto {
  id!: string;
  listingId!: string;
  leadId?: string | null;
  consumerId?: string | null;
  status!: string;
  offeredPrice?: number | null;
  financingType?: string | null;
  closingTimeline?: string | null;
  contingencies?: string | null;
  comments?: string | null;
  createdAt!: string;
  updatedAt!: string;
}

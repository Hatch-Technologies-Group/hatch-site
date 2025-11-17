import { TrackEventDto } from './dto/track-event.dto';

export type ClientAnalyticsEventPayload = TrackEventDto & {
  receivedAt: string;
  ipAddress?: string;
  userAgent?: string;
};


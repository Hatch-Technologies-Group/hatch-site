import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsService {
  constructor(private readonly emitter: EventEmitter2) {}

  emit(event: string, payload: Record<string, unknown>) {
    this.emitter.emit(event, payload);
  }
}

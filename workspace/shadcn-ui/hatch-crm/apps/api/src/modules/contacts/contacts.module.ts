import { Module } from '@nestjs/common';

import { OutboxModule } from '../outbox/outbox.module';
import { PlatformModule } from '../../platform/platform.module';
import { AiModule } from '../ai/ai.module';
import { ContactsController } from './contacts.controller';
import { ContactListingsController } from './contact-listings.controller';
import { ContactActivityController } from './contact-activity.controller';
import { ContactsService } from './contacts.service';
import { ContactListingsService } from './contact-listings.service';
import { ContactReadModelService } from './read-model.service';
import { ContactsRepo } from './contacts.repo';

@Module({
  imports: [OutboxModule, PlatformModule, AiModule],
  controllers: [ContactsController, ContactListingsController, ContactActivityController],
  providers: [
    ContactsService,
    ContactReadModelService,
    ContactsRepo,
    ContactListingsService
  ],
  exports: [ContactReadModelService, ContactListingsService]
})
export class ContactsModule {}

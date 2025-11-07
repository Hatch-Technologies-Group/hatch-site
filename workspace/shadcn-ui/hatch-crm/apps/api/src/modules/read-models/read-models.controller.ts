import { Controller, Post, UseGuards } from '@nestjs/common';

import { ApiModule, ApiStandardErrors, OrgAdminGuard } from '../common';
import { ContactReadModelService } from '../contacts/read-model.service';

@ApiModule('Read Models')
@ApiStandardErrors()
@Controller('read-models')
export class ReadModelsController {
  constructor(private readonly contactRM: ContactReadModelService) {}

  @UseGuards(OrgAdminGuard)
  @Post('contacts/refresh')
  async refreshContacts(): Promise<{ ok: true }> {
    await this.contactRM.refresh();
    return { ok: true };
  }
}

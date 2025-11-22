import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'
import { PlaybooksService } from './playbooks.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('playbooks')
@ApiBearerAuth()
@Controller('organizations/:orgId/playbooks/ai')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class PlaybooksAiController {
  constructor(
    private readonly aiEmployees: AiEmployeesService,
    private readonly playbooks: PlaybooksService
  ) {}

  @Post('generate')
  async generate(
    @Param('orgId') orgId: string,
    @Body() body: { text: string },
    @Req() req: AuthedRequest
  ) {
    if (!req.user?.userId) {
      throw new Error('Missing user context')
    }
    if (!body?.text || !body.text.trim()) {
      throw new Error('text is required')
    }

    const aiResult = await this.aiEmployees.runPersona('playbookGenerator', {
      organizationId: orgId,
      userId: req.user.userId,
      input: { prompt: body.text }
    })

    let draft: any
    try {
      draft = aiResult.structured ?? JSON.parse(aiResult.rawText ?? '{}')
    } catch (error) {
      draft = null
    }

    const validated = this.playbooks.validatePlaybookDraft(draft)
    return { draft: validated }
  }
}

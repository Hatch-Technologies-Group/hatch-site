import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-preferences.dto';

@Controller('organizations/:orgId/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@Param('orgId') orgId: string, @Query() query: ListNotificationsDto, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.notifications.listForUser(orgId, userId, query.limit ?? 20, query.cursor);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.notifications.markAsRead(id, userId);
  }

  @Post('read-all')
  markAll(@Param('orgId') orgId: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.notifications.markAllAsRead(orgId, userId);
  }

  @Get('preferences')
  getPreferences(@Param('orgId') orgId: string, @Req() req: any) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.notifications.getOrCreatePreferences(orgId, userId);
  }

  @Patch('preferences')
  updatePreferences(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateNotificationPreferencesDto,
    @Req() req: any
  ) {
    const userId = req.user?.sub ?? req.user?.userId;
    return this.notifications.updatePreferences(orgId, userId, dto);
  }
}

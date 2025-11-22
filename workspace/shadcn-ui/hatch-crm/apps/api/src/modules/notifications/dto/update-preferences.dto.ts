import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  inAppEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  leadNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  offerIntentNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  rentalNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  accountingNotificationsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  aiNotificationsEnabled?: boolean;
}

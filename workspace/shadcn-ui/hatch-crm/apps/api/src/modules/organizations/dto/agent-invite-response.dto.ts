import { ApiProperty } from '@nestjs/swagger';

export class AgentInviteResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  organizationId!: string;

  @ApiProperty()
  invitedByUserId!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty()
  createdAt!: string;

  // Exposed only on create to allow sending links; avoid returning in list if desired
  token?: string;
}


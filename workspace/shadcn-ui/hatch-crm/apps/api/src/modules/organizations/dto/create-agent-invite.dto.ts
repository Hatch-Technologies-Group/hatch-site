import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateAgentInviteDto {
  @ApiProperty({ example: 'agent@example.com' })
  @IsEmail()
  email!: string;

  // Optional future use; keeping structure minimal for now
  @IsOptional()
  @IsString()
  expiresAt?: string;
}


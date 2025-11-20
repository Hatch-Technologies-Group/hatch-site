import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class AcceptAgentInviteDto {
  @ApiProperty({ description: 'Invite token' })
  @IsString()
  token!: string;

  @ApiProperty({ description: 'Account password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ example: 'Alex' })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Agent' })
  @IsString()
  lastName!: string;
}


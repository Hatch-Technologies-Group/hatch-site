import { Module } from '@nestjs/common';
import { PrismaModule } from '../../modules/prisma/prisma.module';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { OidcStrategy } from './oidc.strategy';
import { TokensService } from './tokens.service';

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({
      session: false
    })
  ],
  providers: [OidcStrategy, TokensService],
  controllers: [AuthController],
  exports: [TokensService]
})
export class AuthModule {}

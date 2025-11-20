// apps/api/src/modules/voice/voice.module.ts

import { Module } from '@nestjs/common';
import { VoiceController } from './voice.controller';

@Module({
  controllers: [VoiceController],
  providers: []
})
export class VoiceModule {}


import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import { AiService } from '../src/modules/ai/ai.service';
import type { GoldenEval } from './types';

async function run() {
  let app: INestApplicationContext | null = null;
  try {
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const ai = app.get(AiService);

    const goldensDir = path.join(__dirname, 'goldens');
    const files = fs.readdirSync(goldensDir).filter((file) => file.endsWith('.yaml'));

    let failures = 0;

    for (const file of files) {
      const doc = yaml.load(
        fs.readFileSync(path.join(goldensDir, file), 'utf8')
      ) as GoldenEval;

      const result = await ai.chat({
        userId: 'eval-bot',
        context: doc.context ?? {},
        messages: doc.inputs.messages,
        stream: false
      });

      const assistant = result.messages[result.messages.length - 1];
      const content = typeof assistant?.content === 'string' ? assistant.content : '';

      const missing = (doc.expect.must_include ?? []).filter((needle) => !content.includes(needle));
      const forbidden = (doc.expect.must_not_include ?? []).filter((bad) => content.includes(bad));

      if (missing.length || forbidden.length) {
        console.error('❌ Fail:', doc.name, { missing, forbidden });
        failures += 1;
      } else {
        console.log('✅ Pass:', doc.name);
      }
    }

    if (failures > 0) {
      console.error(`❌ ${failures} eval(s) failed.`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Eval runner crashed', error);
    process.exit(1);
  } finally {
    await app?.close();
  }
}

void run();

import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Readable, Transform } from 'stream';
import fetch from 'node-fetch';

@Injectable()
export class S3Service {
  private readonly client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-2',
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
          }
        : undefined
  });

  private readonly bucket = process.env.AWS_S3_BUCKET ?? '';
  private readonly maxDownloadBytes = Number(process.env.S3_MAX_DOWNLOAD_BYTES ?? 250 * 1024 * 1024); // 250MB limit by default

  async uploadObject(key: string, body: Buffer | string | Readable, contentType: string) {
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    });

    await this.client.send(cmd);
    return { key };
  }

  async uploadFromUrl(key: string, url: string, contentType?: string) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
    }

    const ct = contentType ?? res.headers.get('content-type') ?? 'application/octet-stream';
    const lengthHeader = res.headers.get('content-length');
    const contentLength = lengthHeader ? Number.parseInt(lengthHeader, 10) : null;
    if (this.maxDownloadBytes > 0 && contentLength && contentLength > this.maxDownloadBytes) {
      throw new Error(
        `Remote file exceeds configured limit of ${this.maxDownloadBytes} bytes (content-length=${contentLength})`
      );
    }

    const rawBody = res.body;
    const body = rawBody
      ? rawBody instanceof Readable
        ? rawBody
        : Readable.fromWeb(rawBody as any)
      : Readable.from([]);
    const guardedStream =
      this.maxDownloadBytes > 0 ? body.pipe(this.createSizeGuard(this.maxDownloadBytes)) : body;

    return this.uploadObject(key, guardedStream, ct);
  }

  private createSizeGuard(limit: number) {
    let total = 0;
    return new Transform({
      transform(chunk, _encoding, callback) {
        total += chunk.length;
        if (limit > 0 && total > limit) {
          callback(new Error(`Remote file exceeds configured limit of ${limit} bytes`));
          return;
        }
        callback(null, chunk);
      }
    });
  }

  async getObjectStream(key: string): Promise<Readable> {
    if (!this.bucket) {
      throw new Error('AWS_S3_BUCKET is not configured');
    }
    const cmd = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });
    const res = await this.client.send(cmd);
    const body = res.Body;
    if (!body) {
      throw new Error(`No object body returned for key ${key}`);
    }
    return body instanceof Readable ? body : Readable.from(body as any);
  }
}

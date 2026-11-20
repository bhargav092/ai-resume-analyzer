import { Injectable } from '@nestjs/common'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { randomUUID } from 'node:crypto'

@Injectable()
export class ResumeStorageService {
  private readonly bucket = process.env.S3_RESUME_BUCKET
  private readonly client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' })

  async store(file: Express.Multer.File, userId: string): Promise<string | undefined> {
    if (!this.bucket) return undefined

    const key = `${userId}/${randomUUID()}`
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256',
    }))
    return key
  }

  async remove(key: string | undefined): Promise<void> {
    if (!key || !this.bucket) return
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type GuestSessionDocument = HydratedDocument<GuestSession>

@Schema({ timestamps: true })
export class GuestSession {
  @Prop({ required: true, default: 'Guest', trim: true, maxlength: 100 })
  displayName!: string

  @Prop({ type: Object, default: { theme: 'system' } })
  preferences!: { theme: 'light' | 'dark' | 'system' }

  @Prop({ required: true })
  expiresAt!: Date

  createdAt!: Date
}

export const GuestSessionSchema = SchemaFactory.createForClass(GuestSession)
GuestSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

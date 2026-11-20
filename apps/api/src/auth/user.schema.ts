import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument } from 'mongoose'

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string

  @Prop({ required: true, trim: true, maxlength: 100 })
  displayName!: string

  @Prop({ select: false })
  passwordHash?: string

  @Prop({ unique: true, sparse: true, select: false })
  googleId?: string

  @Prop({ required: true, default: Date.now })
  trialStartedAt!: Date

  @Prop()
  subscriptionEndsAt?: Date

  @Prop({ default: false })
  demoSubscription!: boolean

  @Prop({ type: Object, default: { theme: 'system' } })
  preferences!: { theme: 'light' | 'dark' | 'system' }

  @Prop({ type: [String], default: [] })
  subscriptionPaymentIds!: string[]

  @Prop()
  firstLoginEmailSentAt?: Date

  @Prop({ default: false, select: false })
  firstLoginEmailSending!: boolean

  createdAt!: Date
}

export const UserSchema = SchemaFactory.createForClass(User)

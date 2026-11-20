import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'

export type SubscriptionPaymentDocument = HydratedDocument<SubscriptionPayment>

@Schema({ timestamps: true })
export class SubscriptionPayment {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId

  @Prop({ required: true, enum: ['week', 'month', 'quarter', 'year'] })
  planId!: string

  @Prop({ required: true })
  amountPaise!: number

  @Prop({ required: true, default: 'INR' })
  currency!: string

  @Prop({ required: true, enum: ['razorpay_card', 'razorpay_upi', 'razorpay_qr'] })
  method!: string

  @Prop({ required: true, enum: ['pending', 'completed', 'expired', 'failed'], default: 'pending', index: true })
  status!: string

  @Prop()
  razorpayQrCodeId?: string

  @Prop()
  qrImageUrl?: string

  @Prop()
  razorpayOrderId?: string

  @Prop()
  razorpayPaymentId?: string

  @Prop()
  expiresAt?: Date

  @Prop()
  receiptEmailSentAt?: Date

  @Prop({ default: false, select: false })
  receiptEmailSending!: boolean

  createdAt!: Date
}

export const SubscriptionPaymentSchema = SchemaFactory.createForClass(SubscriptionPayment)
SubscriptionPaymentSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true })
SubscriptionPaymentSchema.index({ razorpayQrCodeId: 1 }, { unique: true, sparse: true })
SubscriptionPaymentSchema.index({ userId: 1, createdAt: -1 })

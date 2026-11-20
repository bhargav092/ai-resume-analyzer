import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose'
import { AnalysisOutput } from '../ai/mock-ai.provider'

export type AnalysisDocument = HydratedDocument<Analysis>

@Schema({ timestamps: true })
export class Analysis {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId

  @Prop({ required: true, trim: true, maxlength: 160 })
  title!: string

  @Prop({ required: true, trim: true, maxlength: 255 })
  resumeFilename!: string

  @Prop({ required: true, maxlength: 20000, select: false })
  jobDescription!: string

  @Prop({ type: Object, required: true })
  result!: AnalysisOutput

  @Prop({ trim: true })
  resumeObjectKey?: string

  @Prop()
  guestExpiresAt?: Date

  createdAt!: Date
  updatedAt!: Date
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis)
AnalysisSchema.index({ userId: 1, createdAt: -1 })
AnalysisSchema.index(
  { guestExpiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { guestExpiresAt: { $exists: true } } },
)

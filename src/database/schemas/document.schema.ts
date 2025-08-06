import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DocumentMetadata extends Document {
  @Prop({ required: true })
  filename: string;

  @Prop()
  originalUrl: string;

  @Prop({ required: true })
  fileType: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({
    type: String,
    enum: ['uploaded', 'parsing', 'chunking', 'embedding', 'indexed', 'failed'],
    default: 'uploaded',
  })
  status: string;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentMetadata);
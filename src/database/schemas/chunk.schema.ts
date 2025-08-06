import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Chunk extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'DocumentMetadata', required: true, index: true })
  documentId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  chunkNumber: number;

  @Prop()
  pageNumber: number;

  @Prop()
  sectionTitle: string;

  @Prop({ type: [Number], required: true })
  embedding: number[];

  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;
}

export const ChunkSchema = SchemaFactory.createForClass(Chunk);

ChunkSchema.index({ content: 'text' });
ChunkSchema.index({ documentId: 1, 'metadata.domain': 1 });
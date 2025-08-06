import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentMetadata, DocumentSchema } from '../../database/schemas/document.schema';
import { Chunk, ChunkSchema } from '../../database/schemas/chunk.schema';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingUtil } from '../../utils/embedding.util';
import { ParserUtil } from '../../utils/parser.util';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentMetadata.name, schema: DocumentSchema },
      { name: Chunk.name, schema: ChunkSchema },
    ]),
    ConfigModule,
  ],
  providers: [
    DocumentsService,
    EmbeddingUtil,
    ParserUtil,
  ],
  controllers: [DocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
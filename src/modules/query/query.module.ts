import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Chunk, ChunkSchema } from '../../database/schemas/chunk.schema';
import { DocumentMetadata, DocumentSchema } from '../../database/schemas/document.schema';
import { QueryService } from './query.service';
import { QueryController } from './query.controller';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingUtil } from '../../utils/embedding.util';
import { RRFUtil } from '../../utils/rrf.util';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Chunk.name, schema: ChunkSchema },
      { name: DocumentMetadata.name, schema: DocumentSchema },
    ]),
    ConfigModule,
  ],
  providers: [
    QueryService,
    EmbeddingUtil,
    RRFUtil,
  ],
  controllers: [QueryController],
  exports: [QueryService],
})
export class QueryModule {}
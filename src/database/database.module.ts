import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentMetadata, DocumentSchema } from './schemas/document.schema';
import { Chunk, ChunkSchema } from './schemas/chunk.schema';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: DocumentMetadata.name, schema: DocumentSchema },
      { name: Chunk.name, schema: ChunkSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
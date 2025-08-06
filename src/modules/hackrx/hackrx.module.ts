import { Module } from '@nestjs/common';
import { HackRxController } from './hackrx.controller';
import { HackRxService } from './hackrx.service';
import { DocumentsModule } from '../documents/documents.module';
import { QueryModule } from '../query/query.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    DocumentsModule,
    QueryModule,
    ConfigModule,
  ],
  controllers: [HackRxController],
  providers: [HackRxService],
})
export class HackRxModule {}
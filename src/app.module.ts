import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { QueryModule } from './modules/query/query.module';
import { HackRxModule } from './modules/hackrx/hackrx.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: '.env',
    }),
    DatabaseModule,
    DocumentsModule,
    QueryModule,
    HackRxModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
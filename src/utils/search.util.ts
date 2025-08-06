import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SearchUtil {
  private readonly logger = new Logger(SearchUtil.name);

  constructor(private readonly configService: ConfigService) {}

  async semanticSearchExternal(vector: number[], topK: number = 10, filter?: Record<string, any>): Promise<any[]> {
    this.logger.warn('`semanticSearchExternal` is a placeholder. Semantic search is handled by `QueryService` using MongoDB.');
    return [];
  }

  async keywordSearchExternal(query: string, topK: number = 10, filter?: Record<string, any>): Promise<any[]> {
    this.logger.warn('`keywordSearchExternal` is a placeholder. Keyword search is handled by `QueryService` using MongoDB.');
    return [];
  }
}
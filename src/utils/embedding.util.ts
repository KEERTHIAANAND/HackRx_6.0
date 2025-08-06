import OpenAI from 'openai';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export class EmbeddingUtil {
  private openai: OpenAI;
  private readonly embeddingModel: string;
  private readonly logger = new Logger(EmbeddingUtil.name);

  constructor(private readonly configService: ConfigService) {
    const apiKey = configService.get('openai.apiKey');
    if (!apiKey) {
      this.logger.error('OpenAI API Key is not configured. EmbeddingUtil cannot be initialized.');
      throw new Error('OpenAI API Key is missing in configuration.');
    }
    this.openai = new OpenAI({ apiKey: apiKey });
    this.embeddingModel = configService.get('openai.embeddingModel');
    this.logger.log(`EmbeddingUtil initialized. Using OpenAI model: ${this.embeddingModel}`);
  }

  async getEmbedding(text: string, retries: number = 3, delayMs: number = 1000): Promise<number[]> {
    for (let i = 0; i < retries; i++) {
      try {
        const embeddingResponse = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: text,
        });
        return embeddingResponse.data[0].embedding;
      } catch (error) {
        this.logger.warn(`Attempt ${i + 1}/${retries} to get embedding failed: ${error.message}.`);
        if (i < retries - 1) {
          const backoffDelay = delayMs * Math.pow(2, i);
          this.logger.log(`Retrying in ${backoffDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoffDelay));
        } else {
          this.logger.error(`Failed to get embedding after ${retries} attempts: ${error.message}`, error.stack);
          throw new Error(`Failed to get embedding for text: ${error.message}`);
        }
      }
    }
    throw new Error('Failed to get embedding due to unexpected retry loop exit.');
  }
}
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';
import { QueryService } from '../query/query.service';
import { HackRxRunDto } from '../../common/dtos/hackrx-run.dto';
import { DocumentMetadata } from '../../database/schemas/document.schema';

@Injectable()
export class HackRxService {
  private readonly logger = new Logger(HackRxService.name);

  constructor(
    private readonly documentsService: DocumentsService,
    private readonly queryService: QueryService,
  ) {}

  async runHackRx(payload: HackRxRunDto): Promise<{ answers: string[] }> {
    const { documents: documentUrl, questions } = payload;
    let processedDocument: DocumentMetadata;

    try {
      this.logger.log(`Starting HackRx run for document URL: ${documentUrl}`);
      processedDocument = await this.documentsService.processDocumentFromUrl(documentUrl);

      if (processedDocument.status !== 'indexed') {
        this.logger.error(`Document processing failed or is incomplete for URL: ${documentUrl}. Status: ${processedDocument.status}`);
        throw new HttpException(
          `Document processing failed or is incomplete for URL: ${documentUrl}. Current status: ${processedDocument.status}`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      this.logger.log(`Document ${processedDocument._id} successfully processed and indexed. Proceeding to answer questions.`);

      const answers: string[] = [];
      for (const question of questions) {
        try {
          this.logger.log(`Answering question: "${question}" for document ID: ${processedDocument._id}`);
          const result = await this.queryService.handleQuery(question, processedDocument._id.toString());
          answers.push(result.answer);
        } catch (queryError) {
          this.logger.error(`Failed to answer question "${question}" for document ${processedDocument._id}: ${queryError.message}`, queryError.stack);
          answers.push(`Error answering question: ${queryError.message}`);
        }
      }

      this.logger.log('All questions processed for the HackRx run.');
      return { answers };
    } catch (error) {
      this.logger.error(`HackRx run failed for document URL ${documentUrl}: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `An unexpected error occurred during the HackRx run: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
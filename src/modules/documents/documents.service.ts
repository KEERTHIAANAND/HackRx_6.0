import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentMetadata } from '../../database/schemas/document.schema';
import { Chunk } from '../../database/schemas/chunk.schema';
import { ParserUtil } from '../../utils/parser.util';
import { ChunkerUtil } from '../../utils/chunker.util';
import { EmbeddingUtil } from '../../utils/embedding.util';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(DocumentMetadata.name) private readonly documentModel: Model<DocumentMetadata>,
    @InjectModel(Chunk.name) private readonly chunkModel: Model<Chunk>,
    private readonly configService: ConfigService,
    private readonly embeddingUtil: EmbeddingUtil,
  ) {}

  async processDocumentFromUrl(documentUrl: string, metadata: any = {}): Promise<DocumentMetadata> {
    let newDocument: DocumentMetadata;
    try {
      this.logger.log(`Attempting to fetch document from URL: ${documentUrl}`);
      const response = await axios.get(documentUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      const fileType = response.headers['content-type'] || this.getFileTypeFromUrl(documentUrl);
      const filename = this.getFilenameFromUrl(documentUrl) || `document_${Date.now()}`;

      newDocument = new this.documentModel({
        filename: filename,
        originalUrl: documentUrl,
        fileType: fileType,
        metadata: metadata,
        status: 'uploaded',
      });
      await newDocument.save();
      this.logger.log(`Document metadata saved (ID: ${newDocument._id}). Starting processing pipeline.`);

      newDocument.status = 'parsing';
      await newDocument.save();
      const rawText = await ParserUtil.parseFile(buffer, fileType);
      this.logger.log(`Document ${newDocument._id} parsed. Text length: ${rawText.length}`);

      newDocument.status = 'chunking';
      await newDocument.save();
      const chunks = ChunkerUtil.splitText(rawText);
      this.logger.log(`Document ${newDocument._id} chunked into ${chunks.length} pieces.`);

      newDocument.status = 'embedding';
      await newDocument.save();
      const chunkDocs = [];
      for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i];
        try {
          const embedding = await this.embeddingUtil.getEmbedding(content);
          chunkDocs.push({
            documentId: newDocument._id,
            content,
            chunkNumber: i + 1,
            embedding,
            metadata: {},
          });
        } catch (embeddingError) {
          this.logger.error(`Failed to get embedding for chunk ${i + 1} of document ${newDocument._id}: ${embeddingError.message}`);
        }
      }

      if (chunkDocs.length > 0) {
        await this.chunkModel.insertMany(chunkDocs);
        this.logger.log(`Successfully indexed ${chunkDocs.length} chunks for document ${newDocument._id}.`);
      } else {
        this.logger.warn(`No chunks were successfully embedded and indexed for document: ${newDocument._id}.`);
      }

      newDocument.status = 'indexed';
      await newDocument.save();
      this.logger.log(`Document ${newDocument._id} successfully processed and indexed.`);
      return newDocument;
    } catch (error) {
      this.logger.error(`Failed to process document from URL ${documentUrl}: ${error.message}`, error.stack);
      if (newDocument) {
        newDocument.status = 'failed';
        await newDocument.save();
      }
      throw new HttpException(`Failed to process document: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getFileTypeFromUrl(url: string): string {
    const parts = url.split('.');
    const extension = parts[parts.length - 1].split('?')[0].toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'doc': return 'application/msword';
      case 'eml': return 'message/rfc822';
      case 'jpg': case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/octet-stream';
    }
  }

  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const filenameWithQuery = pathSegments[pathSegments.length - 1];
      return filenameWithQuery.split('?')[0];
    } catch (e) {
      this.logger.warn(`Could not parse filename from URL: ${url}. Error: ${e.message}`);
      return `document_${Date.now()}`;
    }
  }
}
import { Controller, Post, UseInterceptors, UploadedFile, Body, Res, HttpStatus, Logger } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { ApiConsumes, ApiBody, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UploadDto } from '../../common/dtos/upload.dto';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);

  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadDto })
  @ApiOperation({ summary: 'Upload a document file for processing and indexing' })
  @ApiResponse({ status: 201, description: 'Document uploaded and is being processed.' })
  @ApiResponse({ status: 400, description: 'No file uploaded or invalid input.' })
  @ApiResponse({ status: 500, description: 'Failed to process document.' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body('metadata') metadata: string,
    @Res() res: Response,
  ) {
    if (!file) {
      this.logger.error('No file provided in the upload request.');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'No file uploaded.' });
    }

    try {
      const parsedMetadata = metadata ? JSON.parse(metadata) : {};

      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      this.logger.log(`Received file upload: ${file.originalname}, MIME: ${file.mimetype}`);

      const document = await this.documentsService.processDocumentFromUrl(dataUri, {
        ...parsedMetadata,
        originalFilename: file.originalname,
      });

      return res.status(HttpStatus.CREATED).json({
        message: 'Document uploaded and is being processed.',
        documentId: document._id,
        status: document.status,
      });
    } catch (error) {
      this.logger.error(`Error processing uploaded document: ${error.message}`, error.stack);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'Failed to process document.',
        error: error.message,
      });
    }
  }
}
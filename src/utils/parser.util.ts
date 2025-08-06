import * as pdfParse from 'pdf-parse';
import * as officeparser from 'officeparser';
import * as Tesseract from 'tesseract.js';
import * as EMLParser from 'eml-parser';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';

export class ParserUtil {
  private static readonly logger = new Logger(ParserUtil.name);

  static async parseFile(buffer: Buffer, fileType: string): Promise<string> {
    this.logger.log(`Attempting to parse file of type: ${fileType}`);
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.parsePdf(buffer);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.parseDocx(buffer);
        case 'message/rfc822':
          return await this.parseEml(buffer);
        case 'image/jpeg':
        case 'image/png':
        case 'image/tiff':
          return await this.performOcr(buffer);
        default:
          this.logger.warn(`Unsupported file type: ${fileType}. Attempting OCR as a fallback.`);
          return await this.performOcr(buffer);
      }
    } catch (error) {
      this.logger.error(`Error parsing file of type ${fileType}: ${error.message}`, error.stack);
      throw new HttpException(`Failed to parse document: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private static async parsePdf(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer);
    return data.text;
  }

  private static async parseDocx(buffer: Buffer): Promise<string> {
    return await officeparser.parse(buffer);
  }

  private static async parseEml(buffer: Buffer): Promise<string> {
    const parser = new EMLParser(buffer);
    const parsedEml = await parser.parse();
    return parsedEml.text || parsedEml.html || '';
  }

  static async performOcr(buffer: Buffer): Promise<string> {
    this.logger.log('Attempting OCR on document...');
    try {
      const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
      this.logger.log('OCR completed successfully.');
      return text;
    } catch (ocrError) {
      this.logger.error(`OCR failed: ${ocrError.message}`, ocrError.stack);
      throw new HttpException(`OCR processing failed: ${ocrError.message}.`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
import { Controller, Post, Body, Res, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { HackRxService } from './hackrx.service';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HackRxRunDto } from '../../common/dtos/hackrx-run.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('HackRx Submission')
@Controller('hackrx')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class HackRxController {
  private readonly logger = new Logger(HackRxController.name);

  constructor(private readonly hackRxService: HackRxService) {}

  @Post('run')
  @ApiBody({ type: HackRxRunDto })
  @ApiOperation({ summary: 'Process a document from a URL and answer multiple questions against it' })
  @ApiResponse({
    status: 200,
    description: 'Successfully processed document and answered all questions.',
    schema: {
      example: {
        answers: [
          "A grace period of thirty days is provided...",
          "There is a waiting period of thirty-six (36) months...",
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., invalid URL, empty questions).' })
  @ApiResponse({ status: 401, description: 'Unauthorized (Invalid API Key).' })
  @ApiResponse({ status: 500, description: 'Internal Server Error (e.g., document processing failure).' })
  async run(
    @Body() payload: HackRxRunDto,
    @Res() res: Response,
  ) {
    this.logger.log('Received /hackrx/run request.');
    try {
      const result = await this.hackRxService.runHackRx(payload);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(`Error handling /hackrx/run request: ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An unexpected error occurred during the HackRx run.',
        error: error.message,
      });
    }
  }
}
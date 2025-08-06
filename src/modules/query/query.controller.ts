import { Controller, Post, Body, Res, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { QueryService } from './query.service';
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QueryDto } from '../../common/dtos/query.dto';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('General Query')
@Controller('query')
@UseGuards(ApiKeyGuard)
@ApiBearerAuth()
export class QueryController {
  private readonly logger = new Logger(QueryController.name);

  constructor(private readonly queryService: QueryService) {}

  @Post()
  @ApiBody({ type: QueryDto })
  @ApiOperation({ summary: 'Submit a natural language query to retrieve information from indexed documents' })
  @ApiResponse({ status: 200, description: 'Successfully processed query and returned structured answer.' })
  @ApiResponse({ status: 400, description: 'Bad Request (e.g., empty query).' })
  @ApiResponse({ status: 401, description: 'Unauthorized (Invalid API Key).' })
  @ApiResponse({ status: 500, description: 'Internal Server Error.' })
  async query(
    @Body() queryDto: QueryDto,
    @Res() res: Response,
  ) {
    const { query, metadataFilters } = queryDto;

    if (!query || query.trim().length === 0) {
      this.logger.error('Received an empty or whitespace-only query.');
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Query cannot be empty.' });
    }

    try {
      this.logger.log(`Received general query: "${query}"`);
      const result = await this.queryService.handleQuery(query, null, metadataFilters);
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      this.logger.error(`Error processing general query "${query}": ${error.message}`, error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: 'An unexpected error occurred while processing the query.',
        error: error.message,
      });
    }
  }
}
import { IsString, IsOptional, IsObject, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({
    description: 'The natural language query string (e.g., "Does this policy cover knee surgery?").',
    example: 'What are the conditions for maternity expenses coverage?',
  })
  @IsString()
  @IsNotEmpty({ message: 'Query string cannot be empty.' })
  query: string;

  @ApiProperty({
    type: 'object',
    required: false,
    description: 'Optional key-value pairs for filtering document chunks (e.g., {"domain": "HR", "policy_year": 2024}).',
    example: { domain: 'insurance', type: 'health' },
  })
  @IsOptional()
  @IsObject()
  metadataFilters?: Record<string, any>;
}
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'The document file to upload (PDF, DOCX, EML, etc.).',
  })
  file: any;

  @ApiProperty({
    type: 'string',
    required: false,
    description: 'Optional JSON string of additional metadata for the document (e.g., {"domain": "insurance"}).',
    example: '{"domain": "insurance", "policy_type": "life"}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}
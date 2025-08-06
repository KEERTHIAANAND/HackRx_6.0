import { IsString, IsArray, ArrayMinSize, IsUrl, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class HackRxRunDto {
  @ApiProperty({
    description: 'The publicly accessible URL of the document (PDF, DOCX, EML) to be processed.',
    example: 'https://hackrx.blob.core.windows.net/assets/policy.pdf?sv=...',
  })
  @IsUrl({ require_tld: false, protocols: ['http', 'https'] }, { message: 'Document URL must be a valid URL.' })
  @IsString()
  @IsNotEmpty({ message: 'Document URL cannot be empty.' })
  documents: string;

  @ApiProperty({
    description: 'An array of natural language questions to ask about the document.',
    example: [
      "What is the grace period for premium payment?",
      "Does this policy cover maternity expenses, and what are the conditions?",
    ],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one question must be provided.' })
  @IsString({ each: true, message: 'Each question must be a string.' })
  @IsNotEmpty({ each: true, message: 'Questions cannot be empty strings.' })
  questions: string[];
}
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chunk } from '../../database/schemas/chunk.schema';
import { DocumentMetadata } from '../../database/schemas/document.schema';
import { EmbeddingUtil } from '../../utils/embedding.util';
import { ConfigService } from '@nestjs/config';
import { RRFUtil, RankedResult } from '../../utils/rrf.util';
import OpenAI from 'openai';
import { Engine as RulesEngine } from 'json-rules-engine';

@Injectable()
export class QueryService {
  private openai: OpenAI;
  private readonly embeddingUtil: EmbeddingUtil;
  private readonly llmModel: string;
  private readonly logger = new Logger(QueryService.name);

  constructor(
    @InjectModel(Chunk.name) private readonly chunkModel: Model<Chunk>,
    @InjectModel(DocumentMetadata.name) private readonly documentModel: Model<DocumentMetadata>,
    private readonly configService: ConfigService,
    embeddingUtil: EmbeddingUtil,
  ) {
    const openaiApiKey = configService.get('openai.apiKey');
    if (!openaiApiKey) {
      this.logger.error('OpenAI API Key is not configured. Cannot initialize OpenAI client.');
      throw new Error('OpenAI API Key is missing.');
    }
    this.openai = new OpenAI({ apiKey: openaiApiKey });
    this.embeddingUtil = embeddingUtil;
    this.llmModel = configService.get('openai.llmModel');
    this.logger.log(`QueryService initialized. Using LLM model: ${this.llmModel}`);
  }

  async handleQuery(query: string, documentId?: string, metadataFilters: Record<string, any> = {}): Promise<any> {
    try {
      this.logger.log(`Starting RAG process for query: "${query}" (Doc ID: ${documentId || 'Any'})`);

      const queryEmbedding = await this.embeddingUtil.getEmbedding(query);

      const effectiveFilters: Record<string, any> = { ...metadataFilters };
      if (documentId) {
        effectiveFilters['documentId'] = documentId;
      }

      const semanticResults = await this.semanticSearch(queryEmbedding, effectiveFilters);
      const keywordResults = await this.keywordSearch(query, effectiveFilters);

      const fusedResults = RRFUtil.fuseRanks([semanticResults, keywordResults]);
      const topChunkIds = fusedResults.slice(0, 10).map(r => r.id);

      const topChunks = await this.chunkModel.find({ _id: { $in: topChunkIds } }).lean();

      const orderedChunks = topChunkIds
        .map(id => topChunks.find(chunk => chunk._id.toString() === id))
        .filter(Boolean);

      const context = orderedChunks.map(chunk => {
        const docRef = chunk.documentId ? `Source ID: ${chunk.documentId}` : '';
        const pageRef = chunk.pageNumber ? `Page: ${chunk.pageNumber}` : '';
        const citation = [docRef, pageRef].filter(Boolean).join(', ');
        return citation ? `[${citation}] ${chunk.content}` : chunk.content;
      }).join('\n\n');

      if (!context) {
        this.logger.warn(`No relevant context found for query: "${query}" in document ${documentId || 'any'}.`);
        return {
          answer: "I could not find relevant information in the provided documents to answer this question.",
          reasoning: "No relevant document chunks were retrieved based on the query and filters.",
          conditions: {},
          citations: [],
          logic_evaluation: "N/A",
        };
      }

      const prompt = this.buildPrompt(query, context);

      const llmResponse = await this.openai.chat.completions.create({
        model: this.llmModel,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      });

      let llmOutput: any;
      try {
        llmOutput = JSON.parse(llmResponse.choices[0].message.content || '{}');
      } catch (parseError) {
        this.logger.error(`Failed to parse LLM JSON response: ${parseError.message}`, llmResponse.choices[0].message.content);
        throw new HttpException('LLM returned malformed JSON. Please try again.', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      const citations = this.validateCitations(llmOutput.citations || [], orderedChunks);

      const engine = new RulesEngine();
      engine.addRule({
        conditions: {
          all: [
            { fact: 'answer', operator: 'contains', value: 'cover' },
            { fact: 'answer', operator: 'contains', value: 'yes' }
          ]
        },
        event: { type: 'coverage_affirmative', params: { message: 'Policy likely provides coverage based on answer.' } }
      });
      engine.addRule({
        conditions: {
          all: [
            { fact: 'answer', operator: 'contains', value: 'waiting period' },
            { fact: 'answer', operator: 'match', value: /\d+\s*(month|year)s?/i }
          ]
        },
        event: { type: 'waiting_period_identified', params: { message: 'Specific waiting period mentioned in the answer.' } }
      });

      const facts = {
        answer: llmOutput.answer || '',
        conditions: llmOutput.conditions || {},
        citations: citations,
      };
      const { results: ruleResults } = await engine.run(facts);
      const logicEvaluationMessages = ruleResults.map(r => r.event.params.message);
      const logicEvaluation = logicEvaluationMessages.length > 0 ? logicEvaluationMessages.join('; ') : 'No specific rules triggered.';

      this.logger.log(`RAG process completed for query: "${query}"`);

      return {
        answer: llmOutput.answer || "I could not find a direct answer in the provided context.",
        reasoning: llmOutput.reasoning || "No specific reasoning could be extracted.",
        conditions: llmOutput.conditions || {},
        citations: citations,
        logic_evaluation: logicEvaluation,
      };
    } catch (error) {
      this.logger.error(`Error handling query "${query}": ${error.message}`, error.stack);
      throw new HttpException(`Failed to process query: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async semanticSearch(queryEmbedding: number[], filters: Record<string, any>): Promise<RankedResult[]> {
    this.logger.debug('Performing semantic search using MongoDB Atlas Vector Search...');
    try {
      const results = await this.chunkModel.aggregate([
        {
          $search: {
            index: 'vector_index',
            knnBeta: {
              vector: queryEmbedding,
              path: 'embedding',
              k: 10,
              filter: filters,
            },
          },
        },
        { $limit: 10 },
        { $project: { _id: 1, score: { $meta: 'searchScore' } } },
      ]).exec();

      return results.map((res, index) => ({
        id: res._id.toString(),
        rank: index + 1,
        score: res.score,
      }));
    } catch (error) {
      this.logger.error(`Semantic search failed: ${error.message}.`, error.stack);
      return [];
    }
  }

  private async keywordSearch(query: string, filters: Record<string, any>): Promise<RankedResult[]> {
    this.logger.debug('Performing keyword search using MongoDB text index...');
    try {
      const results = await this.chunkModel.find(
        { $text: { $search: query }, ...filters },
        { score: { $meta: 'textScore' } }
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(10)
      .lean();

      return results.map((res, index) => ({
        id: res._id.toString(),
        rank: index + 1,
        score: res.score,
      }));
    } catch (error) {
      this.logger.error(`Keyword search failed: ${error.message}.`, error.stack);
      return [];
    }
  }

  private buildPrompt(query: string, context: string): string {
    return `You are a helpful and knowledgeable assistant specializing in regulated domains (e.g., insurance, legal, HR, compliance).
    Your primary goal is to answer the user's query based ONLY on the provided context.
    If the context does not contain sufficient information to answer the query, you MUST explicitly state that.
    
    Provide a concise answer, a step-by-step reasoning for your answer derived from the context,
    any key conditions or rules found in the text related to the query,
    and a list of citations including the source ID and page number (if available) for each piece of information.

    You MUST respond in the following JSON format. Ensure the JSON is valid and complete:
    {
      "answer": "The concise answer to the query based on the context.",
      "reasoning": "A step-by-step explanation of how the answer was derived from the provided context.",
      "conditions": {
        "condition_name_1": "value_1",
        "condition_name_2": "value_2"
      },
      "citations": [
        {
          "source_id": "document_id_from_context",
          "page_number": "page_number_from_context"
        }
      ]
    }

    ---
    User Query: "${query}"
    
    ---
    Context (Relevant information from documents):
    ${context}
    
    ---
    Please generate your response strictly in the specified JSON format.`;
  }

  private validateCitations(llmCitations: any[], retrievedChunks: Chunk[]): { source_id: string; page_number: string | null }[] {
    const validCitations: { source_id: string; page_number: string | null }[] = [];
    const retrievedDocumentIds = new Set(retrievedChunks.map(chunk => chunk.documentId.toString()));

    for (const citation of llmCitations) {
      if (citation.source_id && retrievedDocumentIds.has(citation.source_id)) {
        validCitations.push({
          source_id: citation.source_id,
          page_number: citation.page_number ? String(citation.page_number) : null,
        });
      } else {
        this.logger.warn(`LLM referenced an invalid or non-retrieved source_id: ${citation.source_id}`);
      }
    }
    return Array.from(new Map(validCitations.map(item => [`${item.source_id}-${item.page_number}`, item])).values());
  }
}
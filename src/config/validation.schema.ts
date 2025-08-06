import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  MONGO_URI: Joi.string().required(),
  OPENAI_API_KEY: Joi.string().required(),
  OPENAI_EMBEDDING_MODEL: Joi.string().optional(),
  OPENAI_LLM_MODEL: Joi.string().optional(),
  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().optional(),
  HACKRX_API_KEY: Joi.string().required(),
});
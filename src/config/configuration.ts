export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    uri: process.env.MONGO_URI,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
    llmModel: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '3600s',
  },
  hackRx: {
    apiKey: process.env.HACKRX_API_KEY,
  },
});
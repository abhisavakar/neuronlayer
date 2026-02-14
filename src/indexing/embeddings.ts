import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';

export class EmbeddingGenerator {
  private model: FeatureExtractionPipeline | null = null;
  private initialized = false;
  private initializing = false;
  private modelName: string;
  private dimension: number = 384; // Default for MiniLM

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for initialization to complete
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      console.error(`Loading embedding model: ${this.modelName}...`);

      this.model = await pipeline('feature-extraction', this.modelName, {
        quantized: true
      });

      this.initialized = true;
      console.error('Embedding model loaded successfully');
    } catch (error) {
      console.error('Failed to load embedding model:', error);
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  async embed(text: string): Promise<Float32Array> {
    await this.initialize();

    if (!this.model) {
      throw new Error('Embedding model not initialized');
    }

    // Truncate very long texts
    const maxChars = 8000; // ~2000 tokens
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

    const output = await this.model(truncatedText, {
      pooling: 'mean',
      normalize: true
    });

    // Extract the embedding data
    const data = output.data as Float32Array;
    this.dimension = data.length;

    return new Float32Array(data);
  }

  async embedBatch(texts: string[], batchSize: number = 8): Promise<Float32Array[]> {
    const results: Float32Array[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await Promise.all(batch.map(t => this.embed(t)));
      results.push(...embeddings);
    }

    return results;
  }

  getDimension(): number {
    return this.dimension;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

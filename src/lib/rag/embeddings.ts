import { logger } from "@/utils/logger";

/**
 * Embedding provider seam. Everything downstream depends on this interface, not
 * on a vendor, so switching providers is one file rather than a re-migration.
 *
 * The 384 dimensions are load-bearing: they are baked into the
 * `vector(384)` column, so any replacement must produce 384 dimensions.
 * (OpenAI `text-embedding-3-small` is 1536 natively but supports reduction to
 * 384 via its `dimensions` parameter, so it remains a viable swap.)
 */
export interface Embedder {
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_DIMENSIONS = 384;

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

type FeatureExtractionPipeline = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean }
) => Promise<{ tolist(): number[][] }>;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Loads the ONNX model once per process and reuses it. The model is ~97MB and
 * takes ~3.4s to load cold, so a module-level singleton is the difference
 * between paying that once and paying it per request.
 */
function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipelinePromise) {
    return pipelinePromise;
  }

  pipelinePromise = (async () => {
    // Imported dynamically so the ~97MB model machinery is never pulled into a
    // bundle that does not embed anything.
    const { pipeline, env } = await import("@huggingface/transformers");

    // node_modules is read-only on serverless hosts, so the default cache
    // location fails there. /tmp is writable and survives for the life of a
    // warm instance, which is exactly the lifetime of the singleton above.
    if (process.env.VERCEL) {
      env.cacheDir = "/tmp/transformers-cache";
    }

    const started = Date.now();
    const extractor = (await pipeline("feature-extraction", MODEL_ID)) as unknown as FeatureExtractionPipeline;
    logger.info("Loaded embedding model", { model: MODEL_ID, loadMs: Date.now() - started });
    return extractor;
  })();

  // Do not cache a rejected promise — a transient model download failure would
  // otherwise poison the singleton for the life of the process.
  pipelinePromise.catch(() => {
    pipelinePromise = null;
  });

  return pipelinePromise;
}

/**
 * Starts the embedding-model load ahead of the first retrieval without making
 * an interactive request wait for it. The singleton makes later retrievals
 * join the same work instead of loading the model twice.
 */
export function warmEmbeddingModel(): void {
  void getPipeline().catch((error) => {
    logger.warn("Embedding model warmup failed", {
      model: MODEL_ID,
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

export const localEmbedder: Embedder = {
  dimensions: EMBEDDING_DIMENSIONS,

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) {
      return [];
    }

    const extractor = await getPipeline();
    const output = await extractor(texts, { pooling: "mean", normalize: true });
    const vectors = output.tolist();

    for (const vector of vectors) {
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Embedding model returned ${vector.length} dimensions, expected ${EMBEDDING_DIMENSIONS}`
        );
      }
    }

    return vectors;
  },
};

/**
 * Formats a vector as a pgvector literal. Prisma cannot bind the `vector` type,
 * so raw SQL takes it as a string and casts: `$1::vector`.
 */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

/**
 * Vectors from {@link Embedder.embed} are L2-normalized, so the dot product is
 * the cosine similarity.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

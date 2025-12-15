
import { getEmbedding } from './geminiService';

export interface RAGDocument {
    id: string;
    text: string;
    type: string;
    embedding: number[];
    timestamp: number;
}

class RAGEngine {
    private documents: RAGDocument[] = [];
    private similarityThreshold = 0.45;

    async indexDocument(id: string, text: string, type: string) {
        if (!text || text.length < 5) return;
        try {
            const embedding = await getEmbedding(text);
            if (embedding) {
                // Remove old version if exists
                this.documents = this.documents.filter(d => d.id !== id);
                this.documents.push({
                    id,
                    text,
                    type,
                    embedding,
                    timestamp: Date.now()
                });
            }
        } catch (e) {
            console.error("RAG Indexing failed", e);
        }
    }

    async search(query: string, limit: number = 3): Promise<string[]> {
        if (!query || this.documents.length === 0) return [];
        
        try {
            const queryEmbedding = await getEmbedding(query);
            if (!queryEmbedding) return [];

            const scoredDocs = this.documents.map(doc => ({
                ...doc,
                score: this.cosineSimilarity(queryEmbedding, doc.embedding)
            }));

            const results = scoredDocs
                .filter(d => d.score > this.similarityThreshold)
                .sort((a, b) => b.score - a.score)
                .slice(0, limit);

            return results.map(r => `[ARCHIVE: ${r.type.toUpperCase()}] ${r.text}`);
        } catch (e) {
            console.error("RAG Search failed", e);
            return [];
        }
    }

    private cosineSimilarity(vecA: number[], vecB: number[]) {
        let dotProduct = 0;
        let magA = 0;
        let magB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(magA) * Math.sqrt(magB));
    }
}

export const ragService = new RAGEngine();

import express from 'express';
import cors from 'cors';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Validate Key
if (!API_KEY) {
  console.error("CRITICAL: API_KEY is missing in .env file!");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- Endpoints ---

// Chat Proxy
app.post('/api/chat', async (req, res) => {
  try {
    const { model, history, message, config } = req.body;
    
    const chat = ai.chats.create({
      model: model || 'gemini-3-pro-preview',
      config: config,
      history: history
    });

    const result = await chat.sendMessage({ message });
    
    // Serialize response properly
    res.json({
        text: result.text,
        functionCalls: result.functionCalls,
        candidates: result.candidates
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// General Content Generation Proxy
app.post('/api/generate', async (req, res) => {
  try {
    const { model, contents, config } = req.body;
    
    const result = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents,
      config
    });

    res.json({
        text: result.text,
        candidates: result.candidates
    });
  } catch (error) {
    console.error("Generate API Error:", error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// Embeddings Proxy
app.post('/api/embed', async (req, res) => {
    try {
        const { model, contents } = req.body;
        const result = await ai.models.embedContent({
            model: model || 'text-embedding-004',
            contents
        });
        res.json(result);
    } catch (error) {
        console.error("Embedding API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files in production
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🛡️  BFF Server running on http://localhost:${PORT}`);
  console.log(`🔑 API Key configured: ${!!API_KEY}`);
});
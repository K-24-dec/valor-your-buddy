import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_CHARACTER, INITIAL_QUESTS, MARKET_ITEMS, INITIAL_ACHIEVEMENTS } from './src/lib/mockSeedData';
import { processQuestCompletion, validateQuestCompletionEligibility } from './src/lib/gameEngine';
import { Character, Quest, QuestCompletion, Achievement } from './src/types/game';
import { transcribeAudioServer, evaluateGrammarServer, synthesizeSpeechServer } from './src/lib/voiceServerEngine';
import { generateAIChatResponseServer } from './src/lib/aiAgentEngine';
import { executeOpenAITutorTurn } from './src/lib/openAITutorEngine';
import { getStudentMistakes, getStudentMistakeSummary } from './src/lib/studentStorage';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-Memory Server State (Authoritative Server Database Backup)
let serverCharacter: Character = { ...INITIAL_CHARACTER };
let serverQuests: Quest[] = [...INITIAL_QUESTS];
let serverCompletions: QuestCompletion[] = [];
let serverInventory: string[] = ['avatar_cyber_hero', 'frame_neon_cyan', 'title_novice', 'theme_dark_cyberpunk'];
let serverAchievements: Achievement[] = [...INITIAL_ACHIEVEMENTS];

// ------------------------------------
// AUTHORITATIVE HEALTH & AI API ROUTES
// ------------------------------------

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'VALOR — AI Language Partner Companion',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------
// AI CONVERSATIONAL AGENT ROUTE
// ------------------------------------

// Primary AI Language Partner Chat Route
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { userMessage, targetLanguage, nativeLanguage, mode, dailyTopic, userLevel, conversationHistory } = req.body;
    
    if (!userMessage || typeof userMessage !== 'string') {
      return res.status(400).json({ error: 'Missing userMessage parameter.' });
    }

    const result = await generateAIChatResponseServer({
      userMessage,
      targetLanguage: targetLanguage || 'English',
      nativeLanguage: nativeLanguage || 'English',
      mode: mode || 'free',
      dailyTopic: dailyTopic || 'college',
      userLevel: userLevel || 'intermediate',
      conversationHistory: conversationHistory || [],
    });

    res.json(result);
  } catch (err: any) {
    console.error('AI Chat API error:', err);
    res.status(500).json({ error: err.message || 'AI Chat failed.' });
  }
});

// ------------------------------------
// VOICE CONVERSATIONAL LOOP API ROUTES
// ------------------------------------

// STT: Speech to Text via Whisper / Deepgram / Gemini
app.post('/api/voice/stt', async (req, res) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Missing audioBase64 payload.' });
    }

    const result = await transcribeAudioServer(audioBase64, mimeType);
    res.json(result);
  } catch (err: any) {
    console.error('STT API error:', err);
    res.status(500).json({ error: err.message || 'STT transcription failed.' });
  }
});

// LLM Correction & Response: Evaluate for grammar/vocab errors & build response
app.post('/api/voice/correct', async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid transcript string.' });
    }

    const result = await evaluateGrammarServer(transcript);
    res.json(result);
  } catch (err: any) {
    console.error('LLM Correction API error:', err);
    res.status(500).json({ error: err.message || 'LLM evaluation failed.' });
  }
});

// TTS: Text to Speech via ElevenLabs / Azure TTS
app.post('/api/voice/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing text parameter.' });
    }

    const audioBuffer = await synthesizeSpeechServer(text);
    if (audioBuffer) {
      res.set('Content-Type', 'audio/mpeg');
      return res.send(audioBuffer);
    }

    // Indicate to client to fallback to browser SpeechSynthesis
    res.status(204).end();
  } catch (err: any) {
    console.error('TTS API error:', err);
    res.status(500).json({ error: err.message || 'TTS synthesis failed.' });
  }
});

// ------------------------------------
// UNIFIED OPENAI VOICE & TUTOR TURN API
// ------------------------------------

// Unified Voice-First Turn: STT (Whisper) -> GPT-4o (structured reply & mistakes) -> TTS (OpenAI) -> Storage
app.post('/api/voice/session-turn', async (req, res) => {
  try {
    const {
      audioBase64,
      userMessage,
      mimeType,
      studentId,
      targetLanguage,
      nativeLanguage,
      conversationHistory,
      voice,
    } = req.body;

    if (!audioBase64 && (!userMessage || typeof userMessage !== 'string')) {
      return res.status(400).json({ error: 'Either audioBase64 or userMessage is required.' });
    }

    const result = await executeOpenAITutorTurn({
      audioBase64,
      userMessage,
      mimeType,
      studentId: studentId || 'default-student',
      targetLanguage: targetLanguage || 'English',
      nativeLanguage: nativeLanguage || 'English',
      conversationHistory: conversationHistory || [],
      voice: voice || 'onyx',
    });

    res.json(result);
  } catch (err: any) {
    console.error('Session Turn API error:', err);
    res.status(500).json({ error: err.message || 'Voice turn processing failed.' });
  }
});

// Fetch Student Mistake History & Memory Summary
app.get('/api/students/:id/mistakes', async (req, res) => {
  try {
    const studentId = req.params.id || 'default-student';
    const mistakes = await getStudentMistakes(studentId, 30);
    const summary = await getStudentMistakeSummary(studentId);

    res.json({
      studentId,
      mistakes,
      summary,
    });
  } catch (err: any) {
    console.error('Student Mistakes API error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch student mistakes.' });
  }
});

// 2. Get Character Info
app.get('/api/character', (req, res) => {
  res.json({
    character: serverCharacter,
    inventory: serverInventory,
  });
});

// 3. Start Timed Quest
app.post('/api/quests/:id/start', (req, res) => {
  const { id } = req.params;
  const quest = serverQuests.find((q) => q.id === id);

  if (!quest) {
    return res.status(404).json({ error: 'Quest not found on server.' });
  }

  quest.started_at = new Date().toISOString();
  res.json({ success: true, quest });
});

// 4. Complete Quest (Authoritative Backend Verification & Rate Limiting)
app.post('/api/quests/complete', (req, res) => {
  const { questId, reflectionNote, proofUrl } = req.body;
  const quest = serverQuests.find((q) => q.id === questId);

  if (!quest) {
    return res.status(404).json({ error: 'Quest not found on server.' });
  }

  if (quest.completed) {
    return res.status(400).json({ error: 'Quest has already been completed.' });
  }

  // Authoritative Backend Check: Minimum Duration & Rate Limiting
  const eligibility = validateQuestCompletionEligibility(quest, serverCompletions);
  if (!eligibility.allowed) {
    return res.status(400).json({ error: eligibility.error });
  }

  // Mark quest complete on server
  quest.completed = true;
  quest.completed_at = new Date().toISOString();

  // Run authoritative game engine logic
  const result = processQuestCompletion(
    serverCharacter,
    quest,
    serverCompletions,
    serverAchievements,
    reflectionNote,
    proofUrl
  );

  serverCharacter = result.updatedCharacter;
  serverCompletions.unshift(result.completionRecord);
  serverAchievements = result.updatedAchievements;

  res.json({
    success: true,
    character: serverCharacter,
    completion: result.completionRecord,
    feedback: result.feedback,
    achievements: serverAchievements,
  });
});

// 5. Buy Market Item (Authoritative Gold Check)
app.post('/api/market/buy', (req, res) => {
  const { itemId } = req.body;
  const item = MARKET_ITEMS.find((i) => i.id === itemId);

  if (!item) {
    return res.status(404).json({ error: 'Market item not found.' });
  }

  if (serverInventory.includes(itemId)) {
    return res.status(400).json({ error: 'Item already owned in Arsenal.' });
  }

  if (serverCharacter.gold < item.cost) {
    return res.status(400).json({ error: 'Insufficient Gold on server.' });
  }

  // Deduct Gold & Add to Inventory
  serverCharacter.gold -= item.cost;
  serverInventory.push(itemId);

  res.json({
    success: true,
    character: serverCharacter,
    inventory: serverInventory,
    message: `Acquired ${item.name}!`,
  });
});

// ------------------------------------
// VITE DEV SERVER MIDDLEWARE / STATIC SERVING
// ------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });

    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        const fs = await import('fs');
        const rawIndexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
        let template = await vite.transformIndexHtml(url, rawIndexHtml);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    // Production Static Asset Serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`🎙️ VALOR — AI Language Partner running at http://localhost:${PORT}`);
  });
}

startServer();

import { getStudentMistakeSummary, recordStudentMistakes, StudentMistakeRecord } from './studentStorage';

export interface StructuredMistakeItem {
  type: 'grammar' | 'vocabulary' | 'sentence_formation' | 'pronunciation' | 'fluency' | 'general';
  original_text: string;
  correction: string;
  explanation: string;
}

export interface OpenAITutorTurnResponse {
  transcript: string;
  reply: string;
  audioBase64?: string;
  mistakes: StructuredMistakeItem[];
  studentMistakeSummary?: string;
  provider: string;
}

export interface TurnOptions {
  audioBase64?: string;
  userMessage?: string;
  mimeType?: string;
  studentId?: string;
  targetLanguage?: string;
  nativeLanguage?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  voice?: 'onyx' | 'echo' | 'alloy' | 'fable' | 'nova' | 'shimmer';
}

/**
 * 1. Transcribe Audio using OpenAI Whisper API
 */
export async function transcribeWithWhisper(
  audioBase64: string,
  mimeType: string = 'audio/webm',
  apiKey: string
): Promise<string> {
  const buffer = Buffer.from(audioBase64, 'base64');
  const blob = new Blob([buffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, 'speech.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper STT failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.text ? data.text.trim() : '';
}

/**
 * 2. Synthesize Speech using OpenAI TTS API
 */
export async function synthesizeWithOpenAITTS(
  text: string,
  apiKey: string,
  voice: 'onyx' | 'echo' | 'alloy' | 'fable' | 'nova' | 'shimmer' = 'onyx'
): Promise<Buffer | null> {
  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: voice,
        input: text,
      }),
    });

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } else {
      console.warn(`[OpenAI TTS] API error status ${response.status}`);
    }
  } catch (err) {
    console.warn('[OpenAI TTS] Network or execution error:', err);
  }
  return null;
}

/**
 * 3. Process complete Voice / Text turn using GPT-4o with Structured JSON Output
 */
export async function executeOpenAITutorTurn(
  options: TurnOptions
): Promise<OpenAITutorTurnResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing from environment variables.');
  }

  const {
    audioBase64,
    userMessage,
    mimeType = 'audio/webm',
    studentId = 'default-student',
    targetLanguage = 'English',
    nativeLanguage = 'English',
    conversationHistory = [],
    voice = 'onyx',
  } = options;

  // Step A: Speech-to-Text via Whisper (if audio provided)
  let transcript = userMessage || '';
  if (audioBase64 && !transcript) {
    transcript = await transcribeWithWhisper(audioBase64, mimeType, apiKey);
  }

  if (!transcript.trim()) {
    return {
      transcript: '',
      reply: "I couldn't hear you clearly. Could you please say that again?",
      mistakes: [],
      provider: 'OpenAI GPT-4o',
    };
  }

  // Step B: Retrieve dynamic student memory from persistent storage
  const studentMemorySummary = await getStudentMistakeSummary(studentId);

  // Step C: Build GPT-4o System Prompt
  const systemPrompt = `You are VALOR — an intelligent, patient, calm, warm, and mature English language teacher & conversation partner.

Your core purpose is to help the user master ${targetLanguage} through natural conversation.

STUDENT PROFILE & CONTEXT:
- Target Language: ${targetLanguage}
- Native Language: ${nativeLanguage}
- Student ID: ${studentId}

${studentMemorySummary}

GUIDELINES FOR YOUR RESPONSE:
1. **Dynamic LLM Brain**: Answer open-ended questions intelligently (general knowledge, tech, daily life, science, culture). You are fully dynamic, like ChatGPT.
2. **Grammar & Mistake Detection**: Carefully analyze the user's input for grammar, vocabulary, sentence formation, pronunciation, or fluency errors.
   - If errors exist, populate the \`mistakes\` array with structured items:
     - \`type\`: 'grammar' | 'vocabulary' | 'sentence_formation' | 'pronunciation' | 'fluency' | 'general'
     - \`original_text\`: the exact user phrase with the mistake
     - \`correction\`: the corrected version
     - \`explanation\`: simple, encouraging explanation (1-2 sentences)
3. **Conversational Reply (\`reply\`)**:
   - Sound like a calm gentleman speaking naturally.
   - If there was a major mistake, gently explain it in the reply and offer the corrected phrase before continuing the conversation.
   - Keep replies concise (2-4 sentences) so they are pleasant to listen to.
   - Naturally switch languages or offer translations if requested by the user.

OUTPUT REQUIREMENT:
You MUST respond with a single valid JSON object containing:
{
  "reply": "Your natural spoken conversational reply string",
  "mistakes": [
    {
      "type": "grammar",
      "original_text": "user wrong phrase",
      "correction": "corrected phrase",
      "explanation": "concise rationale"
    }
  ]
}`;

  // Step D: Format conversation history for Chat Completion
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Include recent history (up to last 10 messages)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({ role: 'user', content: transcript });

  // Step E: Call GPT-4o with structured JSON mode
  const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!completionResponse.ok) {
    const errorBody = await completionResponse.text();
    throw new Error(`GPT-4o API error (${completionResponse.status}): ${errorBody}`);
  }

  const completionData = await completionResponse.json();
  const rawContent = completionData.choices?.[0]?.message?.content || '{}';

  let replyText = 'I am listening, please go ahead.';
  let mistakes: StructuredMistakeItem[] = [];

  try {
    const parsed = JSON.parse(rawContent);
    if (parsed.reply) {
      replyText = parsed.reply;
    }
    if (Array.isArray(parsed.mistakes)) {
      mistakes = parsed.mistakes;
    }
  } catch (err) {
    console.warn('[OpenAITutorEngine] JSON parsing fallback applied:', err);
    replyText = rawContent;
  }

  // Step F: Persist detected mistakes into student memory
  if (mistakes.length > 0) {
    await recordStudentMistakes(
      studentId,
      mistakes.map((m) => ({
        type: m.type,
        original_text: m.original_text,
        correction: m.correction,
        explanation: m.explanation,
      }))
    );
  }

  // Step G: Generate TTS Audio using OpenAI TTS (voice: onyx/echo)
  const audioBuffer = await synthesizeWithOpenAITTS(replyText, apiKey, voice);
  const ttsAudioBase64 = audioBuffer ? audioBuffer.toString('base64') : undefined;

  return {
    transcript,
    reply: replyText,
    audioBase64: ttsAudioBase64,
    mistakes,
    studentMistakeSummary: studentMemorySummary,
    provider: 'OpenAI GPT-4o + Whisper + TTS',
  };
}

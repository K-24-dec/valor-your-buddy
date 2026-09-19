import { GoogleGenAI } from '@google/genai';

export interface STTResponse {
  text: string;
  provider: string;
}

export interface GrammarEvaluationResult {
  hasErrors: boolean;
  originalText: string;
  explanation: string;
  correctedSentence: string;
  retryPrompt: string;
  spokenResponse: string;
  llmProvider: string;
}

/**
 * Perform STT (Speech-to-Text) using Whisper API or Deepgram API if keys are present.
 */
export async function transcribeAudioServer(
  audioBase64: string,
  mimeType: string = 'audio/webm'
): Promise<STTResponse> {
  const whisperApiKey = process.env.OPENAI_API_KEY || process.env.WHISPER_API_KEY;
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

  // 1. Try Deepgram Streaming / REST API if key exists
  if (deepgramApiKey) {
    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          'Content-Type': mimeType,
        },
        body: buffer,
      });

      if (response.ok) {
        const result = await response.json();
        const transcript =
          result.results?.channels[0]?.alternatives[0]?.transcript || '';
        if (transcript.trim()) {
          return { text: transcript.trim(), provider: 'Deepgram Nova-2' };
        }
      }
    } catch (err) {
      console.warn('Deepgram STT failed:', err);
    }
  }

  // 2. Try OpenAI Whisper API if key exists
  if (whisperApiKey) {
    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      const blob = new Blob([buffer], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, 'speech.webm');
      formData.append('model', 'whisper-1');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whisperApiKey}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.text) {
          return { text: result.text.trim(), provider: 'Whisper API' };
        }
      }
    } catch (err) {
      console.warn('Whisper API STT failed:', err);
    }
  }

  // 3. Fallback: If Gemini API key is available, use Gemini Multimodal Audio transcription
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: mimeType || 'audio/webm',
                  data: audioBase64,
                },
              },
              {
                text: 'Transcribe the audio accurately into English text. Return ONLY the transcribed text without any extra commentary or quotation marks.',
              },
            ],
          },
        ],
      });

      if (response.text) {
        return { text: response.text.trim(), provider: 'Gemini 2.5 Flash Multimodal STT' };
      }
    } catch (err) {
      console.warn('Gemini Audio STT failed:', err);
    }
  }

  throw new Error(
    'STT API key not configured (set OPENAI_API_KEY, DEEPGRAM_API_KEY, or GEMINI_API_KEY).'
  );
}

/**
 * Perform LLM Grammar/Vocab Correction with structured System Prompt requirements.
 */
export async function evaluateGrammarServer(
  transcript: string
): Promise<GrammarEvaluationResult> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const systemPrompt = `You are an expert, encouraging English language tutor. Analyze the user's spoken sentence for grammar, vocabulary, word choice, and sentence formation errors.

Evaluations required:
(a) Identify grammar, vocabulary, or sentence-formation errors.
(b) Explain simply in 1-2 clear sentences.
(c) Give the exact corrected sentence.
(d) Prompt the student to retry speaking the corrected sentence or answer a follow-up.

Return ONLY a valid JSON object matching this structure:
{
  "hasErrors": boolean,
  "explanation": "Simple explanation of the error or positive feedback if clean",
  "correctedSentence": "The corrected English sentence",
  "retryPrompt": "Encouraging instruction asking student to repeat the corrected sentence",
  "spokenResponse": "Concise natural string combining explanation, corrected sentence, and retry prompt suitable for Text-to-Speech audio"
}`;

  // 1. Try Gemini LLM
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'system', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: `User Spoken Sentence: "${transcript}"` }] },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return {
          hasErrors: Boolean(parsed.hasErrors),
          originalText: transcript,
          explanation: parsed.explanation || 'No errors detected.',
          correctedSentence: parsed.correctedSentence || transcript,
          retryPrompt: parsed.retryPrompt || 'Great job! Try another sentence.',
          spokenResponse:
            parsed.spokenResponse ||
            `${parsed.explanation || ''} ${parsed.correctedSentence || ''} ${parsed.retryPrompt || ''}`,
          llmProvider: 'Gemini 2.5 Flash',
        };
      }
    } catch (err) {
      console.warn('Gemini LLM evaluation failed:', err);
    }
  }

  // 2. Try OpenAI GPT-4o / GPT-3.5 if key present
  if (openaiApiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `User Spoken Sentence: "${transcript}"` },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          return {
            hasErrors: Boolean(parsed.hasErrors),
            originalText: transcript,
            explanation: parsed.explanation || 'No errors detected.',
            correctedSentence: parsed.correctedSentence || transcript,
            retryPrompt: parsed.retryPrompt || 'Great job! Try another sentence.',
            spokenResponse:
              parsed.spokenResponse ||
              `${parsed.explanation || ''} ${parsed.correctedSentence || ''} ${parsed.retryPrompt || ''}`,
            llmProvider: 'OpenAI GPT-4o-mini',
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI LLM evaluation failed:', err);
    }
  }

  throw new Error('LLM API key not configured (set GEMINI_API_KEY or OPENAI_API_KEY).');
}

/**
 * Perform TTS (Text-to-Speech) using ElevenLabs or Azure TTS API if keys are present.
 */
export async function synthesizeSpeechServer(text: string): Promise<Buffer | null> {
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
  // Default to Adam (pNInz6obpgDQGcFmaJgB) - calm, warm, mature adult male voice
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB';

  // 1. Try ElevenLabs API (Calm Mature Male Gentleman Voice)
  if (elevenlabsApiKey) {
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': elevenlabsApiKey,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.85,
              similarity_boost: 0.80,
              style: 0.0,
              use_speaker_boost: true,
            },
          }),
        }
      );

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn('ElevenLabs TTS failed:', err);
    }
  }

  // 2. Try Azure TTS if keys exist (Calm Male Voice en-US-GuyNeural)
  const azureKey = process.env.AZURE_TTS_KEY;
  const azureRegion = process.env.AZURE_TTS_REGION || 'eastus';
  if (azureKey) {
    try {
      const ssml = `<speak version='1.0' xml:lang='en-US'><voice xml:lang='en-US' xml:gender='Male' name='en-US-GuyNeural'><prosody rate='-5%' pitch='-2%'>${text}</prosody></voice></speak>`;
      const response = await fetch(
        `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
          },
          body: ssml,
        }
      );

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
    } catch (err) {
      console.warn('Azure TTS failed:', err);
    }
  }

  return null;
}

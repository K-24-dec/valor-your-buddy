import { GoogleGenAI } from '@google/genai';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  correction?: AgentCorrection | null;
}

export interface AgentCorrection {
  level: 'small' | 'repeated' | 'important' | 'none';
  originalSnippet?: string;
  correctedSnippet?: string;
  explanation?: string;
  naturalCorrectionNote?: string;
  practicePrompt?: string;
  practiceAnswer?: string;
}

export interface AIChatResponse {
  agentReply: string;
  correction: AgentCorrection | null;
  detectedLevel: 'beginner' | 'intermediate' | 'advanced';
  suggestedTopicNext?: string;
  spokenResponseText: string;
  llmProvider: string;
  error?: string;
}

export interface AIChatOptions {
  userMessage: string;
  targetLanguage: string;
  nativeLanguage: string;
  mode?: 'free' | 'interview' | 'daily' | 'debate' | 'story';
  dailyTopic?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  conversationHistory?: ChatMessage[];
  struggledConcepts?: string[];
}

/**
 * Primary Multi-LLM Conversational Engine for VALOR
 * Supports Gemini 2.5 Flash, Groq, OpenAI GPT-4o, DeepSeek, and custom LLM endpoints.
 */
export async function generateAIChatResponseServer(
  options: AIChatOptions
): Promise<AIChatResponse> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.LLM_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const groqApiKey = process.env.GROQ_API_KEY;
  const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
  const customBaseUrl = process.env.LLM_BASE_URL;

  const targetLang = options.targetLanguage || 'Auto Detect';
  const nativeLang = options.nativeLanguage || 'English';
  const mode = options.mode || 'free';
  const userLevel = options.userLevel || 'intermediate';
  const dailyTopic = options.dailyTopic || 'general conversation';

  const systemPrompt = `You are Valor, a natural, intelligent, calm, warm, mature, multilingual conversational AI assistant.

PRIMARY PURPOSE: Respond dynamically to whatever the user actually says. Understand their intent, context, and conversation history. You are NOT a scripted chatbot.

TOPIC FREEDOM:
The user may ask about ANY topic including programming, technology, science, careers, travel, education, entertainment, hobbies, general knowledge, daily life, creative ideas, space, mathematics, or casual conversation.
Answer the user's actual question directly and helpfully.
If the user asks a follow-up question, understand what they are referring to from previous messages in the conversation history.

LANGUAGE & CODE-SWITCHING RULES:
1. Automatically understand the language used by the user.
2. If targetLanguage is "Auto Detect" or not explicitly locked, respond in whatever language the user speaks (English, Telugu, Hindi, German, Spanish, French, Japanese, Chinese, Korean, Italian, Portuguese, etc.).
3. If the user switches languages during the conversation, switch naturally with them.
4. Support natural code-switching (e.g. "Python lo arrays ela work chestayi?"). Understand mixed-language sentences and respond in matching natural code-switched language.
5. If targetLanguage is explicitly set to a specific language (and not "Auto Detect"), write your response primarily in that target language.

CONVERSATION & MEMORY RULES:
- Remember relevant details from previous messages in this conversation (e.g. user name, topic context, code snippets).
- Keep simple answers concise. Provide detailed explanations when requested.
- Avoid repeating generic chatbot phrases such as "That's interesting!", "I really enjoy chatting with you!", "Tell me more!", or "What happened in your week?".
- Do NOT force a question at the end of every message unless genuinely useful.

OPTIONAL LANGUAGE CORRECTION (Only if applicable):
If the user makes a clear grammar or vocabulary mistake while learning a language, you may populate the correction object with a gentle note. Otherwise set level to "none".

Return ONLY a JSON object with this structure:
{
  "agentReply": "Your dynamic response in the user's language",
  "correction": {
    "level": "small" | "repeated" | "important" | "none",
    "originalSnippet": "problematic phrase or empty if none",
    "correctedSnippet": "corrected phrase or empty if none",
    "explanation": "brief explanation if relevant",
    "naturalCorrectionNote": "subtle gentle note if small/repeated mistake, or empty if none",
    "practicePrompt": "fill in blank prompt if level is important, otherwise empty",
    "practiceAnswer": "answer for practice prompt if level is important"
  },
  "detectedLevel": "${userLevel}",
  "spokenResponseText": "Text suitable for TTS audio readout"
}`;

  // Format Conversation History into Messages Array
  const historyMessages = (options.conversationHistory || []).slice(-10).map((msg: any) => ({
    role: (msg.role === 'user' || msg.sender === 'user') ? ('user' as const) : ('assistant' as const),
    content: msg.content || msg.text || '',
  }));

  const userPromptText = `Target Language setting: ${targetLang}
Learner Native Language: ${nativeLang}
User Input: "${options.userMessage}"`;

  // 1. Try Gemini LLM API
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const contentsPayload = [
        ...historyMessages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user', parts: [{ text: userPromptText }] },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'system', parts: [{ text: systemPrompt }] },
          ...contentsPayload,
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return parseAndFormatResponse(parsed, 'Gemini 2.5 Flash', userLevel);
      }
    } catch (err) {
      console.warn('Gemini LLM call failed, trying next provider:', err);
    }
  }

  // 2. Try Groq API (High Speed Llama-3.3-70b)
  if (groqApiKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: userPromptText },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return parseAndFormatResponse(JSON.parse(content), 'Groq Llama-3.3-70b', userLevel);
        }
      }
    } catch (err) {
      console.warn('Groq LLM call failed:', err);
    }
  }

  // 3. Try OpenAI API
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
            ...historyMessages,
            { role: 'user', content: userPromptText },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return parseAndFormatResponse(JSON.parse(content), 'OpenAI GPT-4o-mini', userLevel);
        }
      }
    } catch (err) {
      console.warn('OpenAI LLM call failed:', err);
    }
  }

  // 4. Try DeepSeek API
  if (deepseekApiKey) {
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: userPromptText },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return parseAndFormatResponse(JSON.parse(content), 'DeepSeek V3', userLevel);
        }
      }
    } catch (err) {
      console.warn('DeepSeek LLM call failed:', err);
    }
  }

  // 5. Try Custom OpenAI-Compatible Base URL (e.g. Local Ollama or custom API)
  if (customBaseUrl) {
    try {
      const endpoint = customBaseUrl.endsWith('/chat/completions')
        ? customBaseUrl
        : `${customBaseUrl.replace(/\/$/, '')}/chat/completions`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'default',
          messages: [
            { role: 'system', content: systemPrompt },
            ...historyMessages,
            { role: 'user', content: userPromptText },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0]?.message?.content;
        if (content) {
          return parseAndFormatResponse(JSON.parse(content), 'Custom LLM Endpoint', userLevel);
        }
      }
    } catch (err) {
      console.warn('Custom Base URL LLM call failed:', err);
    }
  }

  // Explicit Error Response when NO LLM API keys are configured or all calls fail
  return {
    agentReply:
      'Sorry, I could not process that right now. Please set a valid GEMINI_API_KEY, OPENAI_API_KEY, GROQ_API_KEY, or LLM_API_KEY in your .env file.',
    correction: null,
    detectedLevel: userLevel,
    spokenResponseText:
      'Sorry, I could not process that right now. Please check your API key in the environment configuration.',
    llmProvider: 'System Error (Missing LLM API Key)',
    error: 'NO_LLM_API_KEY_CONFIGURED',
  };
}

function parseAndFormatResponse(
  parsed: any,
  providerName: string,
  fallbackLevel: 'beginner' | 'intermediate' | 'advanced'
): AIChatResponse {
  const correctionObj: AgentCorrection | null =
    parsed.correction && parsed.correction.level && parsed.correction.level !== 'none'
      ? {
          level: parsed.correction.level || 'small',
          originalSnippet: parsed.correction.originalSnippet || '',
          correctedSnippet: parsed.correction.correctedSnippet || '',
          explanation: parsed.correction.explanation || '',
          naturalCorrectionNote: parsed.correction.naturalCorrectionNote || '',
          practicePrompt: parsed.correction.practicePrompt || '',
          practiceAnswer: parsed.correction.practiceAnswer || '',
        }
      : null;

  const agentReply = parsed.agentReply || 'I understand! Tell me more.';
  const spokenText =
    parsed.spokenResponseText ||
    (correctionObj?.naturalCorrectionNote
      ? `${agentReply} ${correctionObj.naturalCorrectionNote}`
      : agentReply);

  return {
    agentReply,
    correction: correctionObj,
    detectedLevel: parsed.detectedLevel || fallbackLevel,
    spokenResponseText: spokenText.trim(),
    llmProvider: providerName,
  };
}

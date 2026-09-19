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
}

export interface AIChatOptions {
  userMessage: string;
  targetLanguage: string;
  nativeLanguage: string;
  mode: 'free' | 'interview' | 'daily' | 'debate' | 'story';
  dailyTopic?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  conversationHistory?: ChatMessage[];
  struggledConcepts?: string[];
}

/**
 * Generate AI Partner Conversational Turn using Gemini 2.5 Flash / OpenAI
 */
export async function generateAIChatResponseServer(
  options: AIChatOptions
): Promise<AIChatResponse> {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  const targetLang = options.targetLanguage || 'English';
  const nativeLang = options.nativeLanguage || 'English';
  const mode = options.mode || 'free';
  const userLevel = options.userLevel || 'intermediate';
  const dailyTopic = options.dailyTopic || 'general conversation';

  const modeInstructions = {
    free: `Engage in natural, friendly, open-ended conversation on any topic the user brings up.`,
    interview: `Act as a supportive, professional interviewer. Ask relevant interview questions, follow up naturally on their answers, and give constructive partner feedback.`,
    daily: `Simulate a real-world scenario about "${dailyTopic}". Act as a person in that situation (e.g. store assistant, friend at college, travel agent, restaurant server) and keep the roleplay natural.`,
    debate: `Engage in a friendly debate on an interesting topic. State your perspective, ask for their opinion, and encourage them to express complex ideas.`,
    story: `Build a story together interactively! Add 2-3 sentences to the narrative and ask the user what happens next or what a character does.`,
  };

  const levelInstructions = {
    beginner: `Use simple short sentences, common vocabulary, and clear, relaxed delivery. Be patient. Use native language (${nativeLang}) ONLY if necessary to clarify an unfamiliar word.`,
    intermediate: `Use standard, natural conversational sentences. Keep the conversation flowing smoothly with common idioms and varied vocabulary.`,
    advanced: `Use sophisticated vocabulary, idioms, complex sentence structures, and nuanced discussion. Offer subtle stylistic suggestions.`,
  };

  const systemPrompt = `You are Valor, a calm, warm, patient, mature gentleman language-learning partner.
PRIMARY PURPOSE: Help the learner build language confidence through relaxed, natural conversation in ${targetLang}.
Learner Native Language: ${nativeLang}.
Learner Target Language: ${targetLang}.
Current Mode: ${mode.toUpperCase()} - ${modeInstructions[mode]}.
Estimated Learner Proficiency Level: ${userLevel.toUpperCase()} - ${levelInstructions[userLevel]}.

PERSONALITY & VOICE TONE:
- Calm, warm, friendly, patient, reassuring, intelligent, natural.
- Speak like a gentleman having a pleasant, relaxed chat with a friend.
- Do NOT use hyper-energetic or robotic classroom encouragement like "GREAT JOB!!!", "AMAZING!", "FANTASTIC!", "EXCELLENT!".
- Use encouragement naturally and sparingly (e.g. "That's good.", "I understood what you meant.", "Nice work.", "That makes sense.").

CORE RULES FOR RESPONSES:
1. Prioritize natural conversation in ${targetLang} over long lectures or classroom drills. Feel like a conversation partner first, teacher second.
2. Intelligent Correction System:
   - "small": Small error. Respond conversationally to what they said FIRST, then add a short, gentle note (e.g., "By the way, a more natural way to say that is: 'I went yesterday.'").
   - "repeated": Repeated pattern error. Briefly explain the pattern in 1 clear sentence and give another quick example.
   - "important": Core error hindering understanding. Explain clearly and provide a quick fill-in-the-blank prompt (e.g., "Almost! We say 'She goes every day.' Try this: 'She ___ to college every day.'", practiceAnswer: "goes").
   - "none": Clean or natural sentence. No correction needed.
3. Keep agentReply natural, warm, and concise (2-4 sentences max).
4. spokenResponseText should be a clean, audio-friendly version of agentReply + natural correction note combined.

Return ONLY a JSON object with this structure:
{
  "agentReply": "Your main conversational reply in ${targetLang}",
  "correction": {
    "level": "small" | "repeated" | "important" | "none",
    "originalSnippet": "problematic phrase or empty if none",
    "correctedSnippet": "corrected phrase or empty if none",
    "explanation": "brief explanation if relevant",
    "naturalCorrectionNote": "subtle friendly note if small/repeated mistake",
    "practicePrompt": "fill in blank prompt if level is important, otherwise empty",
    "practiceAnswer": "answer for practice prompt if level is important"
  },
  "detectedLevel": "${userLevel}",
  "spokenResponseText": "Text suitable for TTS voice readout"
}`;

  const formattedHistory = (options.conversationHistory || [])
    .slice(-6)
    .map((msg) => `${msg.role === 'user' ? 'Learner' : 'Valor'}: ${msg.content}`)
    .join('\n');

  const userPrompt = `Conversation History:\n${formattedHistory}\n\nLearner says: "${options.userMessage}"`;

  // 1. Try Gemini LLM
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { role: 'system', parts: [{ text: systemPrompt }] },
          { role: 'user', parts: [{ text: userPrompt }] },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        const correctionObj: AgentCorrection | null =
          parsed.correction && parsed.correction.level !== 'none'
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

        const agentReply = parsed.agentReply || 'That sounds interesting! Tell me more.';
        const spokenText =
          parsed.spokenResponseText ||
          `${agentReply} ${correctionObj?.naturalCorrectionNote || ''}`;

        return {
          agentReply,
          correction: correctionObj,
          detectedLevel: parsed.detectedLevel || userLevel,
          spokenResponseText: spokenText.trim(),
          llmProvider: 'Gemini 2.5 Flash',
        };
      }
    } catch (err) {
      console.warn('Gemini AI Chat generation failed, falling back:', err);
    }
  }

  // 2. Try OpenAI Chat Completions fallback
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
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const content = result.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const correctionObj: AgentCorrection | null =
            parsed.correction && parsed.correction.level !== 'none'
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

          return {
            agentReply: parsed.agentReply || 'That sounds great! Tell me more.',
            correction: correctionObj,
            detectedLevel: parsed.detectedLevel || userLevel,
            spokenResponseText: parsed.spokenResponseText || parsed.agentReply,
            llmProvider: 'OpenAI GPT-4o-mini',
          };
        }
      }
    } catch (err) {
      console.warn('OpenAI AI Chat generation failed:', err);
    }
  }

  // 3. Robust Client/Rule-Based Smart Fallback
  return generateFallbackAIChatResponse(options);
}

/**
 * Intelligent Rule-Based Fallback AI Partner Generator
 */

export function generateFallbackAIChatResponse(options: AIChatOptions): AIChatResponse {
  const input = options.userMessage.trim();
  const targetLang = options.targetLanguage || 'English';
  let agentReply = `That's great! Let's keep talking in ${targetLang}. What else would you like to discuss today?`;
  let correction: AgentCorrection | null = null;

  // Simple pattern detection for common learner errors
  if (/\b(go yesterday|wenting|i goes|she go|he go)\b/i.test(input)) {
    if (/\bi go yesterday\b/i.test(input)) {
      agentReply = `Nice! What did you do yesterday?`;
      correction = {
        level: 'small',
        originalSnippet: 'I go yesterday',
        correctedSnippet: 'I went yesterday',
        explanation: 'Past tense of "go" is "went".',
        naturalCorrectionNote: `By the way, a more natural way to say that is: "I went yesterday."`,
      };
    } else if (/\bshe go\b/i.test(input) || /\bhe go\b/i.test(input)) {
      agentReply = `I understand! Does that happen every day?`;
      correction = {
        level: 'important',
        originalSnippet: 'she go',
        correctedSnippet: 'she goes',
        explanation: 'Use "goes" for third person singular (he/she/it).',
        naturalCorrectionNote: `Almost! We say "She goes..."`,
        practicePrompt: `Try this: "She ___ to college every day."`,
        practiceAnswer: 'goes',
      };
    }
  } else if (/\bme want\b/i.test(input)) {
    agentReply = `Sounds good! Tell me more about what you like to do.`;
    correction = {
      level: 'small',
      originalSnippet: 'me want',
      correctedSnippet: 'I want',
      naturalCorrectionNote: `By the way, a more natural phrasing is "I want..." instead of "Me want..."`,
    };
  } else {
    // Mode-specific fallback responses
    if (options.mode === 'interview') {
      agentReply = `Thank you for sharing that. Could you give me an example of a challenge you faced and how you overcame it?`;
    } else if (options.mode === 'daily') {
      agentReply = `Welcome! How can I help you today? Would you like to check out our menu or place an order?`;
    } else if (options.mode === 'debate') {
      agentReply = `That is an interesting point of view! However, some people might argue the opposite. What is your strongest reason?`;
    } else if (options.mode === 'story') {
      agentReply = `Suddenly, a mysterious key appeared on the table! What do we do next?`;
    } else {
      agentReply = `I really enjoy chatting with you! What is something interesting that happened in your week so far?`;
    }
  }

  const spokenText = correction
    ? `${agentReply} ${correction.naturalCorrectionNote || ''}`
    : agentReply;

  return {
    agentReply,
    correction,
    detectedLevel: options.userLevel || 'intermediate',
    spokenResponseText: spokenText,
    llmProvider: 'Valor Intelligent Local Engine',
  };
}

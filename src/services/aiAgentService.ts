import { GrammarCorrectionResponse, speakResponse } from './voiceService';

export type LanguageCode =
  | 'Auto Detect'
  | 'English'
  | 'Telugu'
  | 'Hindi'
  | 'German'
  | 'Spanish'
  | 'French'
  | 'Japanese'
  | 'Chinese'
  | 'Korean'
  | 'Italian'
  | 'Portuguese'
  | 'Russian'
  | 'Arabic';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'Auto Detect', name: 'Auto Detect', nativeName: 'Automatic Language Detection', flag: '🌐' },
  { code: 'English', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'Telugu', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'German', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'Spanish', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'Japanese', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'Chinese', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'Korean', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'Italian', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'Portuguese', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'Russian', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'Arabic', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
];

export type ConversationMode = 'free' | 'interview' | 'daily' | 'debate' | 'story';

export interface DailyScenario {
  id: string;
  label: string;
  icon: string;
  initialPrompt: string;
}

export const DAILY_SCENARIOS: DailyScenario[] = [
  { id: 'college', label: 'College & Studies', icon: '🎓', initialPrompt: 'Hi! How are your college classes going today?' },
  { id: 'shopping', label: 'Shopping & Market', icon: '🛍️', initialPrompt: 'Hello! Welcome to our store. Are you looking for anything specific?' },
  { id: 'travel', label: 'Travel & Airport', icon: '✈️', initialPrompt: 'Good day! Where are you planning to travel next?' },
  { id: 'friends', label: 'Hanging with Friends', icon: '☕', initialPrompt: 'Hey! It has been a while. What have you been up to recently?' },
  { id: 'job_interview', label: 'Job Interview', icon: '💼', initialPrompt: 'Welcome to your interview. Can you introduce yourself briefly?' },
  { id: 'restaurant', label: 'Restaurant Dining', icon: '🍝', initialPrompt: 'Good evening! Ready to check out our menu today?' },
  { id: 'office', label: 'Office & Work', icon: '🏢', initialPrompt: 'Hi team! Let us catch up on today project update.' },
  { id: 'introductions', label: 'Meeting New People', icon: '👋', initialPrompt: 'Hi there! Nice to meet you. What is your name?' },
];

export interface AgentCorrection {
  level: 'small' | 'repeated' | 'important' | 'none';
  originalSnippet?: string;
  correctedSnippet?: string;
  explanation?: string;
  naturalCorrectionNote?: string;
  practicePrompt?: string;
  practiceAnswer?: string;
}

export interface TurnMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  correction?: AgentCorrection | null;
  structuredMistakes?: Array<{
    type: string;
    original_text: string;
    correction: string;
    explanation: string;
  }>;
  audioUrl?: string;
}

export interface UserPreferences {
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  mode: ConversationMode;
  dailyTopic: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  autoTTS: boolean;
  voiceSpeed: number;
  voicePitch: number;
  voiceVolume: number;
  selectedVoiceURI: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  targetLanguage: 'Auto Detect',
  nativeLanguage: 'English',
  mode: 'free',
  dailyTopic: 'college',
  userLevel: 'intermediate',
  autoTTS: true,
  voiceSpeed: 0.90,
  voicePitch: 0.95,
  voiceVolume: 0.90,
  selectedVoiceURI: '',
};

/**
 * Call Server API for Real LLM Response
 */
export async function sendUserMessageToAgent(
  userMessage: string,
  history: TurnMessage[],
  prefs: UserPreferences
): Promise<{
  agentReply: string;
  correction: AgentCorrection | null;
  spokenResponseText: string;
  llmProvider?: string;
  error?: string;
}> {
  try {
    const formattedHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: msg.text,
    }));

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage,
        targetLanguage: prefs.targetLanguage,
        nativeLanguage: prefs.nativeLanguage,
        mode: prefs.mode,
        dailyTopic: prefs.dailyTopic,
        userLevel: prefs.userLevel,
        conversationHistory: formattedHistory,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        agentReply: data.agentReply || "Sorry, I couldn't process that right now. Please try again.",
        correction: data.correction || null,
        spokenResponseText: data.spokenResponseText || data.agentReply || "Sorry, please try again.",
        llmProvider: data.llmProvider,
        error: data.error,
      };
    }
  } catch (err) {
    console.warn('Backend AI Chat endpoint error:', err);
  }

  return {
    agentReply: 'Sorry, I could not connect to the AI service right now. Please verify your server connection or API keys.',
    correction: null,
    spokenResponseText: 'Sorry, I could not connect to the AI service right now.',
    error: 'NETWORK_ERROR',
  };
}

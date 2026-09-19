import { GrammarCorrectionResponse, speakResponse } from './voiceService';

export type LanguageCode =
  | 'English'
  | 'Spanish'
  | 'French'
  | 'German'
  | 'Japanese'
  | 'Hindi'
  | 'Telugu'
  | 'Chinese'
  | 'Korean'
  | 'Italian'
  | 'Portuguese'
  | 'Russian'
  | 'Arabic'
  | 'Dutch';

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'English', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'Spanish', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'French', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'German', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'Japanese', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'Hindi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'Telugu', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'Chinese', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'Korean', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'Italian', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'Portuguese', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'Russian', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'Arabic', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'Dutch', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
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
  audioUrl?: string;
}

export interface UserPreferences {
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
  mode: ConversationMode;
  dailyTopic: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  autoTTS: boolean;
  voiceSpeed: number; // e.g. 0.90 for clear, relaxed pace
  voicePitch: number; // e.g. 0.95 for warm natural male pitch
  voiceVolume: number; // e.g. 0.90 for moderate volume
  selectedVoiceURI: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  targetLanguage: 'English',
  nativeLanguage: 'Telugu',
  mode: 'free',
  dailyTopic: 'college',
  userLevel: 'intermediate',
  autoTTS: true,
  voiceSpeed: 0.90, // Calm, clear, relaxed delivery for language learners
  voicePitch: 0.95, // Warm, natural male pitch (never artificially distorted)
  voiceVolume: 0.90,
  selectedVoiceURI: '',
};

/**
 * Call Server API for AI Chat response
 */
export async function sendUserMessageToAgent(
  userMessage: string,
  history: TurnMessage[],
  prefs: UserPreferences
): Promise<{
  agentReply: string;
  correction: AgentCorrection | null;
  spokenResponseText: string;
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
        agentReply: data.agentReply || 'That sounds great! Tell me more.',
        correction: data.correction || null,
        spokenResponseText: data.spokenResponseText || data.agentReply,
      };
    }
  } catch (err) {
    console.warn('Backend AI Chat endpoint unreachable, using client fallback engine:', err);
  }

  // Client-side fallback rule engine
  return generateClientFallbackResponse(userMessage, prefs);
}

function generateClientFallbackResponse(
  userMessage: string,
  prefs: UserPreferences
) {
  const input = userMessage.trim();
  let agentReply = `That is really interesting! Let us talk more in ${prefs.targetLanguage}. What else would you like to share?`;
  let correction: AgentCorrection | null = null;

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
        explanation: 'Use "goes" for third person singular.',
        naturalCorrectionNote: `Almost! We say "She goes..."`,
        practicePrompt: `Try this: "She ___ to college every day."`,
        practiceAnswer: 'goes',
      };
    }
  }

  const spokenResponseText = correction
    ? `${agentReply} ${correction.naturalCorrectionNote || ''}`
    : agentReply;

  return {
    agentReply,
    correction,
    spokenResponseText,
  };
}

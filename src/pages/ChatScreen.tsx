import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  RotateCcw,
  Send,
  Globe,
  Settings,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  Zap,
  Play,
  VolumeX,
  Languages,
  ChevronDown,
  Sliders,
} from 'lucide-react';
import {
  TurnMessage,
  UserPreferences,
  DEFAULT_PREFERENCES,
  SUPPORTED_LANGUAGES,
  DAILY_SCENARIOS,
  ConversationMode,
  sendUserMessageToAgent,
  LanguageCode,
  AgentCorrection,
} from '../services/aiAgentService';
import {
  AudioRecorder,
  speakResponse,
  transcribeAudio,
  voiceService,
  VoiceInfo,
} from '../services/voiceService';

interface ChatScreenProps {
  onNavigateHome?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ onNavigateHome }) => {
  // User Preferences & State
  const [prefs, setPrefs] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('valor_preferences');
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
  });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'language' | 'voice'>('language');
  const [availableVoices, setAvailableVoices] = useState<VoiceInfo[]>([]);
  const [inputText, setInputText] = useState<string>('');

  // Conversation turns
  const [messages, setMessages] = useState<TurnMessage[]>([]);
  const [isAgentThinking, setIsAgentThinking] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Practice prompt state (for Level 3 important mistakes)
  const [practiceAnswerInput, setPracticeAnswerInput] = useState<string>('');

  // Audio Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const recorderRef = useRef<AudioRecorder | null>(null);

  // Auto Scroll Ref
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Synchronize Voice Engine Settings with User Preferences
  useEffect(() => {
    voiceService.setRate(prefs.voiceSpeed ?? 0.90);
    voiceService.setPitch(prefs.voicePitch ?? 0.95);
    voiceService.setVolume(prefs.voiceVolume ?? 0.90);
    if (prefs.selectedVoiceURI) {
      voiceService.setVoice(prefs.selectedVoiceURI);
    }
    localStorage.setItem('valor_preferences', JSON.stringify(prefs));
  }, [prefs]);

  // Load available voices on mount
  useEffect(() => {
    const voices = voiceService.getAvailableVoices();
    setAvailableVoices(voices);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => {
        setAvailableVoices(voiceService.getAvailableVoices());
      };
    }
  }, []);

  // Initial Greet Message (Calm Gentleman Persona)
  useEffect(() => {
    const initialGreeting: TurnMessage = {
      id: 'msg-init',
      sender: 'agent',
      text: getInitialGreetingText(prefs),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([initialGreeting]);
  }, [prefs.mode, prefs.dailyTopic, prefs.targetLanguage]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAgentThinking]);

  function getInitialGreetingText(p: UserPreferences): string {
    if (p.mode === 'interview') {
      return `Hey. Good to see you. Ready for your interview practice in ${p.targetLanguage}? Tell me a little about yourself when you're ready.`;
    }
    if (p.mode === 'daily') {
      const scenario = DAILY_SCENARIOS.find((s) => s.id === p.dailyTopic);
      return scenario
        ? `${scenario.icon} ${scenario.initialPrompt}`
        : `Hey. Good to see you. How was your day today?`;
    }
    if (p.mode === 'debate') {
      return `Welcome to Debate Mode. What is a topic you feel passionate about? Or shall I suggest one for us?`;
    }
    if (p.mode === 'story') {
      return `Let us build a story together. Once upon a time in a quiet valley, a strange glowing door appeared in the forest... What happens next?`;
    }
    return `Hey. Good to see you. What would you like to talk about today?`;
  }

  // Handle Sending a User Message (Text or Spoken)
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    // Stop any ongoing speech playback
    voiceService.stop();

    const userTurn: TurnMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    setInputText('');
    setIsAgentThinking(true);

    try {
      const result = await sendUserMessageToAgent(textToSend, messages, prefs);

      const agentTurn: TurnMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: result.agentReply,
        correction: result.correction,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      (agentTurn as any).llmProvider = result.llmProvider;
      (agentTurn as any).error = result.error;

      setMessages((prev) => [...prev, agentTurn]);
      setIsAgentThinking(false);

      // Play Voice TTS if AutoTTS enabled
      if (prefs.autoTTS && result.spokenResponseText && !result.error) {
        setIsSpeaking(true);
        await speakResponse(result.spokenResponseText, {
          rate: prefs.voiceSpeed,
          pitch: prefs.voicePitch,
          volume: prefs.voiceVolume,
          voiceURI: prefs.selectedVoiceURI,
        });
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error('Error getting AI reply:', err);
      setIsAgentThinking(false);
    }
  };

  // Start Mic Recording
  const startRecording = async () => {
    // Cancel ongoing speech when user starts talking
    voiceService.stop();
    setIsSpeaking(false);

    try {
      setIsRecording(true);
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
    } catch (err: any) {
      console.error('Microphone error:', err);
      setIsRecording(false);
      alert(`Microphone Error: ${err.message || 'Could not access microphone.'}`);
    }
  };

  // Stop Mic Recording and process STT
  const stopRecordingAndSend = async () => {
    if (!recorderRef.current || !isRecording) return;
    setIsRecording(false);
    setIsTranscribing(true);

    try {
      const audioBlob = await recorderRef.current.stop();
      recorderRef.current = null;

      let transcribedText = '';
      try {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(audioBlob);
        });
        const base64Data = await base64Promise;
        const pureBase64 = base64Data.split(',')[1] || base64Data;

        const res = await fetch('/api/voice/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: pureBase64, mimeType: audioBlob.type }),
        });

        if (res.ok) {
          const data = await res.json();
          transcribedText = data.text;
        }
      } catch (err) {
        console.warn('Server STT failed, using Web Speech API fallback:', err);
      }

      if (!transcribedText.trim()) {
        transcribedText = await recordWithWebSpeech();
      }

      setIsTranscribing(false);

      if (transcribedText.trim()) {
        handleSendMessage(transcribedText);
      } else {
        alert('No speech was detected. Please try speaking again.');
      }
    } catch (err: any) {
      console.error('Recording process error:', err);
      setIsTranscribing(false);
    }
  };

  const recordWithWebSpeech = (): Promise<string> => {
    return new Promise((resolve) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve('');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.onresult = (e: any) => resolve(e.results[0][0].transcript || '');
      recognition.onerror = () => resolve('');
      try {
        recognition.start();
      } catch {
        resolve('');
      }
    });
  };

  // Practice Answer Submit (Level 3 important correction interactive loop)
  const handlePracticeSubmit = (messageId: string, expectedAnswer?: string) => {
    if (!practiceAnswerInput.trim()) return;

    voiceService.stop();

    const isCorrect =
      expectedAnswer &&
      practiceAnswerInput.trim().toLowerCase() === expectedAnswer.trim().toLowerCase();

    const userTurn: TurnMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: practiceAnswerInput.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userTurn]);
    setPracticeAnswerInput('');

    setTimeout(async () => {
      const confirmationText = isCorrect
        ? `That's good. You got it right.`
        : `Good try. The correct word is "${expectedAnswer}". Let us keep going.`;

      const confirmationTurn: TurnMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'agent',
        text: confirmationText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, confirmationTurn]);
      if (prefs.autoTTS) {
        setIsSpeaking(true);
        await speakResponse(confirmationText);
        setIsSpeaking(false);
      }
    }, 400);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 min-h-[calc(100vh-5rem)] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header Bar: Target/Native Language & Voice Settings Trigger */}
      <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#E8D3A2]/15 border border-[#E8D3A2]/30 flex items-center justify-center text-[#E8D3A2]">
            <Sparkles className="w-5 h-5 animate-pulse text-[#E8D3A2]" />
          </div>
          <div>
            <h1 className="text-base font-black text-[#F8FAFC] tracking-wide flex items-center gap-2">
              VALOR <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#E8D3A2]/20 text-[#E8D3A2] border border-[#E8D3A2]/30">Calm AI Partner</span>
            </h1>
            <p className="text-xs text-[#B8C4D0]">Learn naturally through conversation</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Language Selector Pill */}
          <button
            onClick={() => {
              setActiveTab('language');
              setShowSettingsModal(true);
            }}
            className="px-3.5 py-2 rounded-2xl bg-[#071522] hover:bg-[#071522]/80 border border-[#E8D3A2]/30 text-xs font-bold text-[#F8FAFC] flex items-center gap-2 transition-all cursor-pointer shadow-inner"
          >
            <Languages className="w-4 h-4 text-[#E8D3A2]" />
            <span>
              Native: <strong className="text-[#E8D3A2]">{prefs.nativeLanguage}</strong> ➔ Target: <strong className="text-[#F5E7C6]">{prefs.targetLanguage}</strong>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#B8C4D0]" />
          </button>

          {/* Voice Settings Pill */}
          <button
            onClick={() => {
              setActiveTab('voice');
              setShowSettingsModal(true);
            }}
            title="Calm Voice Settings"
            className="px-3 py-2 rounded-2xl bg-[#071522] hover:bg-[#071522]/80 border border-[#E8D3A2]/30 text-xs font-bold text-[#E8D3A2] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4 text-[#E8D3A2]" />
            <span className="hidden sm:inline">Voice</span>
          </button>

          {/* Audio Mute/Unmute Toggle */}
          <button
            onClick={() => {
              const nextAuto = !prefs.autoTTS;
              setPrefs((p) => ({ ...p, autoTTS: nextAuto }));
              if (!nextAuto) voiceService.stop();
            }}
            title={prefs.autoTTS ? 'Voice Audio ON' : 'Voice Audio Muted'}
            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
              prefs.autoTTS
                ? 'bg-[#E8D3A2]/20 border-[#E8D3A2]/50 text-[#E8D3A2]'
                : 'bg-[#071522] border-[#E8D3A2]/15 text-[#B8C4D0]/60'
            }`}
          >
            {prefs.autoTTS ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mode Switcher Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {[
          { id: 'free', label: '💬 Free Talk', desc: 'Natural conversation' },
          { id: 'interview', label: '💼 Interview', desc: 'Job & role practice' },
          { id: 'daily', label: '☕ Daily Life', desc: 'Real-world situations' },
          { id: 'debate', label: '🗣️ Debate', desc: 'Express opinions' },
          { id: 'story', label: '📖 Story', desc: 'Build stories together' },
        ].map((m) => {
          const isActive = prefs.mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                voiceService.stop();
                setPrefs((p) => ({ ...p, mode: m.id as ConversationMode }));
              }}
              className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-[#E8D3A2] text-[#071522] border-[#E8D3A2] shadow-[0_0_15px_rgba(232,211,162,0.3)]'
                  : 'bg-[#102A43] hover:bg-[#102A43]/80 text-[#B8C4D0] border-[#E8D3A2]/15'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {/* Daily Scenario Sub-Pills (Visible when Daily Life mode is active) */}
      {prefs.mode === 'daily' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar">
          {DAILY_SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                voiceService.stop();
                setPrefs((p) => ({ ...p, dailyTopic: s.id }));
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border ${
                prefs.dailyTopic === s.id
                  ? 'bg-[#E8D3A2]/20 text-[#E8D3A2] border-[#E8D3A2]/60 font-bold'
                  : 'bg-[#071522] text-[#B8C4D0] border-[#E8D3A2]/10 hover:border-[#E8D3A2]/30'
              }`}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Conversational Area & Chat Stream */}
      <div className="flex-1 bg-[#102A43]/80 border border-[#E8D3A2]/20 rounded-3xl p-4 md:p-6 flex flex-col justify-between shadow-2xl overflow-hidden relative">
        {/* Central Calm AI Avatar Visualizer */}
        <div className="flex flex-col items-center justify-center py-4 border-b border-[#E8D3A2]/15 mb-4">
          <div className="relative flex items-center justify-center">
            {/* Smooth audio wave breathing visualizer */}
            {isSpeaking && (
              <div className="absolute w-24 h-24 rounded-full bg-[#E8D3A2]/15 animate-ping pointer-events-none" />
            )}
            {isRecording && (
              <div className="absolute w-24 h-24 rounded-full bg-rose-500/15 animate-pulse pointer-events-none" />
            )}
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#E8D3A2] to-[#F5E7C6] p-[2px] shadow-[0_0_25px_rgba(232,211,162,0.3)] transition-all">
              <div className="w-full h-full bg-[#071522] rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-[#E8D3A2]" />
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-[#E8D3A2] mt-2 flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSpeaking
                  ? 'bg-emerald-400 animate-pulse'
                  : isRecording
                  ? 'bg-rose-500 animate-ping'
                  : isAgentThinking
                  ? 'bg-amber-400 animate-bounce'
                  : 'bg-[#E8D3A2]'
              }`}
            />
            {isSpeaking
              ? 'Valor is speaking...'
              : isRecording
              ? 'Valor is listening...'
              : isAgentThinking
              ? 'Thinking...'
              : 'Tap microphone to speak'}
          </span>
        </div>

        {/* Message Thread Stream */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[460px] min-h-[250px]">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const corr = msg.correction;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1.5`}
              >
                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-3xl shadow-lg relative ${
                    isUser
                      ? 'bg-gradient-to-r from-[#E8D3A2] to-[#F5E7C6] text-[#071522] font-semibold rounded-tr-none'
                      : 'bg-[#071522] border border-[#E8D3A2]/20 text-[#F8FAFC] rounded-tl-none'
                  }`}
                >
                  <p className="text-sm md:text-base leading-relaxed">{msg.text}</p>

                  {!isUser && (
                    <div className="mt-2 flex items-center justify-between text-[11px] opacity-75 pt-1 border-t border-[#E8D3A2]/10 gap-2">
                      <div className="flex items-center gap-1.5 font-mono text-[#B8C4D0]">
                        <span>{msg.timestamp}</span>
                        {(msg as any).llmProvider && (
                          <span className="px-1.5 py-0.5 rounded bg-[#102A43] text-[#E8D3A2] border border-[#E8D3A2]/30 text-[10px]">
                            ⚡ {(msg as any).llmProvider}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setIsSpeaking(true);
                          speakResponse(msg.text, {
                            rate: prefs.voiceSpeed,
                            pitch: prefs.voicePitch,
                            volume: prefs.voiceVolume,
                            voiceURI: prefs.selectedVoiceURI,
                          }).then(() => setIsSpeaking(false));
                        }}
                        title="Replay Calm Voice Audio"
                        className="hover:text-[#E8D3A2] transition-colors p-1 cursor-pointer flex items-center gap-1"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-[#E8D3A2]" />
                        <span className="text-[10px]">Replay</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 3-Level Conversational Correction Callout Card */}
                {!isUser && corr && corr.level !== 'none' && (
                  <div className="max-w-[85%] sm:max-w-[75%] bg-[#071522] border border-[#E8D3A2]/30 rounded-2xl p-3 text-xs space-y-2 text-left ml-2 shadow-xl">
                    {/* Level 1 & Level 2: Small / Repeated Mistake subtle note */}
                    {corr.naturalCorrectionNote && (
                      <div className="flex items-start gap-2 text-[#E8D3A2]">
                        <Sparkles className="w-4 h-4 text-[#E8D3A2] shrink-0 mt-0.5" />
                        <p className="font-medium leading-relaxed">
                          💡 <span className="font-bold">{corr.naturalCorrectionNote}</span>
                        </p>
                      </div>
                    )}

                    {/* Level 3: Important Mistake Interactive Practice Prompt */}
                    {corr.level === 'important' && corr.practicePrompt && (
                      <div className="bg-[#102A43] border border-[#E8D3A2]/40 rounded-xl p-3 space-y-2 mt-1">
                        <p className="font-extrabold text-[#F5E7C6] flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#E8D3A2]" /> Try it yourself:
                        </p>
                        <p className="text-[#F8FAFC] font-mono font-bold bg-[#071522] p-2 rounded-lg border border-[#E8D3A2]/20">
                          {corr.practicePrompt}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={practiceAnswerInput}
                            onChange={(e) => setPracticeAnswerInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handlePracticeSubmit(msg.id, corr.practiceAnswer);
                              }
                            }}
                            placeholder="Type missing word..."
                            className="flex-1 bg-[#071522] border border-[#E8D3A2]/30 rounded-lg px-2.5 py-1.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#E8D3A2]"
                          />
                          <button
                            onClick={() => handlePracticeSubmit(msg.id, corr.practiceAnswer)}
                            className="px-3 py-1.5 bg-[#E8D3A2] text-[#071522] font-black rounded-lg text-xs cursor-pointer hover:bg-[#F5E7C6] transition-colors"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking Indicator */}
          {isAgentThinking && (
            <div className="flex items-center gap-2 text-xs text-[#B8C4D0] font-mono italic">
              <Sparkles className="w-4 h-4 text-[#E8D3A2] animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Central Voice & Text Input Toolbar */}
        <div className="pt-4 border-t border-[#E8D3A2]/15 mt-2 flex flex-col gap-3">
          {/* Main Microphone Button Center */}
          <div className="flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecordingAndSend : startRecording}
              disabled={isTranscribing || isAgentThinking}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl relative ${
                isRecording
                  ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white animate-pulse scale-110 shadow-rose-900/80'
                  : isTranscribing
                  ? 'bg-[#E8D3A2] text-[#071522] animate-spin'
                  : 'bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] shadow-[0_0_30px_rgba(232,211,162,0.3)] hover:scale-105'
              }`}
            >
              {isRecording ? (
                <MicOff className="w-9 h-9 text-white animate-pulse" />
              ) : isTranscribing ? (
                <RotateCcw className="w-8 h-8 text-[#071522] animate-spin" />
              ) : (
                <Mic className="w-9 h-9 text-[#071522]" />
              )}
            </button>
          </div>

          <p className="text-center text-[11px] font-mono font-bold text-[#B8C4D0]">
            {isRecording
              ? '🎙️ Valor is listening...'
              : isTranscribing
              ? '⚡ Transcribing...'
              : 'Tap microphone to talk'}
          </p>

          {/* Text Input Fallback Bar */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage(inputText);
                }
              }}
              placeholder="Or type a message to Valor..."
              className="flex-1 bg-[#071522] border border-[#E8D3A2]/20 rounded-2xl px-4 py-3 text-sm text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none focus:border-[#E8D3A2] shadow-inner"
            />
            <button
              onClick={() => handleSendMessage(inputText)}
              disabled={!inputText.trim() || isAgentThinking}
              className="p-3 bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] rounded-2xl font-bold transition-all disabled:opacity-40 cursor-pointer shadow-lg"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Target Language & Voice Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-[#071522]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#102A43] border border-[#E8D3A2]/30 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8D3A2]/15 pb-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('language')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'language'
                      ? 'bg-[#E8D3A2] text-[#071522]'
                      : 'text-[#B8C4D0] hover:text-[#F8FAFC]'
                  }`}
                >
                  🌐 Language Options
                </button>
                <button
                  onClick={() => setActiveTab('voice')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'voice'
                      ? 'bg-[#E8D3A2] text-[#071522]'
                      : 'text-[#B8C4D0] hover:text-[#F8FAFC]'
                  }`}
                >
                  🎙️ Calm Voice Settings
                </button>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-[#B8C4D0] hover:text-[#F8FAFC] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* TAB 1: Language Options */}
            {activeTab === 'language' && (
              <div className="space-y-4">
                {/* Target Language Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8D3A2] uppercase tracking-wider block">
                    Target Language (Language you want to learn & speak)
                  </label>
                  <select
                    value={prefs.targetLanguage}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, targetLanguage: e.target.value as LanguageCode }))
                    }
                    className="w-full bg-[#071522] border border-[#E8D3A2]/30 rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#E8D3A2]"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Native Language Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#F5E7C6] uppercase tracking-wider block">
                    Native Language (Used only for emergency explanations)
                  </label>
                  <select
                    value={prefs.nativeLanguage}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, nativeLanguage: e.target.value as LanguageCode }))
                    }
                    className="w-full bg-[#071522] border border-[#E8D3A2]/30 rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#E8D3A2]"
                  >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name} ({lang.nativeName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Level */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#B8C4D0] uppercase tracking-wider block">
                    Estimated Proficiency Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setPrefs((p) => ({ ...p, userLevel: lvl }))}
                        className={`py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                          prefs.userLevel === lvl
                            ? 'bg-[#E8D3A2] text-[#071522] border-[#E8D3A2]'
                            : 'bg-[#071522] text-[#B8C4D0] border-[#E8D3A2]/20'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Calm Voice Settings */}
            {activeTab === 'voice' && (
              <div className="space-y-4">
                {/* Voice Selection Dropdown */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-[#E8D3A2] uppercase tracking-wider block">
                    Male / Natural Voice Selection
                  </label>
                  <select
                    value={prefs.selectedVoiceURI}
                    onChange={(e) => setPrefs((p) => ({ ...p, selectedVoiceURI: e.target.value }))}
                    className="w-full bg-[#071522] border border-[#E8D3A2]/30 rounded-xl px-3 py-2.5 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#E8D3A2]"
                  >
                    <option value="">Default (Calm Mature Male Gentleman Voice)</option>
                    {availableVoices.map((v) => (
                      <option key={v.uri} value={v.uri}>
                        {v.name} ({v.lang}) {v.isMale ? '👨' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#B8C4D0]">
                    Prioritizes natural adult male voice delivery.
                  </p>
                </div>

                {/* Speaking Speed Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#F8FAFC]">
                    <span className="font-bold">Speaking Speed</span>
                    <span className="font-mono text-[#E8D3A2]">{prefs.voiceSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="1.15"
                    step="0.05"
                    value={prefs.voiceSpeed}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, voiceSpeed: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#E8D3A2] cursor-pointer"
                  />
                  <p className="text-[10px] text-[#B8C4D0]">
                    Slightly slower rate recommended for clear language learning comprehension.
                  </p>
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#F8FAFC]">
                    <span className="font-bold">Voice Pitch</span>
                    <span className="font-mono text-[#E8D3A2]">{prefs.voicePitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.80"
                    max="1.10"
                    step="0.05"
                    value={prefs.voicePitch}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, voicePitch: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#E8D3A2] cursor-pointer"
                  />
                </div>

                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-[#F8FAFC]">
                    <span className="font-bold">Voice Volume</span>
                    <span className="font-mono text-[#E8D3A2]">
                      {Math.round(prefs.voiceVolume * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={prefs.voiceVolume}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, voiceVolume: parseFloat(e.target.value) }))
                    }
                    className="w-full accent-[#E8D3A2] cursor-pointer"
                  />
                </div>
              </div>
            )}

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-3 bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black rounded-xl text-sm transition-colors cursor-pointer"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

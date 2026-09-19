import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  Zap,
  MessageSquare,
  Bot,
  User,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import {
  AudioRecorder,
  transcribeAudio,
  evaluateGrammar,
  speakResponse,
  GrammarCorrectionResponse,
  generateFallbackGrammarCorrection,
} from '../services/voiceService';

interface TurnRecord {
  id: string;
  timestamp: string;
  transcript: string;
  feedback: GrammarCorrectionResponse;
  sttProvider: string;
  llmProvider: string;
}

export const VoiceTutorPage: React.FC = () => {
  // Voice Loop Pipeline State
  const [stage, setStage] = useState<
    'idle' | 'recording' | 'transcribing' | 'evaluating' | 'speaking' | 'completed' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start conversation loop.');
  const [autoLoop, setAutoLoop] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');

  // Current active turn data
  const [currentTranscript, setCurrentTranscript] = useState<string>('');
  const [currentFeedback, setCurrentFeedback] = useState<GrammarCorrectionResponse | null>(null);
  const [turns, setTurns] = useState<TurnRecord[]>([]);

  // Recording Ref
  const recorderRef = useRef<AudioRecorder | null>(null);
  const autoLoopRef = useRef<boolean>(false);
  autoLoopRef.current = autoLoop;

  // Preset sample sentences for instant test suite
  const sampleSentences = [
    { text: 'He go to school yesterday.', label: 'Grammar: Verb tense & agreement' },
    { text: 'She don\'t like playing soccer.', label: 'Grammar: Negative subject-verb' },
    { text: 'Me want learn English fastly for buy apple.', label: 'Vocab & Structure: Multiple errors' },
    { text: 'I went to the store and bought fresh apples.', label: 'Correct: Clean sentence' },
  ];

  // Start Microphone Recording
  const handleStartRecording = async () => {
    try {
      setStage('recording');
      setStatusMessage('🎙️ Listening... Speak your sentence clearly now.');
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.start();
    } catch (err: any) {
      console.error('Recording start error:', err);
      setStage('error');
      setStatusMessage(`Microphone Error: ${err.message || 'Could not access microphone.'}`);
    }
  };

  // Stop Recording and trigger the rest of the loop: STT -> LLM -> TTS
  const handleStopRecordingAndProcess = async () => {
    if (!recorderRef.current || stage !== 'recording') return;

    try {
      setStage('transcribing');
      setStatusMessage('⚡ STT: Transcribing speech to text (Whisper / Deepgram)...');

      const audioBlob = await recorderRef.current.stop();
      recorderRef.current = null;

      // 1. STT Phase: Convert Audio to Text
      let transcriptText = '';
      let sttProviderName = 'Whisper API';

      try {
        // Convert Blob to Base64 for server endpoint
        const base64Audio = await blobToBase64(audioBlob);
        const res = await fetch('/api/voice/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64Audio.split(',')[1] || base64Audio,
            mimeType: audioBlob.type,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          transcriptText = data.text;
          sttProviderName = data.provider || 'Whisper API';
        }
      } catch (err) {
        console.warn('Server STT failed, using Web Speech API fallback:', err);
      }

      // Fallback STT if backend key isn't provided
      if (!transcriptText.trim()) {
        transcriptText = await recordWithWebSpeechAPI();
        sttProviderName = 'Browser Web Speech API';
      }

      if (!transcriptText.trim()) {
        throw new Error('No speech was detected. Please try speaking again.');
      }

      await runLLMAndTTSLoop(transcriptText, sttProviderName);
    } catch (err: any) {
      console.error('Pipeline error:', err);
      setStage('error');
      setStatusMessage(`Pipeline Error: ${err.message || 'Speech processing failed.'}`);
    }
  };

  // Helper to run LLM evaluation & TTS synthesis from a transcript string
  const runLLMAndTTSLoop = async (transcriptText: string, sttProvider: string = 'Text Input') => {
    setCurrentTranscript(transcriptText);

    // 2. LLM Correction Phase
    setStage('evaluating');
    setStatusMessage('🧠 LLM: Evaluating grammar/vocab errors and generating tutor feedback...');

    const feedback = await evaluateGrammar(transcriptText);
    setCurrentFeedback(feedback);

    // Add record to history thread
    const newTurn: TurnRecord = {
      id: `turn-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      transcript: transcriptText,
      feedback,
      sttProvider,
      llmProvider: feedback.llmProvider || 'Gemini 2.5 Flash',
    };
    setTurns((prev) => [newTurn, ...prev]);

    // 3. TTS Phase: Speak Agent Response back to Student
    setStage('speaking');
    setStatusMessage('🔊 TTS: Speaking tutor evaluation and corrected sentence back to you...');

    await speakResponse(feedback.spokenResponse);

    // 4. Completed Stage
    setStage('completed');
    setStatusMessage('✅ Loop complete! Try speaking the corrected sentence now.');

    // Auto-loop if hands-free mode is enabled
    if (autoLoopRef.current) {
      setTimeout(() => {
        handleStartRecording();
      }, 1500);
    }
  };

  // Web Speech API fallback helper
  const recordWithWebSpeechAPI = (): Promise<string> => {
    return new Promise((resolve) => {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve('He go to school yesterday.'); // Fallback sample if Web Speech not supported
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        resolve(text);
      };

      recognition.onerror = () => resolve('');
      recognition.onend = () => {};

      try {
        recognition.start();
      } catch {
        resolve('');
      }
    });
  };

  // Convert Blob to Base64 string
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Title & Milestone Header */}
      <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E8D3A2]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#E8D3A2]/15 text-[#E8D3A2] border border-[#E8D3A2]/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#E8D3A2] animate-pulse" /> Core Voice Loop Architecture
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#F5E7C6]/15 text-[#F5E7C6] border border-[#F5E7C6]/30">
                Milestone 1.0
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#F8FAFC] tracking-tight">
              Voice Conversational Loop Testbed
            </h1>
            <p className="text-sm text-[#B8C4D0] mt-1">
              End-to-End Voice Cycle: Speak $\rightarrow$ Transcribe (STT) $\rightarrow$ Correct (LLM) $\rightarrow$ Speak Response (TTS) $\rightarrow$ Retry
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoLoop(!autoLoop)}
              className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center gap-2 border shadow-lg cursor-pointer ${
                autoLoop
                  ? 'bg-[#E8D3A2] text-[#071522] border-[#E8D3A2] font-bold shadow-[0_0_15px_rgba(232,211,162,0.3)]'
                  : 'bg-[#071522] hover:bg-[#102A43] text-[#B8C4D0] border-[#E8D3A2]/20'
              }`}
            >
              <RotateCcw className={`w-4 h-4 ${autoLoop ? 'animate-spin text-[#071522]' : 'text-[#E8D3A2]'}`} />
              Hands-Free Auto Loop: {autoLoop ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>

      {/* Pipeline Visual Progress Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { id: 'recording', label: '1. Speak', icon: Mic, desc: 'Microphone Stream' },
          { id: 'transcribing', label: '2. STT', icon: RefreshCw, desc: 'Whisper / Deepgram' },
          { id: 'evaluating', label: '3. Correct LLM', icon: Sparkles, desc: 'Grammar Tutor' },
          { id: 'speaking', label: '4. Speak TTS', icon: Volume2, desc: 'ElevenLabs / Azure' },
          { id: 'completed', label: '5. Student Retry', icon: CheckCircle2, desc: 'Back-and-Forth' },
        ].map((step, idx) => {
          const Icon = step.icon;
          const isActive = stage === step.id;
          const isDone =
            (stage === 'transcribing' && idx === 0) ||
            (stage === 'evaluating' && idx <= 1) ||
            (stage === 'speaking' && idx <= 2) ||
            (stage === 'completed' && idx <= 4);

          return (
            <div
              key={step.id}
              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                isActive
                  ? 'bg-[#E8D3A2]/15 border-[#E8D3A2]/60 shadow-lg scale-[1.02]'
                  : isDone
                  ? 'bg-[#102A43] border-[#E8D3A2]/30 text-[#E8D3A2]'
                  : 'bg-[#071522]/80 border-[#E8D3A2]/10 text-[#B8C4D0]/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{step.label}</span>
                <Icon
                  className={`w-4 h-4 ${
                    isActive
                      ? 'text-[#E8D3A2] animate-bounce'
                      : isDone
                      ? 'text-[#E8D3A2]'
                      : 'text-[#B8C4D0]/40'
                  }`}
                />
              </div>
              <p className="text-xs font-medium text-[#B8C4D0] mt-2">{step.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Main Interactive Controls & Live Stage Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Voice Controller & Sample Test Suite */}
        <div className="lg:col-span-5 space-y-6">
          {/* Central Push-to-Talk Mic Console */}
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 text-center space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono text-[#B8C4D0]">
              <span className="flex items-center gap-1.5 font-bold">
                <span
                  className={`w-2 h-2 rounded-full ${
                    stage === 'recording'
                      ? 'bg-rose-500 animate-ping'
                      : stage === 'speaking'
                      ? 'bg-[#E8D3A2] animate-pulse'
                      : 'bg-[#E8D3A2]'
                  }`}
                />
                Status: {stage.toUpperCase()}
              </span>
              <span className="text-[11px] text-[#B8C4D0]">HTML5 AudioRecorder</span>
            </div>

            {/* Mic Big Button */}
            <div className="flex flex-col items-center justify-center py-4">
              <button
                onClick={stage === 'recording' ? handleStopRecordingAndProcess : handleStartRecording}
                disabled={stage === 'transcribing' || stage === 'evaluating' || stage === 'speaking'}
                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl relative ${
                  stage === 'recording'
                    ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white animate-pulse scale-110 shadow-rose-900/80'
                    : stage === 'speaking'
                    ? 'bg-[#E8D3A2] text-[#071522] animate-bounce shadow-[0_0_30px_rgba(232,211,162,0.4)]'
                    : 'bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] shadow-[0_0_30px_rgba(232,211,162,0.3)] hover:scale-105'
                }`}
              >
                {stage === 'recording' ? (
                  <MicOff className="w-12 h-12 text-white animate-spin" />
                ) : stage === 'speaking' ? (
                  <Volume2 className="w-12 h-12 text-[#071522] animate-pulse" />
                ) : (
                  <Mic className="w-12 h-12 text-[#071522]" />
                )}
              </button>
              <p className="text-xs font-bold text-[#F8FAFC] mt-4">
                {stage === 'recording'
                  ? 'Click to Stop Recording & Process'
                  : 'Click to Speak (Push-to-Talk)'}
              </p>
            </div>

            {/* Dynamic Status Bar */}
            <div className="p-3 bg-[#071522] border border-[#E8D3A2]/20 rounded-2xl text-xs text-[#F5E7C6] font-mono leading-relaxed text-left flex items-start gap-2">
              <Zap className="w-4 h-4 text-[#E8D3A2] shrink-0 mt-0.5" />
              <span>{statusMessage}</span>
            </div>

            {/* Manual Text Simulation Input (for quick testing) */}
            <div className="pt-2 border-t border-[#E8D3A2]/15 text-left">
              <label className="text-[11px] font-bold text-[#B8C4D0] uppercase tracking-wider block mb-2">
                Simulate Spoken Input (Text Fallback)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inputText.trim()) {
                      runLLMAndTTSLoop(inputText, 'Manual Text Input');
                      setInputText('');
                    }
                  }}
                  placeholder="e.g. He go to school yesterday..."
                  className="flex-1 bg-[#071522] border border-[#E8D3A2]/20 rounded-xl px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none focus:border-[#E8D3A2]"
                />
                <button
                  onClick={() => {
                    if (inputText.trim()) {
                      runLLMAndTTSLoop(inputText, 'Manual Text Input');
                      setInputText('');
                    }
                  }}
                  disabled={!inputText.trim() || stage === 'transcribing' || stage === 'evaluating'}
                  className="px-3.5 py-2 bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-bold rounded-xl text-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Quick Preset Test Suite */}
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B8C4D0] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E8D3A2]" /> Instant Test Sentences
            </h3>
            <div className="space-y-2">
              {sampleSentences.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => runLLMAndTTSLoop(sample.text, 'Preset Test Suite')}
                  disabled={stage !== 'idle' && stage !== 'completed'}
                  className="w-full text-left p-3 rounded-2xl bg-[#071522] hover:bg-[#071522]/80 border border-[#E8D3A2]/15 transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#E8D3A2] transition-colors">
                      "{sample.text}"
                    </p>
                    <span className="text-[10px] text-[#B8C4D0]">{sample.label}</span>
                  </div>
                  <Play className="w-3.5 h-3.5 text-[#B8C4D0] group-hover:text-[#E8D3A2] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Conversation Loop History & Feedback Card */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Turn Feedback Display */}
          {currentFeedback && (
            <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E8D3A2]/15 pb-3">
                <span className="text-xs font-mono font-bold uppercase text-[#B8C4D0] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#E8D3A2]" /> Latest Agent Evaluation
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                    currentFeedback.hasErrors
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {currentFeedback.hasErrors ? (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" /> Error Detected & Corrected
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accurate Sentence!
                    </>
                  )}
                </span>
              </div>

              {/* Student Transcript */}
              <div className="p-4 rounded-2xl bg-[#071522] border border-[#E8D3A2]/15 space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-[#B8C4D0] flex items-center gap-1">
                  <User className="w-3 h-3 text-[#E8D3A2]" /> Transcribed Student Speech
                </span>
                <p className="text-sm font-semibold text-[#F8FAFC]">"{currentTranscript}"</p>
              </div>

              {/* System Prompt 4-Point Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* (a & b) Simple Explanation */}
                <div className="p-4 rounded-2xl bg-[#071522] border border-[#E8D3A2]/15 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#E8D3A2]">
                    (a & b) Simple Explanation
                  </span>
                  <p className="text-xs text-[#B8C4D0] leading-relaxed font-normal">
                    {currentFeedback.explanation}
                  </p>
                </div>

                {/* (c) Corrected Sentence */}
                <div className="p-4 rounded-2xl bg-[#071522] border border-[#E8D3A2]/15 space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#F5E7C6]">
                    (c) Corrected Sentence
                  </span>
                  <p className="text-xs font-extrabold text-[#E8D3A2] leading-relaxed">
                    "{currentFeedback.correctedSentence}"
                  </p>
                </div>
              </div>

              {/* (d) Student Retry Prompt */}
              <div className="p-4 rounded-2xl bg-[#071522] border border-[#E8D3A2]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase font-bold text-[#E8D3A2] flex items-center gap-1">
                    (d) Student Retry Prompt
                  </span>
                  <button
                    onClick={() => speakResponse(currentFeedback.spokenResponse)}
                    className="px-2.5 py-1 rounded-lg bg-[#E8D3A2]/20 hover:bg-[#E8D3A2]/30 text-[#E8D3A2] text-[11px] font-bold transition-all flex items-center gap-1 border border-[#E8D3A2]/30 cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Replay Agent Speech (TTS)
                  </button>
                </div>
                <p className="text-xs font-semibold text-[#F5E7C6]">
                  {currentFeedback.retryPrompt}
                </p>
              </div>
            </div>
          )}

          {/* Conversation History Thread */}
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 space-y-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#B8C4D0] flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#E8D3A2]" /> Back-and-Forth Conversation Log ({turns.length})
            </h3>

            {turns.length === 0 ? (
              <div className="text-center py-12 text-[#B8C4D0]/60 border border-dashed border-[#E8D3A2]/20 rounded-2xl">
                <Mic className="w-8 h-8 mx-auto mb-2 text-[#E8D3A2]/40" />
                <p className="text-xs font-medium text-[#B8C4D0]">No conversation turns recorded yet.</p>
                <p className="text-[11px] text-[#B8C4D0]/60 mt-1">
                  Click the microphone button or pick a sample sentence on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-1">
                {turns.map((turn) => (
                  <div
                    key={turn.id}
                    className="p-4 rounded-2xl bg-[#071522] border border-[#E8D3A2]/15 space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#B8C4D0] border-b border-[#E8D3A2]/15 pb-2">
                      <span className="font-mono font-bold text-[#E8D3A2]">{turn.timestamp}</span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#102A43] text-[#B8C4D0] border border-[#E8D3A2]/20">
                          STT: {turn.sttProvider}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#102A43] text-[#E8D3A2] border border-[#E8D3A2]/20">
                          LLM: {turn.llmProvider}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-[#102A43] border border-[#E8D3A2]/20 text-[#E8D3A2] font-bold shrink-0 text-xs">
                        Student
                      </div>
                      <p className="text-xs font-semibold text-[#F8FAFC] pt-1">"{turn.transcript}"</p>
                    </div>

                    <div className="flex items-start gap-3 pl-4 border-l-2 border-[#E8D3A2]/40">
                      <div className="p-2 rounded-xl bg-[#102A43] text-[#F5E7C6] font-bold shrink-0 text-xs border border-[#E8D3A2]/30">
                        Tutor AI
                      </div>
                      <div className="text-xs space-y-1 pt-0.5">
                        <p className="text-[#B8C4D0]">{turn.feedback.explanation}</p>
                        <p className="text-[#E8D3A2] font-bold">
                          Correction: "{turn.feedback.correctedSentence}"
                        </p>
                        <p className="text-[#F5E7C6] font-medium italic">
                          "{turn.feedback.retryPrompt}"
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

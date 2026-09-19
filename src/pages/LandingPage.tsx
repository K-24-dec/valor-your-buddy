import React, { useState } from 'react';
import { Sparkles, Mic, MessageSquare, Volume2, Globe, CheckCircle2, ArrowRight } from 'lucide-react';
import { SUPPORTED_LANGUAGES, LanguageCode } from '../services/aiAgentService';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('English');
  const [showLangPicker, setShowLangPicker] = useState<boolean>(false);

  const handleStartTalking = () => {
    // Save chosen language preference
    const saved = localStorage.getItem('valor_preferences');
    const existing = saved ? JSON.parse(saved) : {};
    localStorage.setItem(
      'valor_preferences',
      JSON.stringify({ ...existing, targetLanguage: selectedLanguage })
    );

    onNavigate('/chat');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-between p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#E8D3A2]/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Hero Header */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-8 md:pt-16 relative z-10">
        {/* Glowing Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2] text-xs font-mono font-bold">
          <Sparkles className="w-3.5 h-3.5 text-[#E8D3A2] animate-pulse" />
          <span>YOUR AI LANGUAGE PARTNER</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-[#F8FAFC] tracking-tight leading-[1.1]">
          Learn a language by <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E8D3A2] via-white to-[#F5E7C6]">talking.</span>
        </h1>

        {/* Supporting Message */}
        <p className="text-base sm:text-lg md:text-xl text-[#B8C4D0] max-w-2xl mx-auto leading-relaxed font-normal">
          Talk naturally with your AI language partner. Make mistakes, get better, and become confident one conversation at a time.
        </p>

        {/* Primary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleStartTalking}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black text-base md:text-lg transition-all transform hover:scale-105 shadow-[0_0_35px_rgba(232,211,162,0.4)] flex items-center justify-center gap-3 cursor-pointer"
          >
            <Mic className="w-6 h-6 text-[#071522]" />
            <span>Start Talking</span>
            <ArrowRight className="w-5 h-5 text-[#071522]" />
          </button>

          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-[#102A43] hover:bg-[#102A43]/80 border border-[#E8D3A2]/30 text-[#F8FAFC] font-bold text-sm md:text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer"
          >
            <Globe className="w-5 h-5 text-[#E8D3A2]" />
            <span>Target Language: {selectedLanguage}</span>
          </button>
        </div>

        {/* Language Picker Dropdown */}
        {showLangPicker && (
          <div className="bg-[#102A43] border border-[#E8D3A2]/30 rounded-3xl p-4 max-w-md mx-auto grid grid-cols-2 gap-2 mt-3 shadow-2xl animate-in fade-in slide-in-from-top-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  setSelectedLanguage(lang.code);
                  setShowLangPicker(false);
                }}
                className={`p-2.5 rounded-xl text-xs font-bold text-left flex items-center gap-2 border transition-all cursor-pointer ${
                  selectedLanguage === lang.code
                    ? 'bg-[#E8D3A2] text-[#071522] border-[#E8D3A2]'
                    : 'bg-[#071522] text-[#F8FAFC] border-[#E8D3A2]/15 hover:border-[#E8D3A2]/40'
                }`}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Live Visual Demonstration Preview Card */}
      <div className="max-w-xl w-full mx-auto my-12 bg-[#102A43]/90 border border-[#E8D3A2]/25 rounded-3xl p-6 shadow-2xl space-y-4 relative z-10">
        <div className="flex items-center justify-between text-xs font-mono text-[#B8C4D0] border-b border-[#E8D3A2]/15 pb-3">
          <span className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Conversation Preview
          </span>
          <span className="text-[#E8D3A2]">Natural AI Feedback</span>
        </div>

        {/* Message Turn 1 */}
        <div className="flex flex-col items-start space-y-1">
          <div className="p-3.5 rounded-2xl bg-[#071522] border border-[#E8D3A2]/20 text-xs text-[#F8FAFC]">
            <strong>Valor AI:</strong> "Hi! What did you do today?"
          </div>
        </div>

        {/* Message Turn 2 */}
        <div className="flex flex-col items-end space-y-1">
          <div className="p-3.5 rounded-2xl bg-[#E8D3A2] text-[#071522] font-semibold text-xs">
            <strong>You:</strong> "I go to college yesterday."
          </div>
        </div>

        {/* Message Turn 3 with Natural Correction */}
        <div className="flex flex-col items-start space-y-2">
          <div className="p-3.5 rounded-2xl bg-[#071522] border border-[#E8D3A2]/20 text-xs text-[#F8FAFC] space-y-2">
            <p>
              <strong>Valor AI:</strong> "Nice! What did you do at college yesterday?"
            </p>
            <div className="p-2.5 bg-[#102A43] border border-[#E8D3A2]/30 rounded-xl text-[11px] text-[#E8D3A2] font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E8D3A2] shrink-0" />
              <span>💡 By the way, a more natural way to say that is: <strong>“I went to college yesterday.”</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Core Highlights */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 text-left w-full mb-8 relative z-10">
        {[
          {
            icon: Mic,
            title: 'Talk Naturally',
            desc: 'No rigid lessons or repetitive quizzes. Just talk like you are chatting with a patient friend.',
          },
          {
            icon: Sparkles,
            title: 'Subtle Corrections',
            desc: 'The AI helps you fix grammar and vocabulary mistakes naturally without interrupting your flow.',
          },
          {
            icon: CheckCircle2,
            title: 'Build Real Confidence',
            desc: 'Transition from knowing grammar rules to actually speaking fluently in real situations.',
          },
        ].map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#102A43]/50 border border-[#E8D3A2]/15 hover:border-[#E8D3A2]/40 transition-all space-y-2"
            >
              <div className="w-10 h-10 rounded-xl bg-[#E8D3A2]/15 flex items-center justify-center text-[#E8D3A2]">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">{item.title}</h3>
              <p className="text-xs text-[#B8C4D0] leading-relaxed">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

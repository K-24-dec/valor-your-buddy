import React from 'react';
import { useGame } from '../context/GameContext';
import { CharacterCard } from '../components/CharacterCard';
import { Award, BookOpen, Brain, CheckCircle2, Dumbbell, Flame, Shield, Sparkles, User, Zap } from 'lucide-react';

export const CharacterPage: React.FC = () => {
  const { character, completions } = useGame();

  const totalXPEarned = completions.reduce((acc, curr) => acc + curr.xp_awarded, 0) + character.xp;
  const totalGoldEarned = completions.reduce((acc, curr) => acc + curr.gold_awarded, 0) + character.gold;

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <User className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">CHARACTER PROFILE</h1>
              <p className="text-xs text-[#B8C4D0]">
                Detailed RPG attribute breakdown, lifetime statistics, and hero legend.
              </p>
            </div>
          </div>
        </div>

        {/* Character Card */}
        <CharacterCard />

        {/* Lifetime Hero Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-[#E8D3A2]" />
              <span className="text-xs text-[#B8C4D0] font-bold">TOTAL QUEST VICTORIES</span>
            </div>
            <div className="text-2xl font-black text-[#F8FAFC]">{completions.length} COMPLETED</div>
          </div>

          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-[#E8D3A2]" />
              <span className="text-xs text-[#B8C4D0] font-bold">LIFETIME XP GAINED</span>
            </div>
            <div className="text-2xl font-black text-[#E8D3A2]">{totalXPEarned.toLocaleString()} XP</div>
          </div>

          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xl">🪙</span>
              <span className="text-xs text-[#E8D3A2] font-bold">LIFETIME GOLD EARNED</span>
            </div>
            <div className="text-2xl font-black text-[#F5E7C6]">{totalGoldEarned.toLocaleString()} GOLD</div>
          </div>

          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-5 h-5 text-[#E8D3A2] fill-[#E8D3A2]" />
              <span className="text-xs text-[#E8D3A2] font-bold">LONGEST RECORD STREAK</span>
            </div>
            <div className="text-2xl font-black text-[#F5E7C6]">{character.longest_streak} DAYS</div>
          </div>
        </div>
      </div>
    </div>
  );
};

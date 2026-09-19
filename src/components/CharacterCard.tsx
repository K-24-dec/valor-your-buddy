import React from 'react';
import { useGame } from '../context/GameContext';
import { StatProgressBar } from './StatProgressBar';
import { Award, BookOpen, Brain, Cpu, Dumbbell, Flame, Shield, Sparkles, Swords, User, Zap } from 'lucide-react';

export const CharacterCard: React.FC = () => {
  const { character } = useGame();

  const xpPercentage = Math.min(100, Math.round((character.xp / character.xp_to_next_level) * 100));

  // Determine avatar icon based on equipped avatar
  const getAvatarIcon = () => {
    switch (character.equipped_avatar) {
      case 'avatar_shadow_ninja':
        return <User className="w-10 h-10 text-[#E8D3A2]" />;
      case 'avatar_arcane_mage':
        return <Sparkles className="w-10 h-10 text-[#F5E7C6]" />;
      case 'avatar_mech_warrior':
        return <Cpu className="w-10 h-10 text-[#E8D3A2]" />;
      case 'avatar_void_lord':
        return <Award className="w-10 h-10 text-[#E8D3A2] animate-pulse" />;
      case 'avatar_cyber_hero':
      default:
        return <Shield className="w-10 h-10 text-[#E8D3A2]" />;
    }
  };

  // Determine frame border styling
  const getFrameStyle = () => {
    switch (character.equipped_frame) {
      case 'frame_solar_gold':
        return 'border-[#E8D3A2] shadow-[0_0_25px_rgba(232,211,162,0.5)]';
      case 'frame_cyber_pink':
        return 'border-[#F5E7C6] shadow-[0_0_25px_rgba(245,231,198,0.5)]';
      case 'frame_void_flame':
        return 'border-[#E8D3A2] shadow-[0_0_30px_rgba(232,211,162,0.6)]';
      case 'frame_neon_cyan':
      default:
        return 'border-[#E8D3A2]/60 shadow-[0_0_20px_rgba(232,211,162,0.3)]';
    }
  };

  return (
    <div className="relative bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background Ambient Radial */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#E8D3A2]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header section: Avatar + Title + Level */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b border-[#E8D3A2]/15">
        {/* Avatar Ring */}
        <div className={`relative w-24 h-24 rounded-2xl bg-[#071522] border-2 ${getFrameStyle()} flex items-center justify-center p-3 transition-all duration-300`}>
          {getAvatarIcon()}
          <div className="absolute -bottom-2 -right-2 bg-[#E8D3A2] text-[#071522] font-black text-xs px-2.5 py-0.5 rounded-lg shadow border border-[#F5E7C6]">
            LVL {character.level}
          </div>
        </div>

        {/* Character Bio Info */}
        <div className="flex-1 text-center sm:text-left">
          <div className="inline-block px-3 py-1 rounded-full bg-[#E8D3A2]/15 border border-[#E8D3A2]/30 text-[#E8D3A2] text-xs font-bold mb-1">
            ✨ {character.equipped_title || 'Novice Adventurer'}
          </div>
          <h2 className="text-2xl font-black text-[#F8FAFC] tracking-wide">{character.name}</h2>

          {/* XP Progress Bar */}
          <div className="mt-3 w-full">
            <div className="flex justify-between text-xs text-[#B8C4D0] mb-1">
              <span>PROGRESS TO LEVEL {character.level + 1}</span>
              <span className="text-[#E8D3A2] font-bold">
                {character.xp} / {character.xp_to_next_level} XP ({xpPercentage}%)
              </span>
            </div>
            <div className="w-full h-3 bg-[#071522] rounded-full overflow-hidden p-[1px] border border-[#E8D3A2]/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8D3A2] to-[#F5E7C6] shadow-[0_0_15px_rgba(232,211,162,0.5)] transition-all duration-700"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards (Gold + Streak) */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-[#071522] border border-[#E8D3A2]/30 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="text-2xl">🪙</div>
          <div>
            <div className="text-[10px] text-[#E8D3A2] font-bold uppercase">GUILD TREASURY</div>
            <div className="text-lg font-extrabold text-[#F5E7C6]">{character.gold.toLocaleString()} GOLD</div>
          </div>
        </div>

        <div className="bg-[#071522] border border-[#E8D3A2]/30 rounded-2xl p-3.5 flex items-center gap-3">
          <Flame className="w-6 h-6 text-[#E8D3A2] fill-[#E8D3A2] animate-bounce" />
          <div>
            <div className="text-[10px] text-[#E8D3A2] font-bold uppercase">CURRENT STREAK</div>
            <div className="text-lg font-extrabold text-[#F5E7C6]">{character.current_streak} DAYS</div>
          </div>
        </div>
      </div>

      {/* Attributes Section */}
      <div>
        <h3 className="text-xs font-bold text-[#B8C4D0] uppercase tracking-widest mb-3 flex items-center justify-between">
          <span>CHARACTER ATTRIBUTES</span>
          <span className="text-[#E8D3A2] text-[10px]">SERVERSIDE AUTHORITATIVE</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatProgressBar
            label="INTELLIGENCE"
            value={character.intelligence}
            max={150}
            color="amber"
            icon={<Brain className="w-4 h-4 text-[#E8D3A2]" />}
            description="Boosted by Coding & Study Quests"
          />
          <StatProgressBar
            label="STRENGTH"
            value={character.strength}
            max={150}
            color="amber"
            icon={<Dumbbell className="w-4 h-4 text-[#E8D3A2]" />}
            description="Boosted by Fitness & Workout Quests"
          />
          <StatProgressBar
            label="WISDOM"
            value={character.wisdom}
            max={150}
            color="amber"
            icon={<BookOpen className="w-4 h-4 text-[#E8D3A2]" />}
            description="Boosted by Reading & Creative Quests"
          />
          <StatProgressBar
            label="AGILITY"
            value={character.agility}
            max={150}
            color="amber"
            icon={<Zap className="w-4 h-4 text-[#E8D3A2]" />}
            description="Boosted by Running & Health Quests"
          />
          <StatProgressBar
            label="DISCIPLINE"
            value={character.discipline}
            max={150}
            color="amber"
            icon={<Shield className="w-4 h-4 text-[#E8D3A2]" />}
            description="Boosted by Meditation & Personal Quests"
          />
        </div>
      </div>
    </div>
  );
};

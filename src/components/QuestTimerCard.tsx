import React, { useEffect, useState } from 'react';
import { useGame } from '../context/GameContext';
import { Quest, QuestState } from '../types/game';
import { getQuestState } from '../lib/gameEngine';
import {
  BookOpen,
  Brain,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit3,
  Lock,
  Play,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Zap,
} from 'lucide-react';

interface QuestTimerCardProps {
  quest: Quest;
  onCompleteClick: (quest: Quest) => void;
  onEditClick: (quest: Quest) => void;
  onDeleteClick: (questId: string) => void;
}

export const QuestTimerCard: React.FC<QuestTimerCardProps> = ({
  quest,
  onCompleteClick,
  onEditClick,
  onDeleteClick,
}) => {
  const { startQuestTimer } = useGame();
  const [questState, setQuestState] = useState<QuestState>(() => getQuestState(quest));
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const durationSec = quest.min_duration_seconds || (quest.duration_minutes ? quest.duration_minutes * 60 : 1800);

  useEffect(() => {
    const updateState = () => {
      const currentState = getQuestState(quest);
      setQuestState(currentState);

      if (quest.started_at && !quest.completed) {
        const elapsed = Math.max(0, Date.now() - new Date(quest.started_at).getTime());
        setElapsedMs(elapsed);
      }
    };

    updateState();
    const interval = setInterval(updateState, 1000);
    return () => clearInterval(interval);
  }, [quest]);

  const elapsedSecondsTotal = Math.floor(elapsedMs / 1000);
  const remainingSecondsTotal = Math.max(0, durationSec - elapsedSecondsTotal);
  const progressPercentage = Math.min(100, Math.round((elapsedSecondsTotal / durationSec) * 100));

  const formatMinSec = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyHeader = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'epic':
        return { label: '⚔ EPIC QUEST', style: 'text-[#E8D3A2] border-[#E8D3A2]/50 bg-[#E8D3A2]/10' };
      case 'hard':
        return { label: '⚔ HARD QUEST', style: 'text-[#E8D3A2] border-[#E8D3A2]/40 bg-[#E8D3A2]/10' };
      case 'medium':
        return { label: '⚔ MEDIUM QUEST', style: 'text-[#F5E7C6] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
      case 'easy':
      default:
        return { label: '⚔ EASY QUEST', style: 'text-[#B8C4D0] border-[#E8D3A2]/20 bg-[#102A43]' };
    }
  };

  const getAttributeBadge = (category: string) => {
    switch (category) {
      case 'Coding':
      case 'Study':
        return { label: '🧠 INTELLECT', icon: Brain, color: 'text-[#E8D3A2] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
      case 'Fitness':
        return { label: '🏋️ STRENGTH', icon: Dumbbell, color: 'text-[#E8D3A2] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
      case 'Reading':
      case 'Creativity':
        return { label: '📖 WISDOM', icon: BookOpen, color: 'text-[#F5E7C6] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
      case 'Health':
        return { label: '⚡ AGILITY', icon: Zap, color: 'text-[#E8D3A2] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
      default:
        return { label: '🎯 DISCIPLINE', icon: Shield, color: 'text-[#E8D3A2] border-[#E8D3A2]/30 bg-[#E8D3A2]/10' };
    }
  };

  const diffInfo = getDifficultyHeader(quest.difficulty);
  const attrInfo = getAttributeBadge(quest.category);

  return (
    <div className="group bg-[#102A43] border border-[#E8D3A2]/20 hover:border-[#E8D3A2]/50 rounded-2xl p-5 shadow-xl transition-all duration-300 font-['Plus_Jakarta_Sans',sans-serif] flex flex-col justify-between relative overflow-hidden">
      {/* Glow Hover Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#E8D3A2] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div>
        {/* RPG Quest Header & Difficulty Callout */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-md border ${diffInfo.style}`}>
              {diffInfo.label}
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${attrInfo.color}`}>
              {attrInfo.label}
            </span>
          </div>

          <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
            {!quest.completed && (
              <button
                onClick={() => onEditClick(quest)}
                className="p-1.5 rounded-lg text-[#B8C4D0] hover:text-[#F8FAFC] hover:bg-[#071522] cursor-pointer"
                title="Reforge Quest"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDeleteClick(quest.id)}
              className="p-1.5 rounded-lg text-[#B8C4D0] hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              title="Delete Quest"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quest Title & Description */}
        <h4 className="text-base font-extrabold text-[#F8FAFC] group-hover:text-[#E8D3A2] transition mb-1">
          {quest.title}
        </h4>

        {quest.description && (
          <p className="text-xs text-[#B8C4D0] mb-4 leading-relaxed">
            {quest.description}
          </p>
        )}

        {/* Real-Time Active Quest HUD Timer */}
        {questState === 'ACTIVE' && (
          <div className="my-3 bg-[#071522] border border-[#E8D3A2]/30 rounded-xl p-3.5 space-y-2 shadow-inner">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#E8D3A2] font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#E8D3A2] animate-spin" />
                QUEST IN PROGRESS
              </span>
              <span className="text-[#F8FAFC] font-black text-sm">{formatMinSec(elapsedSecondsTotal)}</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-[#0B1F33] rounded-full overflow-hidden p-[1px] border border-[#E8D3A2]/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8D3A2] to-[#F5E7C6] shadow-[0_0_12px_rgba(232,211,162,0.6)] transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-[#B8C4D0] pt-0.5">
              <span>Req: {formatMinSec(durationSec)}</span>
              <span className="text-[#F5E7C6] font-bold">Remaining: {formatMinSec(remainingSecondsTotal)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Rewards Bar & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#E8D3A2]/15 mt-2">
        {/* Rewards */}
        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="text-[#E8D3A2]">
            ⚡ +{quest.difficulty === 'Easy' ? 20 : quest.difficulty === 'Medium' ? 40 : quest.difficulty === 'Hard' ? 75 : 150} XP
          </span>
          <span className="text-[#F5E7C6]">
            💰 +{quest.difficulty === 'Easy' ? 10 : quest.difficulty === 'Medium' ? 20 : quest.difficulty === 'Hard' ? 35 : 75} GOLD
          </span>
        </div>

        {/* Action Button */}
        <div>
          {questState === 'READY' && (
            <button
              onClick={() => startQuestTimer(quest.id)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black text-xs tracking-wider shadow-[0_0_20px_rgba(232,211,162,0.25)] transition transform hover:scale-[1.03] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-[#071522]" />
              <span>[ ⚔ START QUEST ]</span>
            </button>
          )}

          {questState === 'ACTIVE' && (
            <button
              disabled
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#071522] text-[#B8C4D0] border border-[#E8D3A2]/20 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-[#B8C4D0]" />
              <span>🔒 LOCKED ({formatMinSec(remainingSecondsTotal)})</span>
            </button>
          )}

          {questState === 'COMPLETABLE' && (
            <button
              onClick={() => onCompleteClick(quest)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black text-xs tracking-wider shadow-[0_0_25px_rgba(232,211,162,0.4)] transition transform hover:scale-[1.04] flex items-center justify-center gap-2 animate-pulse cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#071522]" />
              <span>[ ✨ COMPLETE QUEST ]</span>
            </button>
          )}

          {questState === 'COMPLETED' && (
            <span className="text-[#E8D3A2] font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#E8D3A2]" /> VICTORY RECORDED
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

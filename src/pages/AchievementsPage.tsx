import React from 'react';
import { useGame } from '../context/GameContext';
import { Award, Lock, Sparkles, Trophy } from 'lucide-react';

export const AchievementsPage: React.FC = () => {
  const { achievements } = useGame();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <Trophy className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">ACHIEVEMENT BADGES</h1>
              <p className="text-xs text-[#B8C4D0]">
                Unlock prestigious trophies as you master real-life productivity milestones.
              </p>
            </div>
          </div>

          <div className="bg-[#071522] border border-[#E8D3A2]/30 px-4 py-2.5 rounded-2xl text-[#E8D3A2] font-bold text-xs shadow-[0_0_15px_rgba(232,211,162,0.15)]">
            🏆 {unlockedCount} / {achievements.length} UNLOCKED
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((ach) => {
            const percentage = Math.min(100, Math.round((ach.current_count / ach.required_count) * 100));

            return (
              <div
                key={ach.id}
                className={`relative bg-[#102A43] border ${
                  ach.unlocked
                    ? 'border-[#E8D3A2]/50 shadow-[0_0_20px_rgba(232,211,162,0.2)]'
                    : 'border-[#E8D3A2]/10 opacity-60'
                } rounded-3xl p-6 flex flex-col justify-between transition`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${
                        ach.unlocked
                          ? 'bg-[#E8D3A2]/20 border-[#E8D3A2] text-[#E8D3A2]'
                          : 'bg-[#071522] border-[#E8D3A2]/20 text-[#B8C4D0]/40'
                      }`}
                    >
                      {ach.unlocked ? <Award className="w-6 h-6 animate-pulse text-[#E8D3A2]" /> : <Lock className="w-6 h-6" />}
                    </div>

                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        ach.unlocked
                          ? 'bg-[#E8D3A2]/15 text-[#E8D3A2] border-[#E8D3A2]/40'
                          : 'bg-[#071522] text-[#B8C4D0]/50 border-[#E8D3A2]/10'
                      }`}
                    >
                      {ach.unlocked ? 'UNLOCKED' : 'LOCKED'}
                    </span>
                  </div>

                  <h3 className={`text-lg font-bold mb-1 ${ach.unlocked ? 'text-[#F8FAFC]' : 'text-[#B8C4D0]'}`}>
                    {ach.name}
                  </h3>
                  <p className="text-xs text-[#B8C4D0] mb-4 leading-relaxed">{ach.description}</p>
                </div>

                {/* Progress Bar */}
                <div className="pt-3 border-t border-[#E8D3A2]/15">
                  <div className="flex justify-between text-[10px] text-[#B8C4D0] mb-1">
                    <span>PROGRESS</span>
                    <span className={ach.unlocked ? 'text-[#E8D3A2] font-bold' : 'text-[#B8C4D0]/60'}>
                      {ach.current_count} / {ach.required_count}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#071522] rounded-full overflow-hidden p-[1px] border border-[#E8D3A2]/15">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ach.unlocked ? 'bg-[#E8D3A2] shadow-[0_0_10px_rgba(232,211,162,0.5)]' : 'bg-[#B8C4D0]/20'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

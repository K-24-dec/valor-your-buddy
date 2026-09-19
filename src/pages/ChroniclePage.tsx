import React from 'react';
import { useGame } from '../context/GameContext';
import { Award, Calendar, Camera, CheckCircle2, History, MessageSquare, Sparkles, Swords, Zap } from 'lucide-react';

export const ChroniclePage: React.FC = () => {
  const { completions } = useGame();

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <History className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">THE CHRONICLE</h1>
              <p className="text-xs text-[#B8C4D0]">
                Immutable activity timeline of your real-world quest victories, reflections, and proof history.
              </p>
            </div>
          </div>
        </div>

        {completions.length === 0 ? (
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-12 text-center space-y-4">
            <History className="w-12 h-12 text-[#B8C4D0]/40 mx-auto" />
            <h4 className="text-base font-bold text-[#F8FAFC]">No chronicle history recorded yet.</h4>
            <p className="text-xs text-[#B8C4D0] max-w-sm mx-auto">
              Complete your first quest from the Adventure Hub to log your real-world progression!
            </p>
          </div>
        ) : (
          <div className="relative border-l-2 border-[#E8D3A2]/30 ml-4 sm:ml-6 space-y-6 pl-6 sm:pl-8">
            {completions.map((comp) => {
              const formattedDate = new Date(comp.completed_at).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div key={comp.id} className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full bg-[#071522] border-2 border-[#E8D3A2] shadow-[0_0_10px_rgba(232,211,162,0.5)] group-hover:scale-125 transition" />

                  <div className="bg-[#102A43] border border-[#E8D3A2]/20 hover:border-[#E8D3A2]/50 rounded-2xl p-5 shadow-md transition space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#E8D3A2] flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-[#E8D3A2]" /> QUEST COMPLETED
                        </span>
                        <span className="text-[10px] text-[#F5E7C6] bg-[#E8D3A2]/10 px-2 py-0.5 rounded border border-[#E8D3A2]/20">
                          {comp.category}
                        </span>
                        {comp.verified_via === 'proof_upload' && (
                          <span className="text-[10px] bg-[#E8D3A2]/15 text-[#E8D3A2] border border-[#E8D3A2]/30 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Camera className="w-3 h-3 text-[#E8D3A2]" /> PROOF VERIFIED
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#B8C4D0] font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#B8C4D0]" />
                        {formattedDate}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-[#F8FAFC]">{comp.quest_title}</h4>

                    {/* Reflection Note Box */}
                    {comp.reflection_note && (
                      <div className="bg-[#071522] border border-[#E8D3A2]/20 rounded-xl p-3 text-xs text-[#B8C4D0] italic flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-[#E8D3A2] shrink-0 mt-0.5" />
                        <div>
                          <span className="text-[10px] text-[#E8D3A2] font-mono font-bold block uppercase not-italic">
                            HERO REFLECTION
                          </span>
                          "{comp.reflection_note}"
                        </div>
                      </div>
                    )}

                    {/* Proof Image Attachment */}
                    {comp.proof_url && (
                      <div className="mt-2 relative max-w-sm rounded-xl overflow-hidden border border-[#E8D3A2]/30">
                        <img
                          src={comp.proof_url}
                          alt="Verification Proof"
                          className="w-full h-40 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Rewards Summary */}
                    <div className="flex flex-wrap items-center gap-3 text-xs bg-[#071522] p-3 rounded-xl border border-[#E8D3A2]/15">
                      <span className="text-[#E8D3A2] font-bold">⚡ +{comp.xp_awarded} XP</span>
                      <span className="text-[#F5E7C6] font-bold">🪙 +{comp.gold_awarded} GOLD</span>
                      <span className="text-[#E8D3A2] font-bold uppercase">
                        ✨ {comp.attribute_boosted} +{comp.attribute_amount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { RefreshCw, Save, Settings, ShieldAlert, User } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { character, updateCharacterName, resetProgress } = useGame();
  const [name, setName] = useState(character.name);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateCharacterName(name.trim());
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all character level, gold, quests, and streak progress?')) {
      resetProgress();
      alert('Account progress successfully reset!');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <Settings className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">CHARACTER SETTINGS</h1>
              <p className="text-xs text-[#B8C4D0]">
                Manage hero identity, preferences, and account progression data.
              </p>
            </div>
          </div>
        </div>

        {savedNotice && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            ✓ Character hero name successfully updated!
          </div>
        )}

        {/* Character Identity Form */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-[#F8FAFC] flex items-center gap-2">
            <User className="w-4 h-4 text-[#E8D3A2]" />
            <span>HERO IDENTITY</span>
          </h3>

          <form onSubmit={handleSaveName} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#B8C4D0] font-bold mb-1">HERO DISPLAY NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl px-4 py-2.5 text-[#F8FAFC] focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black flex items-center gap-2 shadow-[0_0_15px_rgba(232,211,162,0.3)] transition cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#071522]" />
              <span>SAVE NAME</span>
            </button>
          </form>
        </div>

        {/* Account Data Reset Danger Zone */}
        <div className="bg-[#102A43] border border-rose-500/30 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span>DANGER ZONE // RESET ACCOUNT PROGRESS</span>
          </h3>
          <p className="text-xs text-[#B8C4D0]">
            Reset all character levels, attributes, quests, inventory, and streak records back to starting demo defaults.
          </p>

          <button
            onClick={handleReset}
            className="px-5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>RESET ALL PROGRESS</span>
          </button>
        </div>
      </div>
    </div>
  );
};

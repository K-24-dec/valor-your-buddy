import React from 'react';
import { Sparkles, Mic, Globe } from 'lucide-react';

interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, onNavigate }) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#071522]/90 backdrop-blur-xl border-b border-[#E8D3A2]/20 shadow-xl font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E8D3A2] to-[#F5E7C6] p-[2px] shadow-[0_0_15px_rgba(232,211,162,0.3)] group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#071522] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#E8D3A2] animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#E8D3A2] via-white to-[#F5E7C6]">
                VALOR
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8D3A2]/15 text-[#E8D3A2] border border-[#E8D3A2]/30">
                AI PARTNER
              </span>
            </div>
          </div>
        </div>

        {/* Minimal Navigation & CTA */}
        <div className="flex items-center gap-3">
          {currentPath !== '/chat' && (
            <button
              onClick={() => onNavigate('/chat')}
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(232,211,162,0.3)]"
            >
              <Mic className="w-4 h-4 text-[#071522]" />
              <span>Start Talking</span>
            </button>
          )}

          {currentPath === '/chat' && (
            <button
              onClick={() => onNavigate('/')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#B8C4D0] hover:text-[#F8FAFC] border border-[#E8D3A2]/20 hover:bg-[#102A43] transition-all cursor-pointer"
            >
              Home
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

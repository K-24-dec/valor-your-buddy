import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Lock, Mail, Shield, Sparkles, User } from 'lucide-react';

interface AuthPageProps {
  mode: 'login' | 'signup';
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onNavigate }) => {
  const { loginUser } = useGame();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide valid credentials.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      loginUser(email.trim(), mode === 'signup');
      setLoading(false);
      onNavigate('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute w-[500px] h-[500px] bg-[#E8D3A2]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="relative w-full max-w-md bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E8D3A2] to-[#F5E7C6] p-[2px] mx-auto mb-3 shadow-[0_0_20px_rgba(232,211,162,0.3)]">
            <div className="w-full h-full bg-[#071522] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-[#E8D3A2] animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-[#F8FAFC] tracking-wider">
            {mode === 'login' ? 'WELCOME BACK, HERO' : 'CREATE YOUR HERO'}
          </h2>
          <p className="text-xs text-[#B8C4D0] mt-1">
            {mode === 'login'
              ? 'Enter your credentials to load your persistent hero profile'
              : 'Begin your journey with a fresh Level 1 character'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'signup' && (
            <div>
              <label className="block text-[#B8C4D0] font-bold mb-1">CHARACTER NAME</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3 w-4 h-4 text-[#B8C4D0]" />
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="e.g. Kaelen Vance"
                  className="w-full bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl pl-10 pr-3.5 py-2.5 text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none"
                  required
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[#B8C4D0] font-bold mb-1">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-[#B8C4D0]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hero@liferpg.io"
                className="w-full bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl pl-10 pr-3.5 py-2.5 text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[#B8C4D0] font-bold mb-1">PASSWORD</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-[#B8C4D0]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl pl-10 pr-3.5 py-2.5 text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black tracking-widest text-xs shadow-[0_0_20px_rgba(232,211,162,0.3)] transition cursor-pointer"
          >
            {loading ? 'INITIALIZING HERO...' : mode === 'login' ? 'LOGIN TO REALM' : 'CREATE FRESH LEVEL 1 HERO'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[#B8C4D0]">
          {mode === 'login' ? (
            <p>
              New hero?{' '}
              <button onClick={() => onNavigate('/signup')} className="text-[#E8D3A2] font-bold hover:underline cursor-pointer">
                Create character
              </button>
            </p>
          ) : (
            <p>
              Already have a hero?{' '}
              <button onClick={() => onNavigate('/login')} className="text-[#E8D3A2] font-bold hover:underline cursor-pointer">
                Login here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { GameProvider } from './context/GameContext';
import { Navbar } from './components/Navbar';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { LandingPage } from './pages/LandingPage';
import { ChatScreen } from './pages/ChatScreen';

const AppContent: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  const handleNavigate = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPage = () => {
    switch (currentPath) {
      case '/chat':
      case '/talk':
      case '/voice-tutor':
        return <ChatScreen onNavigateHome={() => handleNavigate('/')} />;
      case '/':
      default:
        return <LandingPage onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] selection:bg-[#E8D3A2] selection:text-[#071522] relative flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
      <BackgroundCanvas />
      <div className="relative z-10 flex-1 flex flex-col">
        <Navbar currentPath={currentPath} onNavigate={handleNavigate} />
        <main className="flex-1">{renderPage()}</main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { CreateQuestModal } from '../components/CreateQuestModal';
import { EditQuestModal } from '../components/EditQuestModal';
import { QuestCompletionModal } from '../components/QuestCompletionModal';
import { QuestTimerCard } from '../components/QuestTimerCard';
import { Quest } from '../types/game';
import { Filter, Plus, Search, Swords } from 'lucide-react';

export const QuestsPage: React.FC = () => {
  const { quests, completeQuest, deleteQuest } = useGame();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null);
  const [completingQuest, setCompletingQuest] = useState<Quest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ['All', 'Coding', 'Study', 'Fitness', 'Reading', 'Health', 'Creativity', 'Mindfulness', 'Personal', 'Work'];
  const difficulties = ['All', 'Easy', 'Medium', 'Hard', 'Epic'];

  const filteredQuests = quests.filter((quest) => {
    const matchesCategory = selectedCategory === 'All' || quest.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || quest.difficulty === selectedDifficulty;
    const matchesSearch =
      quest.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (quest.description && quest.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesDifficulty && matchesSearch;
  });

  const handleConfirmCompletion = async (reflectionNote?: string, proofUrl?: string) => {
    if (!completingQuest) return;
    setIsSubmitting(true);
    await completeQuest(completingQuest.id, reflectionNote, proofUrl);
    setIsSubmitting(false);
    setCompletingQuest(null);
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC] flex items-center gap-3">
              <Swords className="w-7 h-7 text-[#E8D3A2]" />
              <span>QUEST BOARD</span>
            </h1>
            <p className="text-xs text-[#B8C4D0] mt-1">
              Select, manage, start timers, and complete your real-world productivity missions.
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black text-xs tracking-wider shadow-[0_0_20px_rgba(232,211,162,0.25)] transition cursor-pointer"
          >
            + CREATE QUEST
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-2xl p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#B8C4D0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search quests by title or description..."
                className="w-full bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-[#B8C4D0]/50 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#E8D3A2]" />
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="bg-[#071522] border border-[#E8D3A2]/20 focus:border-[#E8D3A2] rounded-xl px-3 py-2 text-xs text-[#F8FAFC]"
              >
                <option value="All">All Difficulties</option>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Epic">Epic</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#E8D3A2] text-[#071522] font-black shadow-[0_0_10px_rgba(232,211,162,0.3)]'
                      : 'bg-[#071522] text-[#B8C4D0] hover:text-[#F8FAFC] border border-[#E8D3A2]/15'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quest List */}
        {filteredQuests.length === 0 ? (
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-12 text-center space-y-4">
            <h4 className="text-base font-bold text-[#B8C4D0]">No quests found matching your filter criteria.</h4>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setSelectedDifficulty('All');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-[#071522] text-[#E8D3A2] border border-[#E8D3A2]/30 text-xs font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredQuests.map((quest) => (
              <QuestTimerCard
                key={quest.id}
                quest={quest}
                onCompleteClick={(q) => setCompletingQuest(q)}
                onEditClick={(q) => setEditingQuest(q)}
                onDeleteClick={(id) => deleteQuest(id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateQuestModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
      <EditQuestModal quest={editingQuest} onClose={() => setEditingQuest(null)} />
      <QuestCompletionModal
        quest={completingQuest}
        isOpen={Boolean(completingQuest)}
        onClose={() => setCompletingQuest(null)}
        onConfirm={handleConfirmCompletion}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};

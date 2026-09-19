import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Award, Check, Crown, Shield, ShoppingBag, Sparkles, Zap } from 'lucide-react';

export const MarketPage: React.FC = () => {
  const { character, marketItems, inventory, buyMarketItem } = useGame();
  const [selectedType, setSelectedType] = useState<string>('All');
  const [purchaseNotice, setPurchaseNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const types = ['All', 'avatar', 'frame', 'title', 'theme'];

  const filteredItems = marketItems.filter((item) => selectedType === 'All' || item.type === selectedType);

  const handleBuy = (itemId: string) => {
    const res = buyMarketItem(itemId);
    setPurchaseNotice({
      type: res.success ? 'success' : 'error',
      message: res.message,
    });
    setTimeout(() => setPurchaseNotice(null), 4000);
  };

  const getRarityStyle = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return 'text-[#E8D3A2] border-[#E8D3A2]/60 bg-[#E8D3A2]/15 shadow-[0_0_15px_rgba(232,211,162,0.3)]';
      case 'EPIC':
        return 'text-[#F5E7C6] border-[#E8D3A2]/40 bg-[#E8D3A2]/10';
      case 'RARE':
        return 'text-[#E8D3A2] border-[#E8D3A2]/30 bg-[#E8D3A2]/10';
      case 'UNCOMMON':
        return 'text-[#B8C4D0] border-[#E8D3A2]/20 bg-[#102A43]';
      case 'COMMON':
      default:
        return 'text-[#B8C4D0] border-[#E8D3A2]/10 bg-[#071522]';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <ShoppingBag className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">GUILD MARKET</h1>
              <p className="text-xs text-[#B8C4D0]">
                Spend earned Gold to acquire legendary avatars, frames, titles, and themes.
              </p>
            </div>
          </div>

          {/* User Gold Balance Card */}
          <div className="bg-[#071522] border border-[#E8D3A2]/30 px-4 py-2.5 rounded-2xl text-[#E8D3A2] font-bold text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(232,211,162,0.15)]">
            <span className="text-xl">🪙</span>
            <span>{character.gold.toLocaleString()} GOLD AVAILABLE</span>
          </div>
        </div>

        {/* Purchase Toast Notice */}
        {purchaseNotice && (
          <div
            className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all ${
              purchaseNotice.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{purchaseNotice.message}</span>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {types.map((type) => {
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition cursor-pointer ${
                  isSelected
                    ? 'bg-[#E8D3A2] text-[#071522] font-black shadow-[0_0_15px_rgba(232,211,162,0.3)]'
                    : 'bg-[#102A43] text-[#B8C4D0] hover:text-[#F8FAFC] border border-[#E8D3A2]/15'
                }`}
              >
                {type === 'All' ? 'ALL ITEMS' : `${type}S`}
              </button>
            );
          })}
        </div>

        {/* Market Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isOwned = inventory.includes(item.id);
            const canAfford = character.gold >= item.cost;

            return (
              <div
                key={item.id}
                className="bg-[#102A43] border border-[#E8D3A2]/20 hover:border-[#E8D3A2]/50 rounded-3xl p-6 shadow-xl flex flex-col justify-between transition group"
              >
                <div>
                  {/* Top Badge & Rarity */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-[#B8C4D0] uppercase tracking-widest">
                      {item.type}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getRarityStyle(item.rarity)}`}>
                      {item.rarity}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#E8D3A2] transition mb-2">
                    {item.name}
                  </h3>
                  <p className="text-xs text-[#B8C4D0] mb-6 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Price & Buy Action */}
                <div className="pt-4 border-t border-[#E8D3A2]/15 flex items-center justify-between">
                  <div className="text-[#E8D3A2] font-bold text-sm flex items-center gap-1">
                    <span className="text-base">🪙</span>
                    <span>{item.cost === 0 ? 'FREE' : `${item.cost} GOLD`}</span>
                  </div>

                  {isOwned ? (
                    <span className="px-4 py-2 rounded-xl bg-[#071522] text-[#E8D3A2] border border-[#E8D3A2]/30 text-xs font-bold flex items-center gap-1">
                      <Check className="w-4 h-4 text-[#E8D3A2]" /> OWNED
                    </span>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.id)}
                      disabled={!canAfford}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                        canAfford
                          ? 'bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black shadow-[0_0_15px_rgba(232,211,162,0.3)]'
                          : 'bg-[#071522] text-[#B8C4D0]/50 cursor-not-allowed border border-[#E8D3A2]/10'
                      }`}
                    >
                      {canAfford ? '[ BUY ITEM ]' : 'NEED GOLD'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

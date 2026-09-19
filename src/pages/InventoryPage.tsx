import React from 'react';
import { useGame } from '../context/GameContext';
import { Check, Shield, Sparkles } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { character, marketItems, inventory, equipCosmetic } = useGame();

  const ownedItems = marketItems.filter((item) => inventory.includes(item.id));

  const isEquipped = (item: typeof marketItems[0]) => {
    switch (item.type) {
      case 'avatar':
        return character.equipped_avatar === item.id;
      case 'frame':
        return character.equipped_frame === item.id;
      case 'theme':
        return character.equipped_theme === item.id;
      case 'title':
        return character.equipped_title === item.name;
      default:
        return false;
    }
  };

  const handleEquip = (item: typeof marketItems[0]) => {
    equipCosmetic(item.type as 'avatar' | 'frame' | 'theme' | 'title', item.type === 'title' ? item.name : item.id);
  };

  return (
    <div className="min-h-screen bg-[#0B1F33] text-[#F8FAFC] font-['Plus_Jakarta_Sans',sans-serif] pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Header */}
        <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#E8D3A2]/10 border border-[#E8D3A2]/30 text-[#E8D3A2]">
              <Shield className="w-8 h-8 text-[#E8D3A2]" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#F8FAFC]">YOUR ARSENAL</h1>
              <p className="text-xs text-[#B8C4D0]">
                View owned items and equip custom avatars, frames, themes, and legendary titles.
              </p>
            </div>
          </div>
        </div>

        {ownedItems.length === 0 ? (
          <div className="bg-[#102A43] border border-[#E8D3A2]/20 rounded-3xl p-12 text-center space-y-4">
            <Shield className="w-12 h-12 text-[#B8C4D0]/40 mx-auto" />
            <h4 className="text-base font-bold text-[#F8FAFC]">Your arsenal is empty.</h4>
            <p className="text-xs text-[#B8C4D0] max-w-sm mx-auto">
              Complete quests, earn Gold, and visit the Guild Market to collect cosmetics!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedItems.map((item) => {
              const equipped = isEquipped(item);

              return (
                <div
                  key={item.id}
                  className={`bg-[#102A43] border ${
                    equipped ? 'border-[#E8D3A2] shadow-[0_0_20px_rgba(232,211,162,0.3)]' : 'border-[#E8D3A2]/20'
                  } rounded-3xl p-6 shadow-xl flex flex-col justify-between transition`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] text-[#E8D3A2] font-bold uppercase">{item.type}</span>
                      {equipped && (
                        <span className="text-[10px] bg-[#E8D3A2]/20 text-[#E8D3A2] border border-[#E8D3A2] px-2 py-0.5 rounded-full font-bold">
                          EQUIPPED
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#F8FAFC] mb-2">{item.name}</h3>
                    <p className="text-xs text-[#B8C4D0] mb-6">{item.description}</p>
                  </div>

                  <button
                    onClick={() => handleEquip(item)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                      equipped
                        ? 'bg-[#E8D3A2]/20 text-[#E8D3A2] border border-[#E8D3A2]/40 cursor-default'
                        : 'bg-[#E8D3A2] hover:bg-[#F5E7C6] text-[#071522] font-black shadow-md'
                    }`}
                  >
                    {equipped ? 'EQUIPPED ON CHARACTER' : 'EQUIP ITEM'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

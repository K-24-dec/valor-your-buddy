import React from 'react';

interface StatProgressBarProps {
  label: string;
  value: number;
  max?: number;
  icon?: React.ReactNode;
  color?: 'cyan' | 'purple' | 'amber' | 'emerald' | 'rose' | 'blue';
  description?: string;
}

export const StatProgressBar: React.FC<StatProgressBarProps> = ({
  label,
  value,
  max = 100,
  icon,
  description,
}) => {
  const percentage = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="p-3.5 rounded-2xl border bg-[#071522] border-[#E8D3A2]/20 font-['Plus_Jakarta_Sans',sans-serif] transition-all duration-300 hover:scale-[1.01]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {icon && <span className="text-[#E8D3A2]">{icon}</span>}
          <span className="text-xs font-extrabold tracking-wider text-[#F8FAFC] uppercase">{label}</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold">
          <span className="text-[#E8D3A2]">{value}</span>
          <span className="text-[#B8C4D0]">/ {max}</span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-2.5 bg-[#0B1F33] rounded-full overflow-hidden p-[1px] border border-[#E8D3A2]/20">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#E8D3A2] to-[#F5E7C6] shadow-[0_0_10px_rgba(232,211,162,0.5)] transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {description && <p className="text-[10px] text-[#B8C4D0] mt-1.5 leading-tight">{description}</p>}
    </div>
  );
};

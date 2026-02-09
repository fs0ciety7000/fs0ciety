interface StatsCardProps {
  label: string;
  value: number | string;
  icon?: string;
}

export function StatsCard({ label, value, icon = "#" }: StatsCardProps) {
  return (
    <div className="border border-terminal-gray-light bg-terminal-black-light p-6 hover:border-terminal-green/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-mono text-terminal-green-dim uppercase tracking-wider">
          {label}
        </span>
        <span className="text-terminal-green opacity-40 font-mono text-lg">
          {icon}
        </span>
      </div>
      <div className="text-3xl font-mono font-bold text-terminal-green">
        {value}
      </div>
    </div>
  );
}

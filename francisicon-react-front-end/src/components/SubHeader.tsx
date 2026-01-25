import React from 'react';
interface SubHeaderProps {
  title: string;
}
export function SubHeader({
  title
}: SubHeaderProps) {
  return <div className="bg-gradient-to-r from-[#8b2828] via-[#7d1f1f] to-[#6b1a1a] shadow-lg">
      <div className="max-w-full mx-auto px-6 py-2.5">
        <h2 className="text-lg font-semibold text-white tracking-wide">{title}</h2>
      </div>
    </div>;
}
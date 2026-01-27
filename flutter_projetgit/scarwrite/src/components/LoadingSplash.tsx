import React, { useEffect, useState } from 'react';

export default function LoadingSplash({ duration = 1100 }: { duration?: number }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration + 100);
    return () => clearTimeout(t);
  }, [duration]);

  return (
    <div aria-hidden={(!visible).toString()} className={`fixed inset-0 z-[9999] flex items-center justify-center bg-black transition-opacity ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`transform transition-all duration-700 ${visible ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}>
        <img src="/scarwrite.png" alt="ScarWrite" className="w-40 h-40 object-contain" />
      </div>
    </div>
  );
}

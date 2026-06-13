import { useState } from 'react';

export default function SetupScreen({ title, actionObj, onSecondary }: { title: string, actionObj: { label: string, action: (name: string) => void }, onSecondary?: () => void }) {
  const [name, setName] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-6">
      <h2 className="text-xl font-bold uppercase tracking-widest text-[#e0e0e0] mb-2">{title}</h2>
      <div className="w-full">
        <label className="text-[10px] text-zinc-400 uppercase font-bold block mb-2">Display Name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-[#e0e0e0]"
          autoFocus
        />
      </div>
      <div className="flex w-full gap-3">
        {onSecondary && (
          <button
            onClick={onSecondary}
            className="flex-1 py-3 bg-[#1a1a1a] border border-[#333] rounded-xl text-sm font-medium hover:border-indigo-500/50 transition-all text-[#e0e0e0]"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            if (name.trim()) actionObj.action(name.trim());
          }}
          disabled={!name.trim()}
          className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg disabled:opacity-50 text-sm font-bold rounded-xl transition-all"
        >
          {actionObj.label}
        </button>
      </div>
    </div>
  );
}

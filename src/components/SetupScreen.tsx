import { useState } from 'react';

export default function SetupScreen({ title, actionObj, onSecondary }: { title: string, actionObj: { label: string, action: (name: string) => void }, onSecondary?: () => void }) {
  const [name, setName] = useState('');

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
        autoFocus
      />
      <div className="flex w-full gap-3">
        {onSecondary && (
          <button
            onClick={onSecondary}
            className="flex-1 py-3 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={() => {
            if (name.trim()) actionObj.action(name.trim());
          }}
          disabled={!name.trim()}
          className="flex-1 py-3 bg-white text-black font-medium rounded-lg disabled:opacity-50"
        >
          {actionObj.label}
        </button>
      </div>
    </div>
  );
}

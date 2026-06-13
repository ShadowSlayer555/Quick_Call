import { Phone, PhoneOff } from 'lucide-react';
import { PeerInfo } from '../types';

interface RingingScreenProps {
  caller: PeerInfo | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function RingingScreen({ caller, onAccept, onDecline }: RingingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-10">
      <div className="text-center space-y-2 relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative z-10">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Incoming Call From</h2>
          <h1 className="text-3xl font-bold text-[#e0e0e0]">{caller?.name || 'Unknown'}</h1>
        </div>
      </div>

      <div className="flex gap-6 relative z-10 w-full px-8">
        <button
          onClick={onDecline}
          className="flex-1 py-4 bg-[#1a1a1a] border border-red-500/30 hover:border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-2xl flex flex-col items-center justify-center transition-all text-red-500 gap-2"
        >
          <PhoneOff className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Decline</span>
        </button>
        <button
          onClick={onAccept}
          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] rounded-2xl flex flex-col items-center justify-center transition-all animate-bounce text-white gap-2"
        >
          <Phone className="w-6 h-6" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Accept</span>
        </button>
      </div>
    </div>
  );
}

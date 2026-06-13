import { Phone, PhoneOff } from 'lucide-react';
import { PeerInfo } from '../types';

interface RingingScreenProps {
  caller: PeerInfo | null;
  onAccept: () => void;
  onDecline: () => void;
}

export default function RingingScreen({ caller, onAccept, onDecline }: RingingScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-sm mx-auto space-y-12">
      <div className="text-center space-y-4 relative">
        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
        <div className="relative">
          <h2 className="text-xl text-gray-400">Incoming Call From</h2>
          <h1 className="text-4xl font-bold mt-2 text-white">{caller?.name || 'Unknown'}</h1>
        </div>
      </div>

      <div className="flex gap-6 relative">
        <button
          onClick={onDecline}
          className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center transition-transform hover:scale-110 shadow-lg shadow-red-500/20"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={onAccept}
          className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center transition-transform hover:scale-110 animate-bounce shadow-lg shadow-green-500/20"
        >
          <Phone className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}

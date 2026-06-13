import { Check, X, Users, Play } from 'lucide-react';
import { PeerInfo } from '../types';

interface HostRoomProps {
  pendingGuests: PeerInfo[];
  acceptedGuests: PeerInfo[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onStartCall: () => void;
  onCancel: () => void;
}

export default function HostRoom({ pendingGuests, acceptedGuests, onAccept, onReject, onStartCall, onCancel }: HostRoomProps) {
  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between border-b border-[#222] pb-4 shrink-0">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#e0e0e0] flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Hosting Room
          </h2>
          <p className="text-[10px] text-zinc-500 font-mono mt-1">Waiting for people to join...</p>
        </div>
        <button onClick={onCancel} className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Close Room</button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-2 min-h-0">
        <div>
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Pending Requests ({pendingGuests.length})</h3>
          {pendingGuests.length === 0 ? (
            <div className="p-4 rounded-xl border border-[#333] bg-[#1a1a1a] text-zinc-500 italic text-sm text-center">
              No pending requests.
            </div>
          ) : (
            <ul className="space-y-3">
              {pendingGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#1a1a1a] border border-[#333]">
                  <span className="text-sm font-medium">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onReject(g.id)} className="w-8 h-8 bg-red-500/20 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => onAccept(g.id)} className="w-8 h-8 bg-green-500/20 text-green-500 rounded-lg flex items-center justify-center hover:bg-green-500 hover:text-white transition-all">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Accepted Guests ({acceptedGuests.length})</h3>
          {acceptedGuests.length === 0 ? (
            <div className="p-4 rounded-xl border border-[#333] bg-[#1a1a1a] text-zinc-500 italic text-sm text-center">
              No one accepted yet.
            </div>
          ) : (
            <ul className="space-y-3">
              {acceptedGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#1a1a1a] border border-[#333] text-[#e0e0e0]">
                  <span className="text-sm font-medium">{g.name}</span>
                  <span className="text-[10px] uppercase font-bold text-green-500">Ready</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[#222] shrink-0">
        <button
          onClick={onStartCall}
          disabled={acceptedGuests.length === 0}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          Start Call Now
        </button>
      </div>
    </div>
  );
}

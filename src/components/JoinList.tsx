import { RefreshCw, Phone, ArrowLeft } from 'lucide-react';
import { PeerInfo } from '../types';

interface JoinListProps {
  hosts: PeerInfo[];
  onRefresh: () => void;
  onJoin: (hostId: string) => void;
  onCancel: () => void;
  statusMsg?: string;
}

export default function JoinList({ hosts, onRefresh, onJoin, onCancel, statusMsg }: JoinListProps) {
  if (statusMsg) {
    return (
      <div className="flex flex-col h-full items-center justify-center space-y-4">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 rounded-full border-b-2 border-indigo-500 animate-spin"></div>
          <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">{statusMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full space-y-6">
       <div className="flex items-center justify-between border-b border-[#222] pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 text-zinc-400 hover:text-white rounded-xl bg-[#1a1a1a] border border-[#333] transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#e0e0e0] flex items-center gap-2">
              <Phone className="w-4 h-4 text-indigo-400" />
              Available Hosts
            </h2>
          </div>
        </div>
        <button onClick={onRefresh} className="text-zinc-400 hover:text-white flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#333] rounded-xl hover:border-indigo-500/50 transition-all">
          <RefreshCw className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {hosts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-zinc-500 space-y-2">
            <p className="text-sm">No hosts found.</p>
            <p className="text-[10px] uppercase font-bold tracking-widest">Click refresh to search again.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {hosts.map(h => (
              <button
                key={h.id}
                onClick={() => onJoin(h.id)}
                className="w-full text-left p-4 rounded-xl bg-[#1a1a1a] border border-[#333] hover:border-indigo-500/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg">
                    {h.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-[#e0e0e0]">{h.name}'s Room</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <p className="text-[10px] uppercase font-bold text-green-500 tracking-widest">Online</p>
                    </div>
                  </div>
                </div>
                <div className="text-xs font-bold text-indigo-500 bg-indigo-500/0 group-hover:bg-indigo-500/10 px-3 py-1.5 rounded-lg transition-all tracking-wider uppercase">
                  JOIN
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

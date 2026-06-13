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
          <div className="w-12 h-12 rounded-full border-b-2 border-white animate-spin"></div>
          <p className="text-gray-300 font-medium">{statusMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto w-full space-y-6">
       <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="p-2 text-gray-400 hover:text-white rounded-md bg-gray-900 border border-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5 text-green-400" />
              Available Hosts
            </h2>
          </div>
        </div>
        <button onClick={onRefresh} className="text-gray-400 hover:text-white flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg transition-colors">
          <RefreshCw className="w-4 h-4" />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {hosts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-500 space-y-2">
            <p>No hosts found.</p>
            <p className="text-sm">Click refresh to search again.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {hosts.map(h => (
              <button
                key={h.id}
                onClick={() => onJoin(h.id)}
                className="w-full text-left p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-green-500/50 hover:bg-gray-800 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-lg font-medium border border-gray-700">
                    {h.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{h.name}'s Room</h3>
                    <p className="text-xs text-green-400">Online</p>
                  </div>
                </div>
                <div className="px-4 py-2 rounded bg-gray-950 text-sm font-medium text-gray-300 border border-gray-800 group-hover:bg-green-500/10 group-hover:text-green-400 group-hover:border-green-500/20 transition-colors">
                  Join Room
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

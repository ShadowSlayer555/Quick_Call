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
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Hosting Room
          </h2>
          <p className="text-gray-400 text-sm mt-1">Waiting for people to join...</p>
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-white px-4 py-2">Close Room</button>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto pr-2">
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Pending Requests ({pendingGuests.length})</h3>
          {pendingGuests.length === 0 ? (
            <div className="p-4 rounded-lg border border-gray-800/50 bg-gray-900/20 text-gray-500 italic text-sm text-center">
              No pending requests.
            </div>
          ) : (
            <ul className="space-y-2">
              {pendingGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900 border border-gray-800">
                  <span className="font-medium">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onReject(g.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-md bg-gray-950 border border-gray-800 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                    <button onClick={() => onAccept(g.id)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-md bg-gray-950 border border-gray-800 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Accepted Guests ({acceptedGuests.length})</h3>
          {acceptedGuests.length === 0 ? (
            <div className="p-4 rounded-lg border border-gray-800/50 bg-gray-900/20 text-gray-500 italic text-sm text-center">
              No one accepted yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {acceptedGuests.map(g => (
                <li key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-800/50 text-gray-300">
                  <span>{g.name}</span>
                  <span className="text-xs text-green-500 bg-green-500/10 px-2 py-1 rounded">Ready</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800">
        <button
          onClick={onStartCall}
          disabled={acceptedGuests.length === 0}
          className="w-full py-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-5 h-5" />
          Start Call Now
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Settings } from 'lucide-react';
import { PeerInfo } from '../types';
import { WebRTCManager } from '../lib/webrtc';
import mqtt from 'mqtt';

interface CallScreenProps {
  myId: string;
  peers: PeerInfo[];
  mqttClient: mqtt.MqttClient | null;
  onLeave: () => void;
}

const RemoteVideo = ({ stream, name }: { stream: MediaStream, name: string }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <div className="relative rounded-xl overflow-hidden bg-gray-950 aspect-video border border-gray-800">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-sm font-medium">
        {name}
      </div>
    </div>
  );
};

export default function CallScreen({ myId, peers, mqttClient, onLeave }: CallScreenProps) {
  const [manager, setManager] = useState<WebRTCManager | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState('');
  const [selectedAudio, setSelectedAudio] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(setDevices);
  }, []);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let rtcManager: WebRTCManager | null = null;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });
        activeStream = stream;
        
        applyToggles(stream);
        setLocalStream(stream);

        if (!mqttClient) return;

        rtcManager = new WebRTCManager(myId, mqttClient, stream, (err) => console.error('RTC Error', err));
        
        rtcManager.onStreamAdd = (peerId, remoteStream) => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.set(peerId, remoteStream);
            return next;
          });
        };

        rtcManager.onStreamRemove = (peerId) => {
          setRemoteStreams(prev => {
            const next = new Map(prev);
            next.delete(peerId);
            return next;
          });
        };

        setManager(rtcManager);
        rtcManager.initiateMesh(peers);
      } catch (err) {
        console.error("Failed to init media", err);
      }
    };

    init();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
      if (rtcManager) {
        rtcManager.cleanup();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId, peers, mqttClient, selectedVideo, selectedAudio]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const applyToggles = (stream: MediaStream) => {
    stream.getAudioTracks().forEach(t => t.enabled = audioEnabled);
    stream.getVideoTracks().forEach(t => t.enabled = videoEnabled);
  };

  useEffect(() => {
    if (localStream) applyToggles(localStream);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled, videoEnabled]);

  useEffect(() => {
    const handleSignal = (e: any) => {
      const msg = e.detail;
      if (manager && peers.find(p => p.id === msg.senderId)) {
        manager.handleSignal(msg.senderId, msg.signal);
      }
    };
    window.addEventListener('webrtc_signal', handleSignal);
    return () => window.removeEventListener('webrtc_signal', handleSignal);
  }, [manager, peers]);

  const toggleScreenShare = async () => {
    if (!manager) return;
    try {
      if (screenSharing) {
        // Revert to camera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });
        applyToggles(stream);
        setLocalStream(stream);
        manager.replaceLocalStream(stream);
        setScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        // Keep mic audio
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: selectedAudio ? { deviceId: { exact: selectedAudio } } : true
        });
        micStream.getAudioTracks()[0].enabled = audioEnabled;
        stream.addTrack(micStream.getAudioTracks()[0]);
        
        setLocalStream(stream);
        manager.replaceLocalStream(stream);
        setScreenSharing(true);
        
        stream.getVideoTracks()[0].onended = () => {
          toggleScreenShare(); // revert when stopped via browser UI
        };
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto content-start">
        {/* Local Video */}
        <div className="relative rounded-xl overflow-hidden bg-gray-950 aspect-video border border-gray-800">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!screenSharing ? 'scale-x-[-1]' : ''}`}
          />
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-md text-sm font-medium text-white shadow-sm flex items-center gap-2">
            You {screenSharing && '(Sharing Screen)'}
          </div>
        </div>
        
        {/* Remote Videos */}
        {Array.from(remoteStreams.entries()).map(([peerId, stream]) => {
          const name = peers.find(p => p.id === peerId)?.name || 'Unknown';
          return <RemoteVideo key={peerId} stream={stream} name={name} />;
        })}
      </div>

      <div className="h-20 bg-gray-900 border border-gray-800 rounded-xl px-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-4 rounded-full transition-colors ${audioEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => setVideoEnabled(!videoEnabled)}
            className={`p-4 rounded-full transition-colors ${videoEnabled ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-4 rounded-full transition-colors ${screenSharing ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
          >
            <MonitorUp className="w-5 h-5" />
          </button>

          <button
            onClick={onLeave}
            className="ml-4 p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-colors shadow-lg shadow-red-500/20"
          >
            <PhoneOff className="w-5 h-5 relative -left-0.5" />
          </button>
        </div>
        
        <div className="w-10"></div> {/* spacer for centering flex */}
      </div>

      {showSettings && (
        <div className="absolute bottom-28 left-8 bg-gray-900 border border-gray-800 p-4 rounded-xl shadow-2xl w-72 space-y-4">
          <h3 className="font-semibold text-white border-b border-gray-800 pb-2">Device Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Camera</label>
              <select
                className="mt-1 w-full bg-gray-950 border border-gray-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-red-500"
                value={selectedVideo}
                onChange={e => setSelectedVideo(e.target.value)}
              >
                <option value="">Default</option>
                {devices.filter(d => d.kind === 'videoinput').map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wider">Microphone</label>
              <select
                className="mt-1 w-full bg-gray-950 border border-gray-800 rounded-md p-2 text-sm text-white focus:outline-none focus:border-red-500"
                value={selectedAudio}
                onChange={e => setSelectedAudio(e.target.value)}
              >
                 <option value="">Default</option>
                {devices.filter(d => d.kind === 'audioinput').map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,5)}`}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { MqttMessage, getPrivateTopic } from './mqttStore';
import mqtt from 'mqtt';

export class WebRTCManager {
  private peers: Map<string, RTCPeerConnection> = new Map();
  public localStream: MediaStream | null = null;
  public remoteStreams: Map<string, MediaStream> = new Map();
  public onStreamAdd?: (peerId: string, stream: MediaStream) => void;
  public onStreamRemove?: (peerId: string) => void;
  
  constructor(
    private myId: string,
    private mqttClient: mqtt.MqttClient,
    private localMediaStream: MediaStream,
    private onSignalError?: (err: any) => void
  ) {
    this.localStream = localMediaStream;
  }

  public initiateMesh(peersToConnect: {id:string, name:string}[]) {
    for (const peer of peersToConnect) {
      if (peer.id === this.myId) continue;
      // Lexicographical compare to decide who creates offer
      if (this.myId < peer.id) {
        this.createPeerAndOffer(peer.id);
      } else {
        // Wait for offer from them, but we still need to initialize the RTCPeerConnection to receive
        this.getOrCreatePeer(peer.id);
      }
    }
  }

  public replaceLocalStream(newStream: MediaStream) {
    this.localStream = newStream;
    this.peers.forEach((pc) => {
      const senders = pc.getSenders();
      
      const videoTrack = newStream.getVideoTracks()[0];
      if (videoTrack) {
        const sender = senders.find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      }

      const audioTrack = newStream.getAudioTracks()[0];
      if (audioTrack) {
        const sender = senders.find(s => s.track?.kind === 'audio');
        if (sender) sender.replaceTrack(audioTrack);
      }
    });
  }

  public handleSignal(senderId: string, signal: any) {
    const pc = this.getOrCreatePeer(senderId);
    
    if (signal.type === 'offer') {
      pc.setRemoteDescription(new RTCSessionDescription(signal)).then(() => {
        return pc.createAnswer();
      }).then(answer => {
        return pc.setLocalDescription(answer);
      }).then(() => {
        this.sendSignal(senderId, pc.localDescription);
      }).catch(this.onSignalError);
    } else if (signal.type === 'answer') {
      pc.setRemoteDescription(new RTCSessionDescription(signal)).catch(this.onSignalError);
    } else if (signal.candidate) {
      pc.addIceCandidate(new RTCIceCandidate(signal)).catch(this.onSignalError);
    }
  }

  private getOrCreatePeer(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) {
      return this.peers.get(peerId)!;
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, event.candidate);
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams[0];
      this.remoteStreams.set(peerId, stream);
      if (this.onStreamAdd) this.onStreamAdd(peerId, stream);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        this.removePeer(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  private createPeerAndOffer(peerId: string) {
    const pc = this.getOrCreatePeer(peerId);
    pc.createOffer().then(offer => {
      return pc.setLocalDescription(offer);
    }).then(() => {
      this.sendSignal(peerId, pc.localDescription);
    }).catch(this.onSignalError);
  }

  private sendSignal(toId: string, signal: any) {
    const msg: MqttMessage = {
      type: 'WEBRTC_SIGNAL',
      senderId: this.myId,
      signal
    };
    this.mqttClient.publish(getPrivateTopic(toId), JSON.stringify(msg));
  }

  public removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    if (this.onStreamRemove) this.onStreamRemove(peerId);
  }

  public cleanup() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    // we don't stop the local stream tracks here in case user wants to keep camera on in prep screen
  }
}

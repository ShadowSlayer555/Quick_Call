export type AppView = 'home' | 'host_setup' | 'host_room' | 'join_setup' | 'join_list' | 'join_wait' | 'ringing' | 'in_call' | 'call_all_setup';

export interface PeerInfo {
  id: string;
  name: string;
}

export interface LocalState {
  myId: string;
  myName: string;
}

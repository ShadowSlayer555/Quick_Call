export const MQTT_BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
export const TOPIC_PREFIX = 'qc_shadow_555';

export const getDiscoverTopic = () => `${TOPIC_PREFIX}/discover`;
export const getHostsTopic = () => `${TOPIC_PREFIX}/hosts`;
export const getCallAllTopic = () => `${TOPIC_PREFIX}/call_all`;
export const getPrivateTopic = (userId: string) => `${TOPIC_PREFIX}/pvt/${userId}`;

export type MqttMessage =
  | { type: 'DISCOVER' }
  | { type: 'HOST_PONG'; hostId: string; hostName: string }
  | { type: 'CALL_ALL'; callerId: string; callerName: string }
  | { type: 'JOIN_REQUEST'; guestId: string; guestName: string }
  | { type: 'JOIN_ACCEPT'; hostId: string; hostName: string }
  | { type: 'JOIN_REJECT'; reason: string }
  | { type: 'ACCEPT_CALL_ALL'; guestId: string; guestName: string }
  | { type: 'DECLINE_CALL_ALL'; guestId: string }
  | { type: 'START_CALL'; peers: { id: string; name: string }[] }
  | { type: 'WEBRTC_SIGNAL'; senderId: string; signal: any };

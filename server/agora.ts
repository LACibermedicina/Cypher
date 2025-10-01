import AgoraToken from 'agora-token';
const { RtcTokenBuilder, RtcRole } = AgoraToken;

const AGORA_APP_ID = process.env.AGORA_APP_ID || '';
const AGORA_APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE || '';


export interface AgoraTokenConfig {
  channelName: string;
  uid: number;
  role: 'publisher' | 'subscriber';
  expirationTimeInSeconds?: number;
}

export function generateAgoraToken(config: AgoraTokenConfig): string {
  const { channelName, uid, role, expirationTimeInSeconds = 3600 } = config;
  
  if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
    throw new Error('Agora credentials not configured. Please set AGORA_APP_ID and AGORA_APP_CERTIFICATE.');
  }

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const agoraRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

  const token = RtcTokenBuilder.buildTokenWithUid(
    AGORA_APP_ID,
    AGORA_APP_CERTIFICATE,
    channelName,
    uid,
    agoraRole,
    privilegeExpiredTs,
    privilegeExpiredTs
  );

  return token;
}

export function getAgoraAppId(): string {
  return AGORA_APP_ID;
}

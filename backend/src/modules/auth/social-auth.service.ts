import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { env } from '../../config/env.js';

interface SocialUserInfo {
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  providerId: string;
}

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const appleJwksClient = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000, // 24h
});

function getAppleSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    appleJwksClient.getSigningKey(kid, (err, key) => {
      if (err) return reject(err);
      resolve(key!.getPublicKey());
    });
  });
}

export async function verifyGoogleToken(idToken: string): Promise<SocialUserInfo> {
  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Token Google invalide');
  }

  return {
    email: payload.email,
    firstName: payload.given_name || '',
    lastName: payload.family_name || '',
    avatarUrl: payload.picture,
    providerId: payload.sub,
  };
}

export async function verifyAppleToken(identityToken: string): Promise<SocialUserInfo> {
  // Décoder le header pour obtenir le kid
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || !decoded.header.kid) {
    throw new Error('Token Apple invalide');
  }

  const publicKey = await getAppleSigningKey(decoded.header.kid);

  const payload = jwt.verify(identityToken, publicKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
  }) as jwt.JwtPayload;

  if (!payload.sub) {
    throw new Error('Token Apple invalide');
  }

  return {
    email: payload.email || '',
    firstName: '',
    lastName: '',
    providerId: payload.sub,
  };
}

import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env';

const secret = new TextEncoder().encode(env.JWT_SECRET);
const ISSUER = 'api';

export type TokenType = 'access' | 'refresh';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}

/** Sign a short-lived access token or a longer-lived refresh token for this account id. */
function sign(subject: string, type: TokenType) {
  return new SignJWT({ type })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(type === 'access' ? env.JWT_ACCESS_TTL : env.JWT_REFRESH_TTL)
    .sign(secret);
}

export async function issueTokens(subject: string): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    sign(subject, 'access'),
    sign(subject, 'refresh'),
  ]);
  return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: env.JWT_ACCESS_TTL };
}

/** The account id in a valid token of this type, or null if it's invalid, expired or the wrong type. */
export async function verifyToken(token: string, type: TokenType): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { issuer: ISSUER, algorithms: ['HS256'] });
    return payload.type === type && payload.sub ? payload.sub : null;
  } catch {
    return null;
  }
}

import { UnauthorizedException } from '@nestjs/common';
import { GoogleProfile } from '../interfaces/google-profile.interface';

export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleProfile> {
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!response.ok) {
    throw new UnauthorizedException('Invalid Google credentials');
  }
  const json = await response.json();
  return {
    email: json.email,
    name: json.name ?? json.email?.split('@')[0],
    sub: json.sub,
  } as GoogleProfile;
}

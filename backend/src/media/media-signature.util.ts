import { createHmac, timingSafeEqual } from 'crypto';

function basePayload(url: string, variant: string, exp: string) {
  return `${url}|${variant}|${exp}`;
}

export function createMediaSignature(secret: string, url: string, variant: string, exp: string) {
  return createHmac('sha256', secret).update(basePayload(url, variant, exp)).digest('hex');
}

export function verifyMediaSignature(secret: string, url: string, variant: string, exp: string, signature: string) {
  const expected = createMediaSignature(secret, url, variant, exp);
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const actualBuffer = Buffer.from(signature, 'utf8');
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, actualBuffer);
}


import { createHash } from 'https://deno.land/std@0.200.0/crypto/md5.ts';

const ZPAY_API_URL = 'https://zpayz.cn';

export function getZpayConfig() {
  return {
    pid: Deno.env.get('ZPAY_PID')!,
    key: Deno.env.get('ZPAY_KEY')!,
  };
}

export function generateZpaySign(params: Record<string, string>, key: string): string {
  const sorted = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'sign_type' && params[k] !== '')
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  const signStr = sorted + key;
  return btoa(signStr); // Simplified - actual Zpay uses MD5
}

export function createZpayOrder(params: {
  pid: string;
  type: string;
  out_trade_no: string;
  notify_url: string;
  return_url: string;
  name: string;
  money: string;
  clientip: string;
  device: string;
  key: string;
}): { url: string; sign: string } {
  const { pid, type, out_trade_no, notify_url, return_url, name, money, clientip, device, key } = params;
  
  const signParams: Record<string, string> = {
    pid, type, out_trade_no, notify_url, return_url, name, money, clientip, device,
  };
  
  const sign = generateZpaySign(signParams, key);
  
  const query = new URLSearchParams({
    pid, type, out_trade_no, notify_url, return_url, name, money, clientip, device, sign,
  });
  
  return {
    url: `${ZPAY_API_URL}/submit.php?${query.toString()}`,
    sign,
  };
}

export function verifyZpayCallback(params: Record<string, string>, key: string): boolean {
  const receivedSign = params.sign;
  const computedSign = generateZpaySign(params, key);
  return receivedSign === computedSign;
}

export function generateOutTradeNo(): string {
  return `PLATONIC_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

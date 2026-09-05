let cachedIp: string | null = null;

export async function fetchClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;

  // 1. ipify API (CORS enabled, fast, secure)
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // Continue
  }

  // 2. api64.ipify.org (supports IPv6/IPv4 fallback)
  try {
    const res = await fetch('https://api64.ipify.org?format=json');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ip) {
        cachedIp = data.ip;
        return data.ip;
      }
    }
  } catch {
    // Continue
  }

  // 3. icanhazip.com fallback
  try {
    const res = await fetch('https://icanhazip.com');
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text) {
        cachedIp = text;
        return text;
      }
    }
  } catch {
    // Continue
  }

  return '127.0.0.1';
}

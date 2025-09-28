import { Request, Response, NextFunction } from 'express';

// Blocklist of suspicious user agents
const BLOCKED_USER_AGENTS = [
  // Common bots and scrapers
  'bot', 'crawler', 'spider', 'scraper',
  'python-requests', 'curl', 'wget', 'httpie',
  'postman', 'insomnia', 'apache-httpclient',

  // Malicious patterns
  'sqlmap', 'nikto', 'nmap', 'masscan',
  'zap', 'burp', 'owasp', 'nessus',

  // Automated tools
  'selenium', 'phantomjs', 'headless',
  'automated', 'script', 'test',

  // Empty or suspicious
  '', '-', 'none', 'unknown', 'mozilla/0.0',
];

// Allowlist of legitimate browser patterns
const ALLOWED_BROWSER_PATTERNS = [
  'mozilla/5.0', 'webkit', 'chrome', 'safari', 'firefox', 'edge'
];

// Rate limiting for suspicious patterns
const suspiciousIPs = new Map<string, { count: number; lastSeen: number }>();
const SUSPICIOUS_THRESHOLD = 10; // requests per minute
const SUSPICIOUS_WINDOW = 60 * 1000; // 1 minute

export function securityMiddleware(req: Request, res: Response, next: NextFunction) {
  const userAgent = req.get('User-Agent') || '';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Check if it's a legitimate browser first
  const isLegitimateBrowser = ALLOWED_BROWSER_PATTERNS.some(pattern =>
    userAgent.toLowerCase().includes(pattern.toLowerCase())
  );

  // If it's a legitimate browser, allow it
  if (isLegitimateBrowser) {
    return next();
  }

  // Check for blocked user agents
  const isBlocked = BLOCKED_USER_AGENTS.some(blocked =>
    userAgent.toLowerCase().includes(blocked.toLowerCase())
  );

  if (isBlocked) {
    console.warn(`Blocked suspicious user agent: ${userAgent} from IP: ${ip}`);
    return res.status(403).json({
      error: 'Access denied',
      code: 'BLOCKED_USER_AGENT'
    });
  }

  // Check for suspicious request patterns
  const now = Date.now();
  const ipData = suspiciousIPs.get(ip);

  if (ipData) {
    // Reset if window expired
    if (now - ipData.lastSeen > SUSPICIOUS_WINDOW) {
      suspiciousIPs.set(ip, { count: 1, lastSeen: now });
    } else {
      ipData.count++;
      ipData.lastSeen = now;

      if (ipData.count > SUSPICIOUS_THRESHOLD) {
        console.warn(`Rate limiting suspicious IP: ${ip} (${ipData.count} requests)`);
        return res.status(429).json({
          error: 'Too many requests',
          code: 'RATE_LIMITED'
        });
      }
    }
  } else {
    suspiciousIPs.set(ip, { count: 1, lastSeen: now });
  }

  // Clean up old entries periodically
  if (Math.random() < 0.01) { // 1% chance
    for (const [key, data] of suspiciousIPs.entries()) {
      if (now - data.lastSeen > SUSPICIOUS_WINDOW * 2) {
        suspiciousIPs.delete(key);
      }
    }
  }

  next();
}

// Additional security headers middleware
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy (formerly Feature Policy)
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  next();
}

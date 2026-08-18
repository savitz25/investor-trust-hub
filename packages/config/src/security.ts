export const SECURITY_HEADERS: Array<{ key: string; value: string }> = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-DNS-Prefetch-Control', value: 'off' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

export const FUTURE_UPLOAD_SECURITY_NOTES = [
  'Never request brokerage or bank credentials.',
  'Treat uploaded statements as sensitive financial documents.',
  'Store uploads outside the web root with server-generated names.',
  'Scan for malware; cap file size and allowed MIME types.',
  'Encrypt at rest when object storage is introduced.',
  'Apply Row Level Security so a user can only read their own documents.',
  'Do not log document contents, account numbers, or tax identifiers.',
  'Expire or let users delete uploads.',
] as const;

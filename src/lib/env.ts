const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

export function validateEnv() {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(
      `[ENV WARNING] Missing required environment variables:\n${missing.map(k => `  - ${k}`).join('\n')}\n` +
      `Please check your .env.local file.`
    );
  }
}

if (typeof window === 'undefined') {
  validateEnv();
}

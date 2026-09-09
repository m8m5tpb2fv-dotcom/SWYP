// Shared env config loader. Each service imports `loadEnv()` and reads what it needs.

export interface Env {
  [key: string]: string | undefined;
}

export function loadEnv(): Env {
  return process.env;
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

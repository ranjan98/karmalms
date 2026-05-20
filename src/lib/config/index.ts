/**
 * Central config loader. Every tunable comes from the environment so companies
 * configure KarmaLMS without touching code (12-factor). Import `config`
 * anywhere instead of reading `process.env` directly.
 */

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export type AuthMode = "dev" | "oidc" | "trusted-jwt" | "saml";
export type LlmMode = "bedrock" | "openai" | "none";

export const config = {
  appUrl: env("APP_URL", "http://localhost:3000"),
  databaseUrl: env("DATABASE_URL"),

  // Branding — drives the login page and shell without a fork.
  brand: {
    name: env("BRAND_NAME", "KarmaLMS"),
    logoUrl: env("BRAND_LOGO_URL", "/logo.svg"),
    primaryColor: env("BRAND_PRIMARY_COLOR", "#4f46e5"),
    supportUrl: env("BRAND_SUPPORT_URL"),
  },

  auth: {
    mode: env("AUTH_MODE", "dev") as AuthMode,
    // Signs the session cookie (HS256). Generate: openssl rand -base64 32
    sessionSecret: env("SESSION_SECRET", "dev-insecure-secret-change-me"),
    oidc: {
      issuerUrl: env("OIDC_ISSUER_URL"),
      clientId: env("OIDC_CLIENT_ID"),
      clientSecret: env("OIDC_CLIENT_SECRET"),
    },
    jwt: {
      jwksUrl: env("JWT_JWKS_URL"),
      issuer: env("JWT_ISSUER"),
      audience: env("JWT_AUDIENCE"),
    },
  },

  storage: {
    endpoint: env("S3_ENDPOINT"),
    region: env("S3_REGION", "us-east-1"),
    bucket: env("S3_BUCKET", "karmalms"),
    accessKeyId: env("S3_ACCESS_KEY_ID"),
    secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
  },

  llm: {
    mode: env("LLM_MODE", "none") as LlmMode,
    bedrock: {
      region: env("BEDROCK_REGION", "us-east-1"),
      modelId: env("BEDROCK_MODEL_ID", "anthropic.claude-sonnet-4-6"),
    },
    openai: {
      apiKey: env("OPENAI_API_KEY"),
      baseUrl: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
      model: env("OPENAI_MODEL", "gpt-4o"),
    },
  },
} as const;

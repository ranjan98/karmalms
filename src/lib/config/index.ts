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

  // Bearer token guarding /api/cron/* — unset means those endpoints are off.
  cronSecret: env("CRON_SECRET"),

  // Notifications (e.g. certification reminders) are always logged, and also
  // POSTed to this webhook when set — wire it to email, Slack, automation.
  notifications: {
    webhookUrl: env("NOTIFICATIONS_WEBHOOK_URL"),
  },

  // Directory sync — pull employees from an HRIS. mode: none | bamboohr
  directory: {
    mode: env("DIRECTORY_MODE", "none"),
    orgSlug: env("DIRECTORY_ORG_SLUG", "default"),
    bamboohr: {
      subdomain: env("BAMBOOHR_SUBDOMAIN"),
      apiKey: env("BAMBOOHR_API_KEY"),
    },
  },

  // Branding defaults — the fallback when an org has set nothing in-app.
  brand: {
    name: env("BRAND_NAME", "KarmaLMS"),
    primaryColor: env("BRAND_PRIMARY_COLOR", "#6366f1"),
    logoLight: env("BRAND_LOGO_LIGHT", env("BRAND_LOGO_URL", "/logo.svg")),
    logoDark: env("BRAND_LOGO_DARK", env("BRAND_LOGO_URL", "/logo.svg")),
    bannerLight: env("BRAND_BANNER_LIGHT"),
    bannerDark: env("BRAND_BANNER_DARK"),
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
      scopes: env("OIDC_SCOPES", "openid email profile"),
      orgSlug: env("OIDC_ORG_SLUG", "default"),
      // Emails granted the admin role on first sign-in (comma-separated).
      adminEmails: env("OIDC_ADMIN_EMAILS")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
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
      embedModelId: env("BEDROCK_EMBED_MODEL_ID", "amazon.titan-embed-text-v2:0"),
    },
    openai: {
      apiKey: env("OPENAI_API_KEY"),
      baseUrl: env("OPENAI_BASE_URL", "https://api.openai.com/v1"),
      model: env("OPENAI_MODEL", "gpt-4o"),
      embedModel: env("OPENAI_EMBED_MODEL", "text-embedding-3-small"),
    },
  },
} as const;

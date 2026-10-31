declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    AI_SETTINGS_ENCRYPTION_KEY?: string;
    ADMIN_USER_IDS?: string;
    ADMIN_EMAILS?: string;
    MOONMIND_LOCAL_MODE?: string;
  }
}

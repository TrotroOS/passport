-- User language preference for i18n

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'fr', 'pt', 'ar'));

CREATE INDEX IF NOT EXISTS idx_users_preferred_language
  ON public.users(preferred_language);

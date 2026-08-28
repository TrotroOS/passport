-- Prevent authenticated users from self-granting platform admin via profile updates.

CREATE OR REPLACE FUNCTION public.guard_platform_admin_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Platform admin status cannot be changed through the app';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_platform_admin ON public.users;
CREATE TRIGGER users_guard_platform_admin
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_platform_admin_column();

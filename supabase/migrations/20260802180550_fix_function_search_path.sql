/*
# Fix search_path on update_updated_at function

Sets a secure search_path on the trigger function to prevent search_path injection.
*/

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
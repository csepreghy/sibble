ALTER TABLE public.story_matches ADD COLUMN public_view jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.story_matches ADD COLUMN finished_at timestamptz;
ALTER TABLE public.story_match_feed ADD COLUMN finished_at timestamptz;

CREATE OR REPLACE FUNCTION public.story_matches_sync_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'finished' AND NEW.finished_at IS NULL THEN
    NEW.finished_at := COALESCE(OLD.finished_at, now());
  END IF;
  INSERT INTO public.story_match_feed AS f (match_id, player1, player2, status, version, public, updated_at, finished_at)
  VALUES (NEW.id, NEW.player1, NEW.player2, NEW.status, NEW.version, NEW.public_view, now(), NEW.finished_at)
  ON CONFLICT (match_id) DO UPDATE SET player1 = EXCLUDED.player1, player2 = EXCLUDED.player2, status = EXCLUDED.status,
    version = EXCLUDED.version, public = EXCLUDED.public, updated_at = EXCLUDED.updated_at, finished_at = EXCLUDED.finished_at
  WHERE f.version <= EXCLUDED.version;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.story_matches_sync_feed() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER story_matches_sync_feed BEFORE INSERT OR UPDATE ON public.story_matches
  FOR EACH ROW EXECUTE FUNCTION public.story_matches_sync_feed();
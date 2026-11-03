DROP TRIGGER IF EXISTS story_matches_sync_feed ON public.story_matches;
CREATE OR REPLACE FUNCTION public.story_matches_sync_feed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.story_match_feed AS f (match_id, player1, player2, status, version, public, updated_at, finished_at)
  VALUES (NEW.id, NEW.player1, NEW.player2, NEW.status, NEW.version, NEW.public_view, now(), NEW.finished_at)
  ON CONFLICT (match_id) DO UPDATE SET player1 = EXCLUDED.player1, player2 = EXCLUDED.player2, status = EXCLUDED.status,
    version = EXCLUDED.version, public = EXCLUDED.public, updated_at = EXCLUDED.updated_at, finished_at = EXCLUDED.finished_at
  WHERE f.version <= EXCLUDED.version;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.story_matches_sync_feed() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER story_matches_sync_feed AFTER INSERT OR UPDATE ON public.story_matches
  FOR EACH ROW EXECUTE FUNCTION public.story_matches_sync_feed();
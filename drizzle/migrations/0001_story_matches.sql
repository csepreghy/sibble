CREATE TABLE public.story_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player1 uuid NOT NULL,
  player2 uuid,
  status text NOT NULL DEFAULT 'waiting',
  version integer NOT NULL DEFAULT 0,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.story_matches TO service_role;
ALTER TABLE public.story_matches ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.story_matches IS 'Authoritative multiplayer Story state including private racks; server-only access.';

CREATE TABLE public.story_match_feed (
  match_id uuid PRIMARY KEY REFERENCES public.story_matches(id) ON DELETE CASCADE,
  player1 uuid NOT NULL,
  player2 uuid,
  status text NOT NULL DEFAULT 'waiting',
  version integer NOT NULL DEFAULT 0,
  public jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.story_match_feed TO authenticated;
GRANT ALL ON public.story_match_feed TO service_role;
ALTER TABLE public.story_match_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participants read story match feed" ON public.story_match_feed FOR SELECT TO authenticated
  USING (auth.uid() = player1 OR auth.uid() = player2);
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_match_feed;
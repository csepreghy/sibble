CREATE TABLE public.rematch_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  from_name TEXT NOT NULL,
  previous_game_id UUID,
  new_game_id UUID NOT NULL REFERENCES public.games ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rematch_invites TO authenticated;
GRANT ALL ON public.rematch_invites TO service_role;

ALTER TABLE public.rematch_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can view rematch invites" ON public.rematch_invites
  FOR SELECT TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "users can send rematch invites" ON public.rematch_invites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = from_user);
CREATE POLICY "participants can update rematch invites" ON public.rematch_invites
  FOR UPDATE TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user)
  WITH CHECK (auth.uid() = from_user OR auth.uid() = to_user);
CREATE POLICY "participants can delete rematch invites" ON public.rematch_invites
  FOR DELETE TO authenticated USING (auth.uid() = from_user OR auth.uid() = to_user);

ALTER TABLE public.rematch_invites REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rematch_invites;

CREATE INDEX rematch_invites_to_user_idx ON public.rematch_invites (to_user, status);
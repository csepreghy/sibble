ALTER POLICY "users create their own games" ON public.games
  WITH CHECK (auth.uid() = created_by AND auth.uid() = player1);
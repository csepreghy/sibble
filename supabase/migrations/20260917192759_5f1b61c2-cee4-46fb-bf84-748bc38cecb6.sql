DROP POLICY IF EXISTS "creators delete their games" ON public.games;
CREATE POLICY "participants can delete their games" ON public.games
FOR DELETE TO authenticated
USING (auth.uid() = created_by OR auth.uid() = player1 OR auth.uid() = player2);
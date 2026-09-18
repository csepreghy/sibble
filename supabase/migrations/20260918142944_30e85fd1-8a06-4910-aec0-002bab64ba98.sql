DROP POLICY IF EXISTS "admins can insert app settings" ON public.app_settings;
DROP POLICY IF EXISTS "admins can update app settings" ON public.app_settings;
CREATE POLICY "signed-in users can insert app settings" ON public.app_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "signed-in users can update app settings" ON public.app_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
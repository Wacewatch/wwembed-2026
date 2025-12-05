-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.third_party_apis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embed_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Third-party APIs policies (admin only for write)
CREATE POLICY "apis_select_all" ON public.third_party_apis FOR SELECT USING (true);
CREATE POLICY "apis_insert_admin" ON public.third_party_apis FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "apis_update_admin" ON public.third_party_apis FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "apis_delete_admin" ON public.third_party_apis FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Streaming links policies
CREATE POLICY "streaming_select_active" ON public.streaming_links FOR SELECT USING (is_active = true);
CREATE POLICY "streaming_insert_uploader" ON public.streaming_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'uploader'))
);
CREATE POLICY "streaming_update_own_or_admin" ON public.streaming_links FOR UPDATE USING (
  submitted_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "streaming_delete_admin" ON public.streaming_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Download links policies
CREATE POLICY "download_select_active" ON public.download_links FOR SELECT USING (is_active = true);
CREATE POLICY "download_insert_uploader" ON public.download_links FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'uploader'))
);
CREATE POLICY "download_update_own_or_admin" ON public.download_links FOR UPDATE USING (
  submitted_by = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "download_delete_admin" ON public.download_links FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Statistics tables - read for admin, insert for service role (anonymous)
CREATE POLICY "embed_views_insert_anon" ON public.embed_views FOR INSERT WITH CHECK (true);
CREATE POLICY "embed_views_select_admin" ON public.embed_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "link_clicks_insert_anon" ON public.link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "link_clicks_select_admin" ON public.link_clicks FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "api_usage_insert_anon" ON public.api_usage FOR INSERT WITH CHECK (true);
CREATE POLICY "api_usage_select_admin" ON public.api_usage FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "daily_stats_select_admin" ON public.daily_stats FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "daily_stats_insert_service" ON public.daily_stats FOR INSERT WITH CHECK (true);
CREATE POLICY "daily_stats_update_service" ON public.daily_stats FOR UPDATE USING (true);

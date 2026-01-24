-- Enable realtime for posts table to get instant status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
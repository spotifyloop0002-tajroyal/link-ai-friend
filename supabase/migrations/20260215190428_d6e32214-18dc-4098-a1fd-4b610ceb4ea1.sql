
-- Chat messages table - stores conversation history per user per agent
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  uploaded_images TEXT[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_chat_messages_user_agent ON public.chat_messages(user_id, agent_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own chat messages"
  ON public.chat_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Agent reference materials table - stores text/docs for agent learning
CREATE TABLE public.agent_reference_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'writing_sample', 'brand_guidelines', 'topic_notes')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_ref_materials_user_agent ON public.agent_reference_materials(user_id, agent_id);

ALTER TABLE public.agent_reference_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reference materials"
  ON public.agent_reference_materials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reference materials"
  ON public.agent_reference_materials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reference materials"
  ON public.agent_reference_materials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reference materials"
  ON public.agent_reference_materials FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_agent_ref_materials_updated_at
  BEFORE UPDATE ON public.agent_reference_materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, Trash2, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ReferenceMaterial {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

interface ReferenceMaterialsProps {
  agentId: string | null;
}

export const ReferenceMaterials: React.FC<ReferenceMaterialsProps> = ({ agentId }) => {
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('writing_sample');
  const [isSaving, setIsSaving] = useState(false);

  const fetchMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !agentId) return;

      const { data, error } = await supabase
        .from('agent_reference_materials')
        .select('*')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [agentId]);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Please fill in title and content');
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !agentId) throw new Error('Not authenticated');

      const { error } = await supabase.from('agent_reference_materials').insert({
        user_id: user.id,
        agent_id: agentId,
        title: title.trim(),
        content: content.trim(),
        type,
      });

      if (error) throw error;

      toast.success('Reference material added! The agent will use this to improve posts.');
      setTitle('');
      setContent('');
      setShowAdd(false);
      fetchMaterials();
    } catch (err) {
      toast.error('Failed to save reference material');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('agent_reference_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMaterials(prev => prev.filter(m => m.id !== id));
      toast.success('Material removed');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const typeLabels: Record<string, string> = {
    writing_sample: '✍️ Writing Sample',
    brand_guidelines: '📋 Brand Guidelines',
    topic_notes: '📝 Topic Notes',
    text: '📄 General Text',
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Reference Materials
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdd(!showAdd)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {showAdd && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
            <Input
              placeholder="Title (e.g., 'My LinkedIn writing style')"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-sm"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="writing_sample">✍️ Writing Sample</SelectItem>
                <SelectItem value="brand_guidelines">📋 Brand Guidelines</SelectItem>
                <SelectItem value="topic_notes">📝 Topic Notes</SelectItem>
                <SelectItem value="text">📄 General Text</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Paste your content here... (writing samples, brand voice guidelines, topic ideas, etc.)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] text-sm resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAdd} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                Save
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : materials.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            No reference materials yet. Add writing samples or guidelines to help the agent match your style.
          </p>
        ) : (
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {materials.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-2 p-2 rounded bg-muted/30 border border-border/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium truncate">{m.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {typeLabels[m.type] || m.type} · {m.content.length} chars
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-destructive/60 hover:text-destructive"
                  onClick={() => handleDelete(m.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

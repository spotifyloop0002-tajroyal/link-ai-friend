import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";

export interface Agent {
  id: string;
  user_id: string;
  name: string;
  type: string;
  is_active: boolean;
  posts_created: number;
  posts_scheduled: number;
  posts_published: number;
  success_rate: number;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface CreateAgentData {
  name: string;
  type: string;
  settings?: Json;
}

export const useAgents = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAgents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAgents([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("agents")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setAgents((data || []) as Agent[]);
    } catch (err) {
      console.error("Error fetching agents:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAgent = useCallback(async (agentData: CreateAgentData): Promise<Agent | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please log in to create an agent.",
          variant: "destructive",
        });
        return null;
      }

      const { data, error: createError } = await supabase
        .from("agents")
        .insert({
          user_id: user.id,
          name: agentData.name,
          type: agentData.type,
          settings: agentData.settings || {},
        })
        .select()
        .single();

      if (createError) throw createError;

      const newAgent = data as Agent;
      setAgents(prev => [newAgent, ...prev]);
      
      toast({
        title: "Agent created",
        description: `${newAgent.name} is ready to generate content.`,
      });

      return newAgent;
    } catch (err) {
      console.error("Error creating agent:", err);
      toast({
        title: "Failed to create agent",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  const updateAgent = useCallback(async (agentId: string, updates: Partial<Omit<Agent, 'settings'>> & { settings?: Json }): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from("agents")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", agentId);

      if (updateError) throw updateError;

      setAgents(prev => 
        prev.map(agent => 
          agent.id === agentId 
            ? { ...agent, ...updates, updated_at: new Date().toISOString() } as Agent
            : agent
        )
      );

      return true;
    } catch (err) {
      console.error("Error updating agent:", err);
      toast({
        title: "Failed to update agent",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const deleteAgent = useCallback(async (agentId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from("agents")
        .delete()
        .eq("id", agentId);

      if (deleteError) throw deleteError;

      setAgents(prev => prev.filter(agent => agent.id !== agentId));
      
      toast({
        title: "Agent deleted",
        description: "The agent has been removed.",
      });

      return true;
    } catch (err) {
      console.error("Error deleting agent:", err);
      toast({
        title: "Failed to delete agent",
        description: err instanceof Error ? err.message : "An error occurred",
        variant: "destructive",
      });
      return false;
    }
  }, [toast]);

  const toggleAgentStatus = useCallback(async (agentId: string): Promise<boolean> => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return false;

    return await updateAgent(agentId, { is_active: !agent.is_active });
  }, [agents, updateAgent]);

  const incrementAgentStats = useCallback(async (
    agentId: string, 
    stat: 'posts_created' | 'posts_scheduled' | 'posts_published'
  ): Promise<boolean> => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return false;

    const currentValue = agent[stat] || 0;
    return await updateAgent(agentId, { [stat]: currentValue + 1 });
  }, [agents, updateAgent]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return {
    agents,
    isLoading,
    error,
    fetchAgents,
    createAgent,
    updateAgent,
    deleteAgent,
    toggleAgentStatus,
    incrementAgentStats,
  };
};

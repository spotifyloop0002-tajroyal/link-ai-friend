import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate intelligent image prompt from actual post content
function generateImagePromptFromPost(postContent: string): string {
  // Extract the first meaningful line
  const lines = postContent.split('\n').filter(line => line.trim().length > 0);
  const firstLine = lines[0]?.trim() || 'Professional business content';
  
  // Clean topic: remove emojis and special characters
  const cleanTopic = firstLine
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Remove emojis
    .replace(/[^\w\s.,!?-]/g, '')
    .trim()
    .substring(0, 150);
  
  // Extract key themes from the post
  const themes: string[] = [];
  const lowerContent = postContent.toLowerCase();
  
  if (lowerContent.includes('ai') || lowerContent.includes('artificial intelligence')) {
    themes.push('artificial intelligence, neural networks');
  }
  if (lowerContent.includes('car') || lowerContent.includes('automotive') || lowerContent.includes('vehicle')) {
    themes.push('automotive industry, vehicles');
  }
  if (lowerContent.includes('tech') || lowerContent.includes('software') || lowerContent.includes('code')) {
    themes.push('technology, digital innovation');
  }
  if (lowerContent.includes('leader') || lowerContent.includes('leadership')) {
    themes.push('leadership, business excellence');
  }
  if (lowerContent.includes('health') || lowerContent.includes('medical')) {
    themes.push('healthcare, medical technology');
  }
  if (lowerContent.includes('future') || lowerContent.includes('innovation')) {
    themes.push('futuristic, cutting-edge');
  }
  if (lowerContent.includes('electric') || lowerContent.includes('ev') || lowerContent.includes('battery')) {
    themes.push('electric vehicles, sustainability');
  }
  if (lowerContent.includes('autonomous') || lowerContent.includes('self-driving')) {
    themes.push('autonomous technology, robotics');
  }
  
  const themeString = themes.length > 0 ? themes.join(', ') : 'professional business, corporate';
  
  return `Create a professional LinkedIn social media post image.
Topic: ${cleanTopic}
Visual themes: ${themeString}
Style: Modern, business professional, clean and polished design
Colors: Professional blue tones (#0A66C2), white backgrounds, subtle gradients
Layout: Clean composition with visual elements representing the topic
Format: Optimized for LinkedIn feed (1200x630 aspect ratio conceptually)
Requirements: NO TEXT OVERLAY, visually represent the concept through abstract shapes, icons, or professional imagery. Minimalist but impactful.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, postContent } = await req.json() as {
      prompt?: string;
      postContent: string;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Generate intelligent image prompt from actual post content if not provided
    const imagePrompt = prompt || generateImagePromptFromPost(postContent);

    console.log("Using image prompt:", imagePrompt.substring(0, 200));

    console.log("Generating image with prompt:", imagePrompt.substring(0, 100));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: imagePrompt
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded. Please wait a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits low. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("Image generation failed:", status, errorText);
      throw new Error(`Image generation failed: ${status}`);
    }

    const data = await response.json();
    
    // Extract image from response
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageData,
      message: "Image generated successfully!"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Generate image error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Failed to generate image" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
    themes.push('artificial intelligence, neural networks, futuristic technology');
  }
  if (lowerContent.includes('car') || lowerContent.includes('automotive') || lowerContent.includes('vehicle')) {
    themes.push('automotive industry, modern vehicles');
  }
  if (lowerContent.includes('tech') || lowerContent.includes('software') || lowerContent.includes('code')) {
    themes.push('technology, digital innovation, software');
  }
  if (lowerContent.includes('leader') || lowerContent.includes('leadership')) {
    themes.push('leadership, business excellence, professional');
  }
  if (lowerContent.includes('health') || lowerContent.includes('medical')) {
    themes.push('healthcare, medical technology');
  }
  if (lowerContent.includes('future') || lowerContent.includes('innovation')) {
    themes.push('futuristic, cutting-edge, modern');
  }
  if (lowerContent.includes('electric') || lowerContent.includes('ev') || lowerContent.includes('battery')) {
    themes.push('electric vehicles, green energy, sustainability');
  }
  if (lowerContent.includes('autonomous') || lowerContent.includes('self-driving')) {
    themes.push('autonomous technology, robotics, automation');
  }
  if (lowerContent.includes('data') || lowerContent.includes('analytics') || lowerContent.includes('dashboard')) {
    themes.push('data visualization, analytics dashboard, charts');
  }
  if (lowerContent.includes('sales') || lowerContent.includes('marketing')) {
    themes.push('sales growth, marketing, business charts');
  }
  if (lowerContent.includes('team') || lowerContent.includes('collaboration')) {
    themes.push('teamwork, collaboration, diverse professionals');
  }
  
  const themeString = themes.length > 0 ? themes.join(', ') : 'professional business, corporate';
  
  // Create a prompt optimized for Hugging Face Stable Diffusion models
  return `Professional LinkedIn post image, ${cleanTopic}, ${themeString}, modern clean design, high quality, 4k, professional photography style, corporate aesthetic, blue and white color scheme, minimalist, no text overlay`;
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

    const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    // ALWAYS generate image prompt from actual post content
    // Only use provided prompt as additional hint, not replacement
    const contentBasedPrompt = generateImagePromptFromPost(postContent || prompt || '');
    const imagePrompt = contentBasedPrompt;
    console.log("📝 Using content-based image prompt:", imagePrompt.substring(0, 200));

    let imageBase64: string | null = null;
    let imageUrl: string | null = null;

    // Try Hugging Face first if API key is available
    if (HUGGINGFACE_API_KEY) {
      console.log("🎨 Generating image with Hugging Face...");
      
      try {
        // Using Stable Diffusion XL for high quality images
        const hfResponse = await fetch(
          "https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              inputs: imagePrompt,
              parameters: {
                width: 1024,
                height: 1024,
                num_inference_steps: 30,
                guidance_scale: 7.5,
              },
            }),
          }
        );

        if (hfResponse.ok) {
          const contentType = hfResponse.headers.get("content-type");
          
          if (contentType?.includes("image")) {
            // Response is binary image data
            const arrayBuffer = await hfResponse.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Convert to base64
            let binary = '';
            for (let i = 0; i < uint8Array.length; i++) {
              binary += String.fromCharCode(uint8Array[i]);
            }
            imageBase64 = btoa(binary);
            
            console.log("✅ Hugging Face image generated successfully");
            
            // Upload to Supabase Storage for persistence
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              
              const fileName = `hf-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from("post-images")
                .upload(fileName, uint8Array, {
                  contentType: "image/png",
                  upsert: false,
                });
              
              if (!uploadError && uploadData) {
                const { data: publicUrl } = supabase.storage
                  .from("post-images")
                  .getPublicUrl(fileName);
                
                imageUrl = publicUrl.publicUrl;
                console.log("✅ Image uploaded to storage:", imageUrl);
              } else {
                console.warn("⚠️ Failed to upload to storage:", uploadError);
                // Fall back to base64 data URL
                imageUrl = `data:image/png;base64,${imageBase64}`;
              }
            } else {
              // No storage configured, use base64
              imageUrl = `data:image/png;base64,${imageBase64}`;
            }
          } else {
            // Response might be JSON (error or loading message)
            const jsonResponse = await hfResponse.json();
            console.warn("⚠️ Hugging Face returned non-image response:", jsonResponse);
            
            // Check if model is loading
            if (jsonResponse.error?.includes("loading")) {
              console.log("⏳ Model is loading, falling back to Lovable AI...");
            }
          }
        } else {
          const errorText = await hfResponse.text();
          console.error("❌ Hugging Face API error:", hfResponse.status, errorText);
          
          if (hfResponse.status === 429) {
            console.log("⚠️ Rate limited, falling back to Lovable AI...");
          }
        }
      } catch (hfError) {
        console.error("❌ Hugging Face request failed:", hfError);
      }
    }

    // Fallback to Lovable AI if Hugging Face didn't work
    if (!imageUrl && LOVABLE_API_KEY) {
      console.log("🔄 Falling back to Lovable AI Gateway...");
      
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
      imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (imageUrl) {
        console.log("✅ Lovable AI image generated successfully");
      }
    }

    if (!imageUrl) {
      console.error("❌ No image generated from any provider");
      throw new Error("Failed to generate image from any provider");
    }

    return new Response(JSON.stringify({
      success: true,
      imageUrl: imageUrl,
      provider: imageBase64 ? "huggingface" : "lovable",
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

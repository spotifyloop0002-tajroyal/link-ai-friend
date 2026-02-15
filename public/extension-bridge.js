// LinkedBot Extension Bridge v5.0
// Supports automatic analytics scraping + all v4.x features

const EXTENSION_CONFIG = {
  version: "5.0",
  supabaseUrl: "https://glrgfnqdzwbpkcsoxsgd.supabase.co",
};

window.LinkedBotBridge = {
  version: EXTENSION_CONFIG.version,

  // Called by extension when post is published successfully
  onPostPublished: function (data) {
    console.log("🔗 Bridge v5.0: Post published", data);

    window.dispatchEvent(
      new CustomEvent("linkedbot:post-published", {
        detail: {
          postId: data.postId,
          trackingId: data.trackingId,
          linkedinUrl: data.linkedinUrl,
          postedAt: data.postedAt || new Date().toISOString(),
        },
      }),
    );

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "postSuccess",
        data: {
          postId: data.postId,
          trackingId: data.trackingId,
          linkedinUrl: data.linkedinUrl,
          message: "✅ Posted successfully!",
        },
      },
      "*",
    );

    this.notifyPostSuccess(data);
  },

  // Called by extension when post fails
  onPostFailed: function (data) {
    console.log("🔗 Bridge v5.0: Post failed", data);

    window.dispatchEvent(
      new CustomEvent("linkedbot:post-failed", {
        detail: {
          postId: data.postId,
          trackingId: data.trackingId,
          error: data.error || "Unknown error",
        },
      }),
    );

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "postFailed",
        data: {
          postId: data.postId,
          trackingId: data.trackingId,
          error: data.error || "Unknown error",
          message: "❌ " + (data.error || "Post failed"),
        },
      },
      "*",
    );

    this.notifyPostFailure(data);
  },

  // Post scheduled
  onPostScheduled: function (data) {
    console.log("🔗 Bridge v5.0: Post scheduled", data);

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "postScheduled",
        data: {
          postId: data.postId,
          trackingId: data.trackingId,
          scheduledTime: data.scheduleTime,
          message: `✅ Scheduled for ${new Date(data.scheduleTime).toLocaleString()}`,
        },
      },
      "*",
    );
  },

  // Post starting
  onPostStarting: function (data) {
    console.log("🔗 Bridge v5.0: Post starting", data);

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "postStarting",
        data: {
          postId: data.postId,
          trackingId: data.trackingId,
          message: "⏰ Time to post!",
        },
      },
      "*",
    );
  },

  // Post filling
  onPostFilling: function (data) {
    console.log("🔗 Bridge v5.0: Post filling", data);

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "postFilling",
        data: {
          postId: data.postId,
          trackingId: data.trackingId,
          message: "📝 Filling content...",
        },
      },
      "*",
    );
  },

  // Queue updated
  onQueueUpdated: function (data) {
    console.log("🔗 Bridge v5.0: Queue updated", data);

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "queueUpdated",
        data: {
          queueLength: data.queueLength,
          message: `Queue: ${data.queueLength} post(s)`,
        },
      },
      "*",
    );
  },

  // Notify backend of successful post (NO user_id required)
  notifyPostSuccess: async function (data) {
    console.log("🔗 Bridge v5.0: notifyPostSuccess", data);
    try {
      const payload = {
        postId: data.postId,
        trackingId: data.trackingId,
        status: "posted",
        postedAt: data.postedAt || new Date().toISOString(),
        linkedinUrl: data.linkedinUrl,
      };

      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      console.log("🔗 Bridge v5.0: sync-post response:", result);
      return result;
    } catch (error) {
      console.error("🔗 Bridge v5.0: Failed to notify backend:", error);
      return { success: false, error: error.message };
    }
  },

  // Notify backend of failed post
  notifyPostFailure: async function (data) {
    try {
      const response = await fetch(`${EXTENSION_CONFIG.supabaseUrl}/functions/v1/sync-post`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: data.postId,
          trackingId: data.trackingId,
          status: "failed",
          lastError: data.error || "Unknown error",
        }),
      });

      const result = await response.json();
      console.log("🔗 Bridge v5.0: Backend notified of failure:", result);
    } catch (error) {
      console.error("🔗 Bridge v5.0: Failed to notify backend:", error);
    }
  },

  // v5.0 - Analytics updated (called by extension after scraping)
  onAnalyticsUpdated: function (data) {
    console.log("🔗 Bridge v5.0: Analytics updated", data);

    window.dispatchEvent(
      new CustomEvent("linkedbot:analytics-updated", {
        detail: data,
      }),
    );

    window.postMessage(
      {
        type: "EXTENSION_EVENT",
        event: "analyticsUpdated",
        data: {
          postId: data.postId,
          analytics: data.analytics,
          message: "📊 Analytics updated",
        },
      },
      "*",
    );
  },

  // v5.0 - Called by extension when it's ready for analytics scraping
  onReadyForScraping: function () {
    console.log("🔗 Bridge v5.0: Extension ready for scraping");

    window.postMessage(
      {
        type: "EXTENSION_READY_FOR_SCRAPING",
      },
      "*",
    );
  },

  // v5.0 - Called by extension with single analytics result
  onAnalyticsResult: function (data) {
    console.log("🔗 Bridge v5.0: Analytics result", data);

    window.postMessage(
      {
        type: "ANALYTICS_RESULT",
        success: data.success,
        postUrl: data.postUrl || data.url,
        analytics: data.analytics,
        error: data.error,
      },
      "*",
    );
  },

  // v5.0 - Called by extension with bulk analytics results
  onBulkAnalyticsResult: function (data) {
    console.log("🔗 Bridge v5.0: Bulk analytics result", data);

    window.postMessage(
      {
        type: "BULK_ANALYTICS_RESULT",
        success: data.success,
        results: data.results,
        total: data.total,
        successful: data.successful,
        error: data.error,
      },
      "*",
    );
  },

  // Connection status changed
  onConnectionStatusChanged: function (data) {
    console.log("🔗 Bridge v5.0: Connection status changed", data);

    window.dispatchEvent(
      new CustomEvent("linkedbot:connection-changed", {
        detail: data,
      }),
    );

    window.postMessage(
      {
        type: data.connected ? "EXTENSION_CONNECTED" : "EXTENSION_DISCONNECTED",
        extensionId: data.extensionId,
        version: this.version,
      },
      "*",
    );

    // v5.0 - If connected, also signal ready for scraping
    if (data.connected) {
      setTimeout(() => {
        this.onReadyForScraping();
      }, 1000);
    }
  },

  // Error handler
  onError: function (data) {
    console.error("🔗 Bridge v5.0: Error", data);
    window.dispatchEvent(
      new CustomEvent("linkedbot:error", {
        detail: data,
      }),
    );
  },

  getVersion: function () {
    return EXTENSION_CONFIG.version;
  },
};

// Listen for messages from webapp
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  const message = event.data;

  // POST_NOW (simplified, NO user_id)
  if (message.type === "POST_NOW") {
    console.log("🔗 Bridge v5.0: POST_NOW received", message.post);

    // Forward to extension via custom event
    window.dispatchEvent(
      new CustomEvent("linkedbot:post-now", {
        detail: {
          id: message.post.id,
          content: message.post.content,
          imageUrl: message.post.imageUrl,
        },
      }),
    );
  }

  // SCHEDULE_POSTS (simplified, NO user_id)
  if (message.type === "SCHEDULE_POSTS") {
    console.log("🔗 Bridge v5.0: SCHEDULE_POSTS received", message.posts);

    // Forward to extension via custom event
    window.dispatchEvent(
      new CustomEvent("linkedbot:schedule-posts", {
        detail: {
          posts: message.posts.map((p) => ({
            id: p.id,
            content: p.content,
            imageUrl: p.imageUrl,
            scheduleTime: p.scheduleTime,
            trackingId: p.trackingId,
          })),
        },
      }),
    );

    // Acknowledge immediately
    window.postMessage(
      {
        type: "SCHEDULE_RESULT",
        success: true,
        scheduledCount: message.posts.length,
        queueLength: message.posts.length,
      },
      "*",
    );
  }

  // CHECK_EXTENSION
  if (message.type === "CHECK_EXTENSION") {
    console.log("🔗 Bridge v5.0: CHECK_EXTENSION");

    // Check if extension has registered
    const extensionConnected = localStorage.getItem("extension_connected") === "true";
    const extensionId = localStorage.getItem("extension_id");

    window.postMessage(
      {
        type: "EXTENSION_STATUS",
        connected: extensionConnected,
        extensionId: extensionId,
      },
      "*",
    );
  }

  // CONNECT_EXTENSION
  if (message.type === "CONNECT_EXTENSION") {
    console.log("🔗 Bridge v5.0: CONNECT_EXTENSION");

    window.dispatchEvent(
      new CustomEvent("linkedbot:connect-request", {
        detail: {},
      }),
    );
  }

  // DISCONNECT_EXTENSION
  if (message.type === "DISCONNECT_EXTENSION") {
    console.log("🔗 Bridge v5.0: DISCONNECT_EXTENSION");

    localStorage.removeItem("extension_connected");
    localStorage.removeItem("extension_id");

    window.postMessage(
      {
        type: "EXTENSION_DISCONNECTED",
      },
      "*",
    );
  }

  // v5.0 - SCRAPE_ANALYTICS (single post)
  if (message.type === "SCRAPE_ANALYTICS") {
    console.log("🔗 Bridge v5.0: SCRAPE_ANALYTICS", message.postUrl);

    window.dispatchEvent(
      new CustomEvent("linkedbot:scrape-analytics", {
        detail: { postUrl: message.postUrl },
      }),
    );
  }

  // v5.0 - SCRAPE_BULK_ANALYTICS (multiple posts)
  if (message.type === "SCRAPE_BULK_ANALYTICS") {
    console.log("🔗 Bridge v5.0: SCRAPE_BULK_ANALYTICS", message.postUrls?.length, "posts");

    window.dispatchEvent(
      new CustomEvent("linkedbot:scrape-bulk-analytics", {
        detail: { postUrls: message.postUrls },
      }),
    );
  }

  // POST_RESULT — fired by webapp-content.js after background.js returns the LinkedIn URL.
  // This is where the URL actually arrives back from the extension. Route into onPostPublished.
  if (message.type === "POST_RESULT") {
    console.log("🔗 Bridge v5.0: POST_RESULT received", message);

    if (message.success && (message.linkedinUrl || message.postUrl)) {
      // ✅ Post succeeded and we have the URL — save it
      window.LinkedBotBridge.onPostPublished({
        postId: message.postId,
        linkedinUrl: message.linkedinUrl || message.postUrl,
        postedAt: new Date().toISOString(),
      });
    } else if (!message.success) {
      // ❌ Post failed
      window.LinkedBotBridge.onPostFailed({
        postId: message.postId,
        error: message.error || "Post failed",
      });
    } else {
      // Post succeeded but no URL captured — still mark as posted
      console.warn("🔗 Bridge v5.0: POST_RESULT success but no URL");
      window.LinkedBotBridge.onPostPublished({
        postId: message.postId,
        linkedinUrl: null,
        postedAt: new Date().toISOString(),
      });
    }
  }

  // ANALYTICS_RESULT — fired by webapp-content.js after scrape completes.
  // Route into onAnalyticsUpdated so the app updates the post.
  if (message.type === "ANALYTICS_RESULT") {
    console.log("🔗 Bridge v5.0: ANALYTICS_RESULT received", message);
    if (message.success && message.analytics) {
      window.LinkedBotBridge.onAnalyticsUpdated({
        postUrl: message.postUrl,
        analytics: message.analytics,
      });
    }
  }

  // BULK_ANALYTICS_RESULT — same for bulk scrape
  if (message.type === "BULK_ANALYTICS_RESULT") {
    console.log("🔗 Bridge v5.0: BULK_ANALYTICS_RESULT received", message);
    if (message.success && message.results) {
      window.LinkedBotBridge.onBulkAnalyticsResult(message);
    }
  }

  // SCAN_POSTS
  if (message.type === "SCAN_POSTS") {
    console.log("🔗 Bridge v5.0: SCAN_POSTS", message.limit);

    window.dispatchEvent(
      new CustomEvent("linkedbot:scan-posts", {
        detail: { limit: message.limit || 50 },
      }),
    );
  }

  // VERIFY_LINKEDIN_ACCOUNT — forward to extension for LinkedIn account verification
  if (message.type === "VERIFY_LINKEDIN_ACCOUNT") {
    console.log("🔗 Bridge v5.0: VERIFY_LINKEDIN_ACCOUNT", message.expectedLinkedInId);

    window.dispatchEvent(
      new CustomEvent("linkedbot:verify-account", {
        detail: { expectedLinkedInId: message.expectedLinkedInId },
      }),
    );
  }

  // VERIFY_RESULT — fired by extension after verification check
  if (message.type === "VERIFY_RESULT") {
    console.log("🔗 Bridge v5.0: VERIFY_RESULT received", message);
    // Already handled by window.postMessage — no extra routing needed
  }
});

console.log("🔗 LinkedBot Bridge v5.0 loaded (auto analytics scraping + verification)");

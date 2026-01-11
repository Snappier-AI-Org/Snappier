import { channel, topic } from "@inngest/realtime";

export const INSTAGRAM_COMMENT_REPLY_CHANNEL_NAME = "instagram-comment-reply-execution";

export const instagramCommentReplyChannel = channel(INSTAGRAM_COMMENT_REPLY_CHANNEL_NAME)
  .addTopic(
    topic("status").type<{
      nodeId: string;
      status: "loading" | "success" | "error";
    }>(),
  );


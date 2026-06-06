import Anthropic from "@anthropic-ai/sdk";

// サーバー側専用。APIキーはブラウザに渡さない。
export const anthropic = new Anthropic();

// 旅行ガイド用の既定モデル
export const MODEL = "claude-opus-4-8";

/** Message レスポンスからテキストだけを連結して取り出す */
export function extractText(message: Anthropic.Message): string {
  return message.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

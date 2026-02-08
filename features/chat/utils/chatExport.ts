"use client";

import { Chat, ChatMessage } from "../services/chatStorage";

/**
 * Format a chat conversation as Markdown
 */
export function formatChatAsMarkdown(chat: Chat): string {
  const date = new Date(chat.createdAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let md = `# ${chat.title}\n\n`;
  md += `📅 *${date}*\n\n`;
  
  if (chat.section) {
    md += `📂 Sección: ${chat.section}\n\n`;
  }
  
  md += `---\n\n`;

  chat.messages.forEach((msg: ChatMessage) => {
    const role = msg.role === "user" ? "👤 **Tú**" : "🤖 **Tutor IA**";
    md += `${role}\n\n${msg.content}\n\n---\n\n`;
  });

  return md.trim();
}

/**
 * Format a chat conversation as plain text
 */
export function formatChatAsText(chat: Chat): string {
  const date = new Date(chat.createdAt).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let text = `${chat.title}\n`;
  text += `${"=".repeat(chat.title.length)}\n\n`;
  text += `Fecha: ${date}\n`;
  
  if (chat.section) {
    text += `Sección: ${chat.section}\n`;
  }
  
  text += `\n${"-".repeat(40)}\n\n`;

  chat.messages.forEach((msg: ChatMessage) => {
    const role = msg.role === "user" ? "Tú" : "Tutor IA";
    text += `[${role}]\n${msg.content}\n\n`;
  });

  return text.trim();
}

/**
 * Download content as a file
 */
export function downloadAsFile(
  content: string,
  filename: string,
  mimeType: string = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error("Failed to copy to clipboard:", err);
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Generate a safe filename from chat title
 */
export function generateFilename(chat: Chat, extension: string): string {
  const date = new Date(chat.createdAt).toISOString().split("T")[0];
  const safeTitle = chat.title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñü\s]/gi, "")
    .replace(/\s+/g, "-")
    .slice(0, 30);
  return `chat-${safeTitle}-${date}.${extension}`;
}

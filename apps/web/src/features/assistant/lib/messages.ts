import type { UIMessage } from 'ai';

export function messageText(message: {
  parts?: { type: string; text?: string }[];
  content?: string;
}): string {
  if (message.parts) {
    return message.parts
      .filter((p) => p.type === 'text' && p.text)
      .map((p) => p.text!)
      .join('');
  }
  return typeof message.content === 'string' ? message.content : '';
}

export function boundedHistory(messages: UIMessage[]) {
  const history: { role: 'user' | 'assistant'; content: string }[] = [];
  let characters = 0;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role !== 'user' && message.role !== 'assistant') continue;
    const content = messageText(message).trim().slice(0, 4000);
    if (!content) continue;
    if (history.length === 8 || characters + content.length > 12000) break;
    history.unshift({ role: message.role, content });
    characters += content.length;
  }
  while (history[0]?.role === 'assistant') history.shift();
  return history;
}

import { MAX_COMPOSED_CHARS } from './constants.ts'
import { splitIntoMessages } from './extractor.ts'
import type { Platform } from './types.ts'

export interface ComposeChatInput {
  chat_url: string
  platform: Platform
  is_gem: boolean
  extraction_error: string | null
  extracted_text: string
}

export function composeChatsText(chats: ComposeChatInput[]): { text: string; messageCounts: number[] } {
  const parts: string[] = []
  const messageCounts: number[] = []
  let used = 0

  chats.forEach((chat, idx) => {
    const n = idx + 1
    parts.push(`--- Chat ${n} (${chat.platform}${chat.is_gem ? ', verified gem' : ''}) ---`)
    parts.push(`URL: ${chat.chat_url}`)

    if (chat.extraction_error || !chat.extracted_text) {
      parts.push(`ERROR: ${chat.extraction_error ?? 'empty extraction'}`)
      messageCounts.push(0)
      return
    }

    let count = 0
    for (const message of splitIntoMessages(chat.extracted_text, chat.platform)) {
      if (used + message.length > MAX_COMPOSED_CHARS) {
        parts.push('[truncated due to size limits]')
        break
      }
      parts.push(`[C${n}-M${count + 1}] ${message}`)
      used += message.length
      count++
    }
    messageCounts.push(count)
  })

  return { text: parts.join('\n\n'), messageCounts }
}

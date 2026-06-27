"use client";

import { useEffect, useRef } from "react";

const EMOJIS = [
  "😀", "😄", "😁", "😂", "🙂", "😉", "😊", "😍", "🤔", "😅",
  "😢", "😭", "😡", "😱", "😴", "🤝", "👍", "👎", "🙏", "👏",
  "💪", "✋", "👌", "🤷", "❤️", "💚", "💙", "⭐", "🔥", "🎉",
  "✅", "❌", "⚠️", "❓", "❗", "💰", "📦", "🚀", "⏰", "📌",
];

export function EmojiPicker({ onSelect, onClose, dark }: { onSelect: (emoji: string) => void; onClose: () => void; dark: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`absolute bottom-full left-0 mb-2 rounded-xl border p-2 shadow-xl z-10 w-64 ${dark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"}`}
    >
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map(emoji => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`text-lg p-1 rounded transition-colors ${dark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

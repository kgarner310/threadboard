'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import BanterMessage from './BanterMessage';
import { BanterMessage as BanterMessageType, Player } from '@/lib/types';

interface BanterSectionProps {
  messages: BanterMessageType[];
  players: Player[];
  onSendMessage: (playerId: string, message: string) => void;
  currentPlayerId?: string;
}

export default function BanterSection({ 
  messages, 
  players, 
  onSendMessage,
  currentPlayerId = 'demo-player-you'
}: BanterSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isExpanded) scrollToBottom();
  }, [messages, isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSendMessage(currentPlayerId, inputValue.trim());
      setInputValue('');
    }
  };

  const getPlayerInfo = (playerId: string) => {
    return players.find(p => p.id === playerId);
  };

  return (
    <div className="rounded-2xl border border-zinc-700/60 bg-zinc-900 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-3.5 border-b border-zinc-800/80 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-widest">
            Banter
          </span>
          {messages.length > 0 && (
            <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">
              {messages.length}
            </span>
          )}
        </div>
        <span className="text-zinc-500 text-xs">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>

      {/* Messages */}
      {isExpanded && (
        <div className="border-b border-zinc-800/80">
          <div className="max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-500 text-sm py-8 px-4">
                No banter yet. Start the trash talk! 💬
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/40">
                {messages.map((msg) => {
                  const player = getPlayerInfo(msg.playerId);
                  return (
                    <BanterMessage
                      key={msg.id}
                      playerName={player?.name || 'Unknown'}
                      playerEmoji={player?.avatarEmoji || '👤'}
                      message={msg.message}
                      timestamp={msg.timestamp}
                      hasScore={msg.hasScore}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="p-3 flex gap-2 bg-zinc-950/40">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Add your banter..."
            className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-white placeholder:text-zinc-500"
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
}

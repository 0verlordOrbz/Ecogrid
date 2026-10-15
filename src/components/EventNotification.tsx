import React, { useEffect, useRef } from 'react';
import { GameEvent } from '../game/types';
import { AlertCircle, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface EventNotificationProps {
  events: GameEvent[];
  onDismiss: (id: string) => void;
}

const SingleNotification: React.FC<{
  event: GameEvent;
  onDismiss: (id: string) => void;
}> = ({ event, onDismiss }) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Auto-dismiss after 4 seconds unless persistent (must be manually closed)
  useEffect(() => {
    if (event.persistent) return;

    const timer = setTimeout(() => {
      onDismissRef.current(event.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [event.id, event.persistent]);

  let icon = <Info className="w-4 h-4 text-cyan-400" />;
  let borderClass = 'border-cyan-500/30 bg-slate-950/95 text-cyan-300';
  let progressColor = 'bg-cyan-400';

  if (event.type === 'positive') {
    icon = <CheckCircle className="w-4 h-4 text-emerald-400" />;
    borderClass = 'border-emerald-500/40 bg-slate-950/95 text-emerald-300';
    progressColor = 'bg-emerald-400';
  } else if (event.type === 'warning') {
    icon = <AlertTriangle className="w-4 h-4 text-amber-400" />;
    borderClass = 'border-amber-500/40 bg-slate-950/95 text-amber-300';
    progressColor = 'bg-amber-400';
  } else if (event.type === 'critical') {
    icon = <AlertCircle className="w-4 h-4 text-rose-400" />;
    borderClass = 'border-rose-500/40 bg-slate-950/95 text-rose-300';
    progressColor = 'bg-rose-400';
  }

  return (
    <div
      onClick={() => onDismissRef.current(event.id)}
      className={`relative overflow-hidden p-3 rounded-xl border backdrop-blur-md shadow-2xl flex items-start gap-3 cursor-pointer transition-all hover:scale-[1.01] ${borderClass}`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 text-xs pr-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white block">{event.title}</span>
          {event.persistent && (
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
              Close [X]
            </span>
          )}
        </div>
        <span className="text-slate-300 leading-snug">{event.description}</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismissRef.current(event.id);
        }}
        title="Close notification"
        className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800/80 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Animated countdown bar for non-persistent notifications */}
      {!event.persistent && (
        <div
          className={`absolute bottom-0 left-0 h-0.5 w-full ${progressColor} opacity-75`}
          style={{
            animation: 'shrinkLinear 4s linear forwards',
          }}
        />
      )}
    </div>
  );
};

export const EventNotification: React.FC<EventNotificationProps> = ({
  events,
  onDismiss,
}) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Active timestamp sweeper: forces purge of any event older than 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      events.forEach((evt) => {
        if (now - evt.timestamp >= 3000) {
          onDismissRef.current(evt.id);
        }
      });
    }, 250);

    return () => clearInterval(interval);
  }, [events]);

  if (events.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes shrinkLinear {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="absolute top-20 right-4 md:right-76 z-40 flex flex-col gap-2 max-w-sm w-full pointer-events-auto select-none">
        {events.slice(-3).map((event) => (
          <SingleNotification key={event.id} event={event} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
};

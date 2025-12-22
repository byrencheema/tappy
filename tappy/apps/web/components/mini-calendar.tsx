"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MiniCalendarProps = {
  entryDates: Set<string>;
  onDateSelect?: (date: Date) => void;
  selectedDate?: Date | null;
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

export function MiniCalendar({ entryDates, onDateSelect, selectedDate }: MiniCalendarProps) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [viewDate]);

  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isCurrentMonth = viewDate.getMonth() === today.getMonth() &&
    viewDate.getFullYear() === today.getFullYear();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-foreground tracking-tight">
          {MONTHS[viewDate.getMonth()]} <span className="text-muted-foreground font-normal">{viewDate.getFullYear()}</span>
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-all"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-secondary/60 transition-all"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {DAYS.map((day, i) => (
          <div
            key={i}
            className="h-6 flex items-center justify-center text-[10px] font-semibold text-muted-foreground/50 uppercase"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((date, i) => {
          if (!date) {
            return <div key={`empty-${i}`} className="h-8" />;
          }

          const dateKey = formatDateKey(date);
          const hasEntry = entryDates.has(dateKey);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isFuture = date > today;

          return (
            <button
              key={dateKey}
              onClick={() => !isFuture && onDateSelect?.(date)}
              disabled={isFuture}
              className={`
                relative h-8 flex items-center justify-center text-[12px] rounded-lg transition-all
                ${isFuture ? "text-muted-foreground/25 cursor-default" : "hover:bg-secondary cursor-pointer"}
                ${isToday && !isSelected ? "font-bold text-primary bg-primary/5" : ""}
                ${isSelected ? "bg-primary text-primary-foreground font-semibold shadow-sm" : ""}
                ${!isToday && !isSelected && !isFuture ? "text-foreground/70 font-medium" : ""}
              `}
            >
              {date.getDate()}
              {hasEntry && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {!isCurrentMonth && (
        <button
          onClick={() => setViewDate(new Date(today.getFullYear(), today.getMonth(), 1))}
          className="mt-3 w-full text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          Back to today
        </button>
      )}
    </div>
  );
}

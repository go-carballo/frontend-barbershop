import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

type CalendarGridProps = {
  year: number;
  month: number;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDayClick?: (date: string) => void;
};

const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export const buildMonthCells = (year: number, month: number) => {
  const start = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const total = Math.ceil((start + new Date(Date.UTC(year, month + 1, 0)).getUTCDate()) / 7) * 7;
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(Date.UTC(year, month, index - start + 1));
    return { key: dateKey(date), day: date.getUTCMonth() === month ? date.getUTCDate() : null };
  });
};

export const CalendarGrid = ({
  year,
  month,
  events,
  onEventClick,
  onDayClick,
}: CalendarGridProps) => {
  const byDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  });
  const cells = buildMonthCells(year, month);
  return (
    <table
      className="w-full border-collapse text-sm"
      aria-label={`Calendario ${month + 1}/${year}`}
    >
      <thead>
        <tr>
          {weekdays.map((day) => (
            <th
              key={day}
              className="border-b border-[var(--border)] px-2 py-2 text-left text-xs text-[var(--muted-foreground)]"
            >
              {day}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: cells.length / 7 }, (_, week) => (
          <tr key={cells[week * 7].key}>
            {cells.slice(week * 7, week * 7 + 7).map((cell) => (
              <td key={cell.key} className="h-24 border-b border-[var(--border)] p-1 align-top">
                {cell.day && (
                  <>
                    <button
                      type="button"
                      aria-label={`Nuevo turno el ${cell.day}`}
                      onClick={() => onDayClick?.(cell.key)}
                      className="rounded-full px-1 text-xs font-medium hover:bg-[var(--surface-panel)]"
                    >
                      {cell.day}
                    </button>
                    <div className="space-y-1">
                      {(byDate.get(cell.key) ?? []).map((event) => (
                        <button
                          key={event.id}
                          type="button"
                          aria-label={`Ver turno ${event.time} ${event.title}`}
                          onClick={() => onEventClick?.(event)}
                          className={cn(
                            "block w-full truncate rounded border-l-2 px-1 py-0.5 text-left text-[11px]",
                            event.tone === "success" && "border-l-[var(--success)]",
                            event.tone === "warning" && "border-l-amber-500",
                            event.tone === "accent" && "border-l-[var(--accent)]",
                            event.tone === "neutral" && "border-l-[var(--muted-foreground)]",
                          )}
                        >
                          {event.time} {event.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

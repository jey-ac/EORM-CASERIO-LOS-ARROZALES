
'use client';

import * as React from "react";
import { useState, useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Calendar } from "@/components/ui/calendar";
import { Briefcase, PartyPopper, FerrisWheel } from 'lucide-react';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CalendarContext } from "@/context/CalendarContext";
import { CalendarEvent } from "@/lib/mock-data";

const categoryIcons: Record<CalendarEvent['category'], React.ReactNode> = {
  reunion: <Briefcase className="h-5 w-5" />,
  academico: <FerrisWheel className="h-5 w-5" />,
  feriado: <PartyPopper className="h-5 w-5" />,
  actividad: <FerrisWheel className="h-5 w-5" />,
};

const categoryColors: Record<CalendarEvent['category'], string> = {
  reunion: 'bg-blue-100 text-blue-800',
  academico: 'bg-purple-100 text-purple-800',
  feriado: 'bg-green-100 text-green-800',
  actividad: 'bg-yellow-100 text-yellow-800',
};

export default function StudentCalendarPage() {
  const { events } = useContext(CalendarContext);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const [isDateSelected, setIsDateSelected] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsDateSelected(!!date);
  }

  const eventsOnSelectedDate = React.useMemo(() => {
    return events.filter(
      event => format(event.date, 'yyyy-MM-dd') === (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')
    );
  }, [events, selectedDate]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const upcomingEvents = React.useMemo(() => {
    return events
      .filter(event => event.date >= startOfToday)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 5);
  }, [events]);
  
  const displayEvents = isDateSelected ? eventsOnSelectedDate : upcomingEvents;
  const eventListTitle = isDateSelected && selectedDate
    ? `Eventos para ${format(selectedDate, 'PPP', { locale: es })}`
    : 'Próximos eventos';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Calendario escolar</CardTitle>
                    <CardDescription>Consulta las fechas y eventos importantes del ciclo escolar.</CardDescription>
                </CardHeader>
                <CardContent className="w-full flex justify-center">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={handleDateSelect}
                        className="rounded-md border w-full"
                        locale={es}
                        modifiers={{
                            event: events.map(e => e.date)
                        }}
                        modifiersClassNames={{
                            event: 'day_event'
                        }}
                    />
                </CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader>
                <CardTitle>{eventListTitle}</CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {displayEvents.length > 0 ? (
                        displayEvents.map(event => (
                            <li key={event.id} className="flex items-start gap-4 p-3 rounded-lg border">
                                <div className={cn("mt-1 rounded-full p-2", categoryColors[event.category])}>
                                    {categoryIcons[event.category]}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold">{event.title}</p>
                                    {!isDateSelected && <p className="text-sm text-muted-foreground">{format(event.date, "PPP", { locale: es })}</p>}
                                    {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
                                </div>
                            </li>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para mostrar.</p>
                    )}
                </ul>
            </CardContent>
        </Card>
    </div>
  );
}

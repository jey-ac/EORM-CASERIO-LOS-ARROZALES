
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
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { PlusCircle, PenSquare, Trash2, Calendar as CalendarIcon, Briefcase, PartyPopper, FerrisWheel } from 'lucide-react';
import { CalendarEvent } from "@/lib/mock-data";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarContext } from "@/context/CalendarContext";
import { useToast } from "@/hooks/use-toast";
import { useUser, WithId } from "@/firebase";

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


export default function TeacherCalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useContext(CalendarContext);
  const { user } = useUser();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WithId<CalendarEvent> | null>(null);
  const { toast } = useToast();

  const handleAddEvent = (event: Omit<CalendarEvent, 'id'>) => {
    if (!user) return;
     try {
      addEvent(event, user.uid);
      setIsFormOpen(false);
      toast({
        title: 'Éxito',
        description: 'Evento creado exitosamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo crear el evento.',
      });
    }
  };

  const handleUpdateEvent = (updatedEvent: WithId<CalendarEvent>) => {
    try {
      updateEvent(updatedEvent);
      setIsFormOpen(false);
      setEditingEvent(null);
      toast({
        title: 'Éxito',
        description: 'Evento actualizado exitosamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo actualizar el evento.',
      });
    }
  }

  const handleDeleteEvent = (eventId: string) => {
    if (confirm('¿Está seguro de que desea eliminar este evento?')) {
       try {
            deleteEvent(eventId);
            toast({
                title: 'Éxito',
                description: 'Evento eliminado exitosamente.',
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo eliminar el evento.',
            });
        }
    }
  };

  const openEditForm = (event: WithId<CalendarEvent>) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  }

  const openCreateForm = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  }

  const [isDateSelected, setIsDateSelected] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsDateSelected(!!date);
  }
  
  const eventsOnSelectedDate = React.useMemo(() => {
    return events.filter(
      event => format(event.date, 'yyyy-MM-dd') === (selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '')
    )
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
          <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Calendario escolar</CardTitle>
              <CardDescription>Gestionar y visualizar los eventos importantes del ciclo escolar.</CardDescription>
            </div>
            <Button onClick={openCreateForm} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear evento
            </Button>
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
                    <div className="mt-2 flex gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(event)}>
                        <PenSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleDeleteEvent(event.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay eventos para mostrar.</p>
            )}
          </ul>
        </CardContent>
      </Card>
      <EventFormDialog
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
        event={editingEvent}
      />
    </div>
  );
}


function EventFormDialog({ isOpen, onClose, onSubmit, event }: { isOpen: boolean, onClose: () => void, onSubmit: (event: any) => void, event: WithId<CalendarEvent> | null }) {
    const [date, setDate] = useState<Date | undefined>(event?.date);
    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const title = formData.get('title') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as CalendarEvent['category'];
        
        if (!date) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Por favor seleccione una fecha.',
            });
            return;
        }

        const eventData = { title, description, category, date };

        if (event) {
            onSubmit({ id: event.id, ...eventData });
        } else {
            onSubmit(eventData);
        }
        onClose();
    };

    // Ensure the date state is in sync with the event prop
    React.useEffect(() => {
        setDate(event?.date);
    }, [event]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{event ? 'Editar evento' : 'Crear nuevo evento'}</DialogTitle>
                <DialogDescription>
                    {event ? 'Realice cambios en el evento aquí.' : 'Complete los detalles para crear un nuevo evento.'}
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="title">Título del evento</Label>
                    <Input id="title" name="title" defaultValue={event?.title} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP", { locale: es }) : <span>Seleccione una fecha</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            initialFocus
                            locale={es}
                        />
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Select name="category" defaultValue={event?.category} required>
                        <SelectTrigger id="category">
                        <SelectValue placeholder="Seleccione una categoría" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="reunion">Reunión</SelectItem>
                            <SelectItem value="academico">Evento académico</SelectItem>
                            <SelectItem value="feriado">Feriado</SelectItem>
                            <SelectItem value="actividad">Actividad extracurricular</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="description">Descripción (opcional)</Label>
                    <Textarea id="description" name="description" defaultValue={event?.description} />
                </div>
            </div>
            <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Guardar cambios</Button>
            </DialogFooter>
            </form>
        </DialogContent>
        </Dialog>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb } from 'lucide-react';
import { getWordOfTheDay, type WordOfTheDayResponse } from '@/app/actions/get-word-of-the-day';

export function WordOfTheDay() {
  const [data, setData] = useState<WordOfTheDayResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Definimos la función asíncrona dentro de useEffect
    const fetchWord = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const wordData = await getWordOfTheDay();
        setData(wordData);
      } catch (err: any) {
        console.error("Error fetching word of the day:", err);
        setError(err.message || 'No se pudo cargar la palabra del día.');
      } finally {
        setIsLoading(false);
      }
    };

    // Llamamos a la función
    fetchWord();
  }, []); // El array vacío asegura que se ejecute solo una vez al montar el componente

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Palabra del día
        </CardTitle>
        <CardDescription>Amplía tu vocabulario cada día.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
        ) : data ? (
          <div className="space-y-1">
            <h3 className="text-2xl font-bold capitalize">{data.word}</h3>
            <p className="pt-2">{data.definition}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

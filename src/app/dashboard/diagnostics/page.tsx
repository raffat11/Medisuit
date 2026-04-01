'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Sparkles, Loader2, AlertCircle, Terminal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  suggestDiagnosis,
  type AIDiagnosticSuggestionsInput,
  type AIDiagnosticSuggestionsOutput,
} from '@/ai/flows/ai-diagnostic-suggestions';

const FormSchema = z.object({
  patientNotes: z.string().min(50, {
    message: 'Las notas del paciente deben tener al menos 50 caracteres.',
  }),
});

export default function AiDiagnosticsPage() {
  const [result, setResult] =
    useState<AIDiagnosticSuggestionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      patientNotes: '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const input: AIDiagnosticSuggestionsInput = {
        patientNotes: data.patientNotes,
      };
      const response = await suggestDiagnosis(input);
      setResult(response);
    } catch (e) {
      setError(
        'Ocurrió un error al generar las sugerencias. Por favor, inténtalo de nuevo.'
      );
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
      <div className="mx-auto grid w-full max-w-3xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            Sugerencias de Diagnóstico con IA
          </h1>
        </div>
        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Notas del Paciente</CardTitle>
                <CardDescription>
                  Introduce notas detalladas del paciente para generar posibles
                  sugerencias de diagnóstico. Cuanto más detalle, mejores serán las sugerencias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="patientNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="sr-only">Notas del Paciente</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Ej: Paciente presenta tos seca persistente desde hace 2 semanas, acompañada de fiebre leve y fatiga. Sin antecedentes de tabaquismo..."
                          className="min-h-[150px] text-base"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Obtener Sugerencias
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Sugerencias de Diagnóstico</CardTitle>
              <CardDescription>
                Basado en las notas proporcionadas, aquí hay algunos diagnósticos potenciales
                a considerar. Esto no sustituye el juicio médico profesional.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertTitle>Resultado Generado por IA</AlertTitle>
                <AlertDescription className="prose prose-sm max-w-none text-muted-foreground">
                  <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                    {result.diagnosisSuggestions}
                  </pre>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

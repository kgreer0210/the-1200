"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { logSession } from "@/app/habits/[id]/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const LogSessionSchema = z.object({
  minutes: z.coerce.number().int().positive().max(300),
  note: z.string().max(280).optional(),
});

type LogSessionFormValues = z.infer<typeof LogSessionSchema>;

interface LogSessionFormProps {
  habitId: string;
  disabled?: boolean;
}

export function LogSessionForm({ habitId, disabled = false }: LogSessionFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<LogSessionFormValues>({
    resolver: zodResolver(LogSessionSchema),
    defaultValues: {
      minutes: 20,
      note: "",
    },
  });

  const quickMinutes = [10, 20, 30, 60];

  async function onSubmit(data: LogSessionFormValues) {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("minutes", data.minutes.toString());
      if (data.note) {
        formData.set("note", data.note);
      }

      const result = await logSession(habitId, formData);

      if (result.ok) {
        setSuccess(true);
        form.reset();
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(false), 2000);
      } else {
        setError(result.error || "Failed to log session");
      }
    });
  }

  function setQuickMinutes(minutes: number) {
    form.setValue("minutes", minutes);
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Log Session</h3>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Quick minutes buttons */}
          <div>
            <FormLabel className="mb-2 block">Quick log</FormLabel>
            <div className="flex flex-wrap gap-2">
              {quickMinutes.map((minutes) => (
                <Button
                  key={minutes}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setQuickMinutes(minutes)}
                  disabled={disabled || isPending}
                  className={cn(
                    form.watch("minutes") === minutes && "bg-primary text-primary-foreground"
                  )}
                >
                  {minutes}m
                </Button>
              ))}
            </div>
          </div>

          {/* Minutes input */}
          <FormField
            control={form.control}
            name="minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minutes</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="300"
                    disabled={disabled || isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Note input */}
          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Add a note..."
                    maxLength={280}
                    disabled={disabled || isPending}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error message */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              Session logged successfully!
            </div>
          )}

          {/* Submit button */}
          <Button type="submit" disabled={disabled || isPending} className="w-full">
            {isPending ? "Logging..." : "Log Session"}
          </Button>
        </form>
      </Form>
    </div>
  );
}


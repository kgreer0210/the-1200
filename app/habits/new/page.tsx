"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createHabit } from "@/app/habits/new/actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const CreateHabitSchema = z.object({
  title: z.string().min(1, "Title is required").max(80, "Title must be 80 characters or less"),
  target_minutes: z.coerce.number().int().positive().default(1200),
});

type CreateHabitFormValues = z.infer<typeof CreateHabitSchema>;

export default function NewHabitPage() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateHabitFormValues>({
    resolver: zodResolver(CreateHabitSchema),
    defaultValues: {
      title: "",
      target_minutes: 1200,
    },
  });

  async function onSubmit(data: CreateHabitFormValues) {
    setError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("title", data.title);
      formData.set("target_minutes", data.target_minutes.toString());

      const result = await createHabit(formData);

      if (result?.error) {
        setError(result.error);
      }
      // createHabit redirects on success
    });
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to dashboard
        </Link>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Create New Habit</h1>
        <p className="text-muted-foreground mb-6">
          Track your progress toward 1200 minutes (20 hours) of practice.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Habit Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Learn Spanish, Practice Piano"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A short name for this habit (max 80 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Minutes</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      disabled={isPending}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Total minutes to reach (default: 1200 = 20 hours)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" disabled={isPending} className="flex-1">
                {isPending ? "Creating..." : "Create Habit"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                asChild
              >
                <Link href="/">Cancel</Link>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}


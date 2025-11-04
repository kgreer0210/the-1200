"use client";

import { copy } from "@/lib/copy";

export function FAQ() {
  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">{copy.faq.title}</h2>
      <div className="space-y-6">
        {copy.faq.items.map((item, index) => (
          <div key={index}>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">{item.question}</h3>
            <p className="text-sm text-muted-foreground">{item.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}



"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Oops! Something went wrong.</h1>
      <p className="text-muted-foreground">
        We're sorry, but an error occurred while processing your request.
      </p>
      <p className="text-muted-foreground">Please try again later.</p>
      <Link href="/">
        <Button className="mt-4">Go back to the dashboard</Button>
      </Link>
    </div>
  );
}

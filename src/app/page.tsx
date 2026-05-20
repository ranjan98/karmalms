import Link from "next/link";
import { KeyRound, HardDrive, Sparkles, ArrowRight } from "lucide-react";
import { config } from "@/lib/config";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { llm } from "@/lib/llm";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

/**
 * Placeholder home page — confirms the foundation boots and shows which
 * adapters are wired up. Replaced by the real dashboard once auth lands.
 */
export default function Home() {
  const adapters = [
    {
      icon: KeyRound,
      label: "Auth",
      value: auth.name,
      desc: "Identity provider adapter",
    },
    {
      icon: HardDrive,
      label: "Storage",
      value: storage.name,
      desc: "Object storage adapter",
    },
    {
      icon: Sparkles,
      label: "LLM",
      value: llm.enabled ? llm.name : "disabled",
      desc: "AI provider adapter",
    },
  ];

  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        {config.brand.name}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Foundation is running
      </h1>
      <p className="text-muted-foreground mt-3">
        Open-source LMS for corporate training. Tailwind, the UI kit, and the
        database layer are in place — active adapters below.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {adapters.map((a) => (
          <Card key={a.label}>
            <CardHeader>
              <a.icon className="text-primary size-5" />
              <CardTitle className="mt-2 text-base">{a.label}</CardTitle>
              <CardDescription>{a.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <code className="bg-muted rounded px-2 py-1 text-sm">
                {a.value}
              </code>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href="https://github.com/ranjan98/karmalms">
            View on GitHub <ArrowRight />
          </Link>
        </Button>
        <span className="text-muted-foreground text-sm">
          Next: auth, app shell, and the course loop.
        </span>
      </div>
    </main>
  );
}

import { config } from "@/lib/config";
import { auth } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { llm } from "@/lib/llm";

/**
 * Placeholder home page — confirms the skeleton boots and shows which adapters
 * are wired up. Replace with the real dashboard as features land.
 */
export default function Home() {
  const adapters = [
    { label: "Auth", value: auth.name },
    { label: "Storage", value: storage.name },
    { label: "LLM", value: llm.enabled ? llm.name : "disabled" },
  ];

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "2rem" }}>{config.brand.name}</h1>
      <p style={{ opacity: 0.7, marginTop: ".5rem" }}>
        Open-source LMS for corporate training — skeleton is running.
      </p>

      <h2 style={{ fontSize: "1rem", marginTop: "2rem", opacity: 0.6 }}>
        Active adapters
      </h2>
      <ul style={{ listStyle: "none", marginTop: ".5rem" }}>
        {adapters.map((a) => (
          <li key={a.label} style={{ padding: ".35rem 0" }}>
            <strong>{a.label}:</strong> <code>{a.value}</code>
          </li>
        ))}
      </ul>

      <p style={{ marginTop: "2rem", opacity: 0.5, fontSize: ".9rem" }}>
        Next: build the course → assign → complete → report loop. See the
        roadmap in README.md.
      </p>
    </main>
  );
}

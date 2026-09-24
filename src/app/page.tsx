import { site } from "@/config/site";

// Placeholder until the Entrance is built in Phase 2.
export default function Home() {
  return (
    <main className="grid min-h-svh place-items-center px-4 text-center">
      <div>
        <p className="font-caps text-4xl tracking-display">{site.name}</p>
        <p className="mt-4 font-display text-xl text-ivory-muted italic">The galleries are being prepared.</p>
      </div>
    </main>
  );
}

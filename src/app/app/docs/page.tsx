import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="container mx-auto px-5 py-10 sm:p-8">
      <h1 className="mb-4 text-3xl font-bold">Documentation</h1>
      <p className="mb-6 text-muted-foreground">
        Wallet setup and trading guides are coming soon.
      </p>
      <Link href="/" className="text-primary underline-offset-4 hover:underline">
        ← Back to home
      </Link>
    </div>
  );
}

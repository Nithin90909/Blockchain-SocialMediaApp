import { Link } from "react-router-dom";
import { ArrowRight, Shield, Lock, Eye, Database } from "lucide-react";
import { Button } from "../components/ui/button";

const features = [
  {
    icon: Shield,
    title: "Blockchain Verified",
    description: "Every post is hashed and recorded on-chain, ensuring tamper-proof content ownership and integrity verification.",
  },
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "Private messages are encrypted with AES-256 before storage. Only sender and receiver can read the content.",
  },
  {
    icon: Eye,
    title: "Privacy Access Control",
    description: "Smart contracts manage content visibility. Control who sees your posts with granular permission settings.",
  },
  {
    icon: Database,
    title: "Decentralized Storage",
    description: "Media files are stored on IPFS, providing censorship-resistant and distributed content delivery.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6 lg:px-10">
        <span className="text-lg font-semibold tracking-tight">DecentraSocial</span>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="flex flex-col items-center justify-center px-6 py-20 text-center lg:py-32">
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Social media built on trust, not corporations
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            A decentralized platform where you own your data, your identity is verified by blockchain,
            and AI helps you distinguish fact from fiction.
          </p>
          <div className="mt-8 flex items-center gap-4">
            <Button size="lg" asChild>
              <Link to="/auth">
                Start building your network
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Wallet-based authentication. No tracking. No ads.
          </p>
        </section>

        <section className="border-t bg-secondary/30 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Privacy-first architecture
            </h2>
            <p className="mt-3 text-center text-muted-foreground">
              Built with a distributed architecture that puts users in control.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {features.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-lg border bg-card p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              How it works
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  1
                </div>
                <h3 className="mt-4 text-sm font-semibold">Connect Wallet</h3>
                <p className="mt-2 text-xs text-muted-foreground">Link your MetaMask wallet for cryptographic identity verification.</p>
              </div>
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  2
                </div>
                <h3 className="mt-4 text-sm font-semibold">Create Content</h3>
                <p className="mt-2 text-xs text-muted-foreground">Post content with blockchain-backed ownership proof and AI credibility scoring.</p>
              </div>
              <div>
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                  3
                </div>
                <h3 className="mt-4 text-sm font-semibold">Own Your Data</h3>
                <p className="mt-2 text-xs text-muted-foreground">Control visibility, manage access, and verify content integrity on-chain.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        DecentraSocial -- Blockchain-Based Decentralized Social Media Platform
      </footer>
    </div>
  );
}

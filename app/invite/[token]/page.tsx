"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { Users, Loader2, Check, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [householdName, setHouseholdName] = useState("");

  async function acceptInvite() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/household/invite", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setHouseholdName(data.householdName);
        // Redirect to home after 2 seconds
        setTimeout(() => router.push("/"), 2000);
      } else {
        setError(data.error || "Failed to accept invite");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border rounded-xl p-8 max-w-md w-full text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h1 className="font-semibold text-xl mb-2">Household Invite</h1>
          <p className="text-muted-foreground mb-6">
            You've been invited to join a household. Please log in or create an account to accept.
          </p>
          <div className="space-y-3">
            <Link href={`/login?callbackUrl=/invite/${token}`}>
              <Button className="w-full">
                <LogIn className="h-4 w-4 mr-2" />
                Log In
              </Button>
            </Link>
            <Link href={`/register?callbackUrl=/invite/${token}`}>
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border rounded-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="font-semibold text-xl mb-2">Welcome!</h1>
          <p className="text-muted-foreground mb-4">
            You've joined <strong>{householdName}</strong>. Redirecting...
          </p>
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="bg-card border rounded-xl p-8 max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mx-auto mb-4 flex items-center justify-center">
            <X className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="font-semibold text-xl mb-2">Invite Error</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button>Go to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="bg-card border rounded-xl p-8 max-w-md w-full text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="font-semibold text-xl mb-2">Join Household</h1>
        <p className="text-muted-foreground mb-6">
          You've been invited to share a grocery list. Would you like to join?
        </p>
        <div className="space-y-3">
          <Button onClick={acceptInvite} disabled={loading} className="w-full">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Accept Invite
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Decline
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Users, Plus, Mail, Copy, Check, Trash2, Crown, Shield, User,
  Loader2, ArrowLeft, UserPlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface HouseholdMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface HouseholdInvite {
  id: string;
  email: string;
  expiresAt: string;
}

interface Household {
  id: string;
  name: string;
  role: string;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
}

export default function HouseholdPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [newName, setNewName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchHouseholds();
    }
  }, [status, router]);

  async function fetchHouseholds() {
    try {
      const res = await fetch("/api/household");
      if (res.ok) {
        const data = await res.json();
        setHouseholds(data);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        setNewName("");
        setCreateDialogOpen(false);
        fetchHouseholds();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create household");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleInvite(e: React.FormEvent, householdId: string) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    try {
      const res = await fetch("/api/household/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId, email: inviteEmail.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setInviteLink(`${window.location.origin}${data.inviteUrl}`);
        setInviteEmail("");
        fetchHouseholds();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to send invite");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleCancelInvite(inviteId: string) {
    if (!confirm("Cancel this invite?")) return;

    const res = await fetch(`/api/household/invite?id=${inviteId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchHouseholds();
    }
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case "owner":
        return <Crown className="h-4 w-4 text-amber-500" />;
      case "admin":
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const household = households[0]; // For now, users have one household

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground">
        <div className="flex h-16 items-center gap-4 px-4 max-w-2xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-semibold text-lg">Household</h1>
            <p className="text-xs text-primary-foreground/70">
              Share your grocery list
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {!household ? (
          /* No household - show create option */
          <div className="bg-card border rounded-xl p-8 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="font-semibold text-lg mb-2">No Household Yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a household to share your grocery list with family members.
            </p>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Household
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Household</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Household Name</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., The Smiths"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          /* Has household - show members and invite */
          <>
            {/* Household Info */}
            <div className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{household.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      {household.members.length} member{household.members.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {getRoleIcon(household.role)}
                  <span className="text-sm capitalize text-muted-foreground">
                    {household.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="bg-card border rounded-xl overflow-hidden">
              <div className="p-4 border-b bg-muted/50">
                <h3 className="font-medium">Members</h3>
              </div>
              <div className="divide-y">
                {household.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.user.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {getRoleIcon(member.role)}
                      <span className="text-xs capitalize text-muted-foreground">
                        {member.role}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pending Invites */}
            {household.invites.length > 0 && (
              <div className="bg-card border rounded-xl overflow-hidden">
                <div className="p-4 border-b bg-muted/50">
                  <h3 className="font-medium">Pending Invites</h3>
                </div>
                <div className="divide-y">
                  {household.invites.map((invite) => (
                    <div key={invite.id} className="flex items-center gap-3 p-4">
                      <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                        <Mail className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{invite.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      {["owner", "admin"].includes(household.role) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleCancelInvite(invite.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Invite Button */}
            {["owner", "admin"].includes(household.role) && (
              <Dialog open={inviteDialogOpen} onOpenChange={(open) => {
                setInviteDialogOpen(open);
                if (!open) {
                  setInviteLink("");
                  setInviteEmail("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                  </DialogHeader>
                  {inviteLink ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Share this link with your family member:
                      </p>
                      <div className="flex gap-2">
                        <Input value={inviteLink} readOnly className="text-sm" />
                        <Button onClick={copyInviteLink} variant="outline">
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setInviteLink("");
                          setInviteEmail("");
                        }}
                      >
                        Invite Another
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleInvite(e, household.id)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="family@example.com"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={inviting}>
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Mail className="h-4 w-4 mr-2" />
                        )}
                        Send Invite
                      </Button>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            )}
          </>
        )}
      </main>
    </div>
  );
}

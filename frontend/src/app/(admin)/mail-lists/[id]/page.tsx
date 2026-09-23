"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Trash2,
  MailPlus,
  Pencil,
} from "lucide-react";
import { emailListsService } from "@/services/email-lists";
import { recipientsService } from "@/services/recipients";
import type { RecipientType } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function EmailListDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("TO");
  const [role, setRole] = useState("");
  const [position, setPosition] = useState("FIRST");
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState("");
  const [draftType, setDraftType] = useState<RecipientType>("TO");
  const [editPosition, setEditPosition] = useState("KEEP");

  const { data: list, isLoading } = useQuery({
    queryKey: ["email-list", id],
    queryFn: () => emailListsService.get(id),
  });

  const { data: recipients } = useQuery({
    queryKey: ["recipients", "all"],
    queryFn: () => recipientsService.list({ limit: 200 }),
    enabled: addOpen,
  });

  const addMutation = useMutation({
    mutationFn: (payload: {
      recipientId: string;
      recipientType: RecipientType;
      role?: string;
      beforeRecipientId?: string;
      afterRecipientId?: string;
    }) => emailListsService.addRecipient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-list", id] });
      setAddOpen(false);
      setRecipientId("");
      setRole("");
      setPosition("FIRST");
    },
    onError: (e: Error) => setError(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (recipientId: string) =>
      emailListsService.removeRecipient(id, recipientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-list", id] }),
    onError: (e: Error) => window.alert(e.message),
  });

  const updateTypeMutation = useMutation({
    mutationFn: ({
      recipientId,
      recipientType,
      role,
      beforeRecipientId,
      afterRecipientId,
    }: {
      recipientId: string;
      recipientType?: RecipientType;
      role?: string;
      beforeRecipientId?: string;
      afterRecipientId?: string;
    }) =>
      emailListsService.updateRecipientType(id, recipientId, {
        recipientType,
        role,
        beforeRecipientId,
        afterRecipientId,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-list", id] }),
    onError: (e: Error) => window.alert(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Loading list..." />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <PageHeader title="Email List not found">
          <Button variant="outline" asChild>
            <Link href="/mail-lists">
              <ArrowLeft className="h-4 w-4" />
              Back to lists
            </Link>
          </Button>
        </PageHeader>
      </div>
    );
  }

  const members = list.recipients ?? [];
  const available = (recipients?.recipients ?? []).filter(
    (r) => !members.some((m) => m.recipientId === r.id) && r.status === "ACTIVE",
  );
  const editingMember = members.find((m) => m.id === editingId) ?? null;

  return (
    <div>
      <PageHeader
        title={list.name}
        description={
          <>
            <span className="font-mono">{list.code}</span> ·{" "}
            {list.application?.code ?? "—"} ·{" "}
            {list.description ?? "No description"}
          </>
        }
      >
        <Button variant="outline" asChild>
          <Link href="/mail-lists">
            <ArrowLeft className="h-4 w-4" />
            Back to lists
          </Link>
        </Button>
        <Button onClick={() => {
          setError(null);
          setRecipientId("");
          setRole("");
          setPosition("FIRST");
          setAddOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          Add Recipient
        </Button>
      </PageHeader>

      <div className="mb-4 flex items-center gap-2">
        <Badge variant={list.status === "ACTIVE" ? "success" : "muted"}>
          {list.status}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {members.length} recipient{members.length === 1 ? "" : "s"}
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Integration endpoint</CardTitle>
          <CardDescription>
            External applications can resolve this list with their API key.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <code className="block break-all rounded-md bg-muted p-3 font-mono text-xs">
            GET /api/email-lists/{list.application?.code ?? "<APP>"}/
            {list.code}
          </code>
          <code className="block break-all rounded-md bg-muted p-3 font-mono text-xs">
            Header: X-API-KEY: your_api_key
          </code>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-44">Role</TableHead>
                <TableHead className="w-40">Type</TableHead>
                <TableHead className="w-16">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.recipient.name}</TableCell>
                  <TableCell className="text-sm">{m.recipient.email}</TableCell>
                  <TableCell>
                    {m.role ? (
                      <span className="text-sm">{m.role}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{m.recipientType}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${m.recipient.name}`}
onClick={() => {
                            setDraftRole(m.role ?? "");
                            setDraftType(m.recipientType);
                            setEditPosition("KEEP");
                            setEditingId(m.id);
                            setEditOpen(true);
                          }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${m.recipient.name} from list`}
                        onClick={() => removeMutation.mutate(m.recipientId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {members.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No recipients in this list yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recipient</DialogTitle>
            <DialogDescription>
              Add a recipient to this email list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Position</p>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {members.length === 0 && (
                      <SelectItem value="FIRST">At top</SelectItem>
                    )}
                    {members.length > 0 && (
                      <>
                        <SelectItem value="FIRST">At top</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={`before-${m.id}`} value={`BEFORE:${m.id}`}>
                            Before {m.recipient.name}
                          </SelectItem>
                        ))}
                        {members.map((m) => (
                          <SelectItem key={`after-${m.id}`} value={`AFTER:${m.id}`}>
                            After {m.recipient.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="LAST">At end</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Recipient</p>
                <Select value={recipientId} onValueChange={setRecipientId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} · {r.email}
                      </SelectItem>
                    ))}
                    {available.length === 0 && (
                      <SelectItem value="__none" disabled>
                        No available recipients
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Type</p>
                <Select
                  value={recipientType}
                  onValueChange={(v) => setRecipientType(v as RecipientType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TO">TO</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="BCC">BCC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Role</p>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. APPROVER"
                />
              </div>
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const payload: {
                    recipientId: string;
                    recipientType: RecipientType;
                    role?: string;
                    beforeRecipientId?: string;
                    afterRecipientId?: string;
                  } = {
                    recipientId,
                    recipientType,
                    role: role.trim() || undefined,
                  };
                  if (position === "FIRST" && members.length > 0) {
                    payload.beforeRecipientId = members[0].id;
                  } else if (position === "LAST" && members.length > 0) {
                    payload.afterRecipientId = members[members.length - 1].id;
                  } else if (position.startsWith("BEFORE:")) {
                    payload.beforeRecipientId = position.slice("BEFORE:".length);
                  } else if (position.startsWith("AFTER:")) {
                    payload.afterRecipientId = position.slice("AFTER:".length);
                  }
                  addMutation.mutate(payload);
                }}
                disabled={!recipientId || addMutation.isPending}
              >
                {addMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                <MailPlus className="h-4 w-4" />
                Add
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Recipient</DialogTitle>
            <DialogDescription>
              {editingMember
                ? `${editingMember.recipient.name} · ${editingMember.recipient.email}`
                : "Editing recipient"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Role</p>
              <Input
                value={draftRole}
                onChange={(e) => setDraftRole(e.target.value)}
                placeholder="e.g. APPROVER"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Type</p>
                <Select
                  value={draftType}
                  onValueChange={(v) => setDraftType(v as RecipientType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TO">TO</SelectItem>
                    <SelectItem value="CC">CC</SelectItem>
                    <SelectItem value="BCC">BCC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Position</p>
                <Select value={editPosition} onValueChange={setEditPosition}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="KEEP">Keep position</SelectItem>
                    {members
                      .filter((m) => m.id !== editingId)
                      .map((m) => (
                        <SelectItem key={`edit-before-${m.id}`} value={`BEFORE:${m.id}`}>
                          Before {m.recipient.name}
                        </SelectItem>
                      ))}
                    {members
                      .filter((m) => m.id !== editingId)
                      .map((m) => (
                        <SelectItem key={`edit-after-${m.id}`} value={`AFTER:${m.id}`}>
                          After {m.recipient.name}
                        </SelectItem>
                      ))}
                    <SelectItem value="FIRST">At top</SelectItem>
                    <SelectItem value="LAST">At end</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!editingMember) return;
                  const payload: {
                    recipientType?: RecipientType;
                    role?: string;
                    beforeRecipientId?: string;
                    afterRecipientId?: string;
                  } = {};
                  const nextRole = draftRole.trim();
                  if (nextRole !== (editingMember.role ?? "")) {
                    payload.role = nextRole || undefined;
                  }
                  if (draftType !== editingMember.recipientType) {
                    payload.recipientType = draftType;
                  }
                  const otherMembers = members.filter((m) => m.id !== editingId);
                  if (editPosition === "FIRST" && otherMembers.length > 0) {
                    payload.beforeRecipientId = otherMembers[0].id;
                  } else if (editPosition === "LAST" && otherMembers.length > 0) {
                    payload.afterRecipientId = otherMembers[otherMembers.length - 1].id;
                  } else if (editPosition.startsWith("BEFORE:")) {
                    payload.beforeRecipientId = editPosition.slice("BEFORE:".length);
                  } else if (editPosition.startsWith("AFTER:")) {
                    payload.afterRecipientId = editPosition.slice("AFTER:".length);
                  }
                  if (Object.keys(payload).length > 0) {
                    updateTypeMutation.mutate({
                      recipientId: editingMember.recipientId,
                      ...payload,
                    });
                  }
                  setEditOpen(false);
                }}
                disabled={updateTypeMutation.isPending}
              >
                {updateTypeMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
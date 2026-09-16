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

export default function EmailListDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const queryClient = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType>("TO");
  const [priority, setPriority] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

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
    mutationFn: (payload: { recipientId: string; recipientType: RecipientType; priority: number }) =>
      emailListsService.addRecipient(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-list", id] });
      setAddOpen(false);
      setRecipientId("");
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
    }: {
      recipientId: string;
      recipientType: RecipientType;
    }) => emailListsService.updateRecipientType(id, recipientId, { recipientType }),
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
            <Link href="/email-lists">
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
          <Link href="/email-lists">
            <ArrowLeft className="h-4 w-4" />
            Back to lists
          </Link>
        </Button>
        <Button onClick={() => { setError(null); setAddOpen(true); }}>
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
                <TableHead className="w-40">Type</TableHead>
                <TableHead className="w-24">Priority</TableHead>
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
                    <Select
                      value={m.recipientType}
                      onValueChange={(v) =>
                        updateTypeMutation.mutate({
                          recipientId: m.recipientId,
                          recipientType: v as RecipientType,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TO">TO</SelectItem>
                        <SelectItem value="CC">CC</SelectItem>
                        <SelectItem value="BCC">BCC</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.priority}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${m.recipient.name} from list`}
                      onClick={() => removeMutation.mutate(m.recipientId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                <p className="text-sm font-medium">Priority</p>
                <Select
                  value={String(priority)}
                  onValueChange={(v) => setPriority(Number(v))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3].map((p) => (
                      <SelectItem key={p} value={String(p)}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                onClick={() =>
                  addMutation.mutate({
                    recipientId,
                    recipientType,
                    priority,
                  })
                }
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
    </div>
  );
}
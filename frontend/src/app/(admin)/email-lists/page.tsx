"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Plus, Pencil, Power, Loader2, Eye } from "lucide-react";
import { emailListsService } from "@/services/email-lists";
import { applicationsService } from "@/services/applications";
import { emailListSchema, type EmailListInput } from "@/validations";
import type { EmailList } from "@/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
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

export default function EmailListsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EmailList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applicationFilter, setApplicationFilter] = useState("");

  const { data: applications } = useQuery({
    queryKey: ["applications"],
    queryFn: applicationsService.list,
  });

  const { data: lists, isLoading } = useQuery({
    queryKey: ["email-lists", applicationFilter],
    queryFn: () => emailListsService.list(applicationFilter || undefined),
  });

  const createMutation = useMutation({
    mutationFn: emailListsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<EmailListInput> }) =>
      emailListsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-lists"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: emailListsService.toggleStatus,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["email-lists"] }),
    onError: (e: Error) => window.alert(e.message),
  });

  const form = useForm<EmailListInput>({
    resolver: zodResolver(emailListSchema),
    defaultValues: { applicationId: "", code: "", name: "", description: "" },
  });

  const applicationId = useWatch({ control: form.control, name: "applicationId" });

  function openCreate() {
    setEditing(null);
    setError(null);
    form.reset({
      applicationId: applications?.[0]?.id || "",
      code: "",
      name: "",
      description: "",
    });
    setDialogOpen(true);
  }

  function openEdit(list: EmailList) {
    setEditing(list);
    setError(null);
    form.reset({
      applicationId: list.applicationId,
      code: list.code,
      name: list.name,
      description: list.description ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: EmailListInput) {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const busy = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <PageHeader
        title="Email Lists"
        description="Named recipient groups an application can resolve"
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Email List
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Select
          value={applicationFilter}
          onValueChange={setApplicationFilter}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All applications" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Application</SelectLabel>
              <SelectItem value="">All applications</SelectItem>
              {applications?.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Application</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {lists?.map((list) => (
                <TableRow key={list.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {list.code}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/email-lists/${list.id}`}
                      className="hover:underline"
                    >
                      {list.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {list.application?.code ?? "—"}
                  </TableCell>
                  <TableCell>{list._count?.recipients ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={list.status === "ACTIVE" ? "success" : "muted"}>
                      {list.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`View ${list.name}`}
                        asChild
                      >
                        <Link href={`/email-lists/${list.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${list.name}`}
                        onClick={() => openEdit(list)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={
                          list.status === "ACTIVE" ? "Deactivate" : "Activate"
                        }
                        title={list.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        onClick={() => toggleMutation.mutate(list.id)}
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && lists?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No email lists found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Email List" : "Create Email List"}
            </DialogTitle>
            <DialogDescription>
              Define a named list of recipients for an application.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!editing && (
              <div className="space-y-2">
                <Label>Application</Label>
                <Select
                  value={applicationId || ""}
                  onValueChange={(v) => form.setValue("applicationId", v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select an application" />
                  </SelectTrigger>
                  <SelectContent>
                    {applications
                      ?.filter((a) => a.status === "ACTIVE")
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} · {a.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.applicationId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.applicationId.message}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="MEDICAL_CLAIM_APPROVERS"
                disabled={!!editing}
                {...form.register("code")}
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.code.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Medical Claim Approvers"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description"
                {...form.register("description")}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
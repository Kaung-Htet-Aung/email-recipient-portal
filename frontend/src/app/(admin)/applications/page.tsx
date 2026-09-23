"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Plus, KeyRound, Pencil, Power, Loader2 } from "lucide-react";
import { applicationsService } from "@/services/applications";
import { credentialsService } from "@/services/dashboard";
import { applicationSchema, type ApplicationInput } from "@/validations";
import type { Application } from "@/types";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [credentialsFor, setCredentialsFor] = useState<Application | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [credentialName, setCredentialName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: applications, isLoading } = useQuery({
    queryKey: ["applications"],
    queryFn: applicationsService.list,
  });

  const { data: credentials, refetch: refetchCredentials, isFetching: fetchingCreds } =
    useQuery({
      queryKey: ["credentials", credentialsFor?.id],
      queryFn: () => credentialsService.list(credentialsFor?.id),
      enabled: !!credentialsFor,
    });

  const createMutation = useMutation({
    mutationFn: applicationsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ApplicationInput> }) =>
      applicationsService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      setDialogOpen(false);
    },
    onError: (e: Error) => setError(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: applicationsService.toggleStatus,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["applications"] }),
    onError: (e: Error) => window.alert(e.message),
  });

  const generateCredential = useMutation({
    mutationFn: ({ applicationId, name }: { applicationId: string; name: string }) =>
      credentialsService.generate(applicationId, { name }),
    onSuccess: (res) => {
      setGeneratedKey(res.apiKey ?? null);
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const revokeCredential = useMutation({
    mutationFn: credentialsService.revoke,
    onSuccess: () => {
      refetchCredentials();
      queryClient.invalidateQueries({ queryKey: ["credentials"] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const form = useForm<ApplicationInput>({
    resolver: zodResolver(applicationSchema),
    defaultValues: { code: "", name: "", description: "" },
  });

  function openCreate() {
    setEditing(null);
    setError(null);
    form.reset({ code: "", name: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(app: Application) {
    setEditing(app);
    setError(null);
    form.reset({
      code: app.code,
      name: app.name,
      description: app.description ?? "",
    });
    setDialogOpen(true);
  }

  function onSubmit(values: ApplicationInput) {
    setError(null);
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: values });
    } else {
      createMutation.mutate(values);
    }
  }

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    generateCredential.isPending;

  return (
    <div>
      <PageHeader
        title="Applications"
        description="External applications that consume the email recipient API"
      >
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Application
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email Lists</TableHead>
                <TableHead>Credentials</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {applications?.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {app.code}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{app.name}</div>
                    {app.description && (
                      <div className="text-xs text-muted-foreground">
                        {app.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{app._count?.emailLists ?? 0}</TableCell>
                  <TableCell>{app._count?.credentials ?? 0}</TableCell>
                  <TableCell>
                    <Badge variant={app.status === "ACTIVE" ? "success" : "muted"}>
                      {app.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setCredentialsFor(app);
                          setGeneratedKey(null);
                          setCredentialName(app.code + "_APP_PRIMARY");
                          setError(null);
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                        Credentials
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${app.name}`}
                        onClick={() => openEdit(app)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={app.status === "ACTIVE" ? "Deactivate" : "Activate"}
                        onClick={() =>
                          toggleMutation.mutate(app.id)
                        }
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && applications?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No applications found. Create one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Application" : "Create Application"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Update application details."
                : "Register a new external application with the portal."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="MEDICAL"
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
                placeholder="Medical Benefit Application"
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
                placeholder="What does this application do?"
                {...form.register("description")}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
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

      {/* Credentials dialog */}
      <Dialog
        open={!!credentialsFor}
        onOpenChange={(open) => {
          if (!open) setCredentialsFor(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Application Credentials · {credentialsFor?.code}
            </DialogTitle>
            <DialogDescription>
              API keys used by the application to authenticate against the
              integration endpoint. Keys are scoped to{" "}
              <span className="font-mono">{credentialsFor?.code}</span> only.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label htmlFor="cred-name">Credential name</Label>
              <Input
                id="cred-name"
                placeholder="MEDICAL_APP_PRIMARY"
                className="mt-2"
                value={credentialName}
                onChange={(e) => setCredentialName(e.target.value)}
              />
            </div>
            <Button
              onClick={() =>
                generateCredential.mutate({
                  applicationId: credentialsFor!.id,
                  name: credentialName.trim() || credentialsFor!.code + "_APP_PRIMARY",
                })
              }
              disabled={busy || !credentialsFor}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate API key
            </Button>
          </div>

          {generatedKey && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:bg-amber-950/50">
              <p className="mb-1 text-xs font-semibold text-amber-800 dark:text-amber-300">
                Copy this API key now. It will not be shown again.
              </p>
              <code className="break-all font-mono text-xs">{generatedKey}</code>
            </div>
          )}

          {error && (
            <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {fetchingCreds ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials?.map((cred) => (
                  <TableRow key={cred.id}>
                    <TableCell className="font-medium">{cred.name}</TableCell>
                    <TableCell>
                      <Badge variant={cred.status === "ACTIVE" ? "success" : "muted"}>
                        {cred.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(cred.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revokeCredential.isPending}
                        onClick={() => revokeCredential.mutate(cred.id)}
                      >
                        <Power className="h-4 w-4" />
                        {cred.status === "ACTIVE" ? "Revoke" : "Restore"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {credentials?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      No credentials yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
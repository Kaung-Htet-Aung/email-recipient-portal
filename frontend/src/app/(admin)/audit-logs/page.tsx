"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { auditService } from "@/services/audit";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 20;

const ACTION_MAP: Record<string, string> = {
  CREATE: "bg-green-500/10 text-green-600",
  UPDATE: "bg-blue-500/10 text-blue-600",
  DELETE: "bg-red-500/10 text-red-600",
  TOGGLE_STATUS: "bg-amber-500/10 text-amber-600",
  LOGIN: "bg-indigo-500/10 text-indigo-600",
  GENERATE_API_KEY: "bg-violet-500/10 text-violet-600",
  REVOKE_API_KEY: "bg-orange-500/10 text-orange-600",
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: () => auditService.list({ page, limit: PAGE_SIZE }),
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="A record of administrative actions in the portal"
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              {data?.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.user ? (
                      <>
                        <span className="font-medium">{log.user.name}</span>
                        <span className="text-muted-foreground"> · {log.user.email}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                        ACTION_MAP[log.action] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {log.entityType}
                    {log.entityId && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {" "}
                        (#{log.entityId.slice(0, 8)})
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.newValue !== undefined && log.newValue !== null && (
                      <pre className="truncate rounded bg-muted p-1 font-mono text-xs">
                        {JSON.stringify(log.newValue)}
                      </pre>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (data?.logs.length ?? 0) === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No audit logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data?.total ?? 0} log{data?.total === 1 ? "" : "s"}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          </div>
        )}
      </div>
    </div>
  );
}
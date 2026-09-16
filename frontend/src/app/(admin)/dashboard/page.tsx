"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  ListOrdered,
  Users,
  Building2,
  MailCheck,
  MailX,
  UserX,
  UserCheck,
} from "lucide-react";
import { dashboardService } from "@/services/dashboard";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardService.getStats,
  });

  if (isLoading || !data) {
    return <DashboardSkeleton />;
  }

  const stats = [
    { label: "Applications", value: data.counts.applications, icon: Boxes },
    { label: "Email Lists", value: data.counts.emailLists, icon: ListOrdered },
    { label: "Recipients", value: data.counts.recipients, icon: Users },
    { label: "Departments", value: data.counts.departments, icon: Building2 },
    { label: "Active Lists", value: data.counts.activeLists, icon: MailCheck },
    { label: "Inactive Lists", value: data.counts.inactiveLists, icon: MailX },
    { label: "Active Recipients", value: data.counts.activeRecipients, icon: UserCheck },
    { label: "Inactive Recipients", value: data.counts.inactiveRecipients, icon: UserX },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of applications, recipients and email lists"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Email Lists</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recentLists.map((list) => (
                <li
                  key={list.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{list.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {list.application?.code} · {list.code}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {list._count?.recipients ?? 0} recipients
                  </span>
                </li>
              ))}
              {data.recentLists.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No email lists created yet.
                </p>
              )}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recentRecipients.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.department?.name ?? "No department"}
                  </span>
                </li>
              ))}
              {data.recentRecipients.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No recipients created yet.
                </p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="space-y-2 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-12" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
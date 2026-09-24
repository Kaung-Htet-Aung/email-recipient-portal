"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import Image from "next/image";
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r bg-card md:flex md:flex-col ">
      <div className="flex h-14 items-center gap-2 border-b px-4 ">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#006838] text-primary-foreground">
          <Image src='/images/logo.png' alt="logo" width={100} height={100}/>
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Workflow System</p>
        
        </div>
      </div>    
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-gray-500 text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        Central recipient configuration
      </div>
    </aside>
  );
}
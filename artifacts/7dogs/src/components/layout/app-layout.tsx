import { ReactNode } from "react";
import { BottomNav } from "./bottom-nav";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex justify-center bg-black dark text-foreground">
      <div className="w-full max-w-[375px] bg-background relative flex flex-col min-h-[100dvh] shadow-2xl shadow-primary/10 overflow-hidden border-x border-primary/10">
        
        {/* Background glow effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex-1 overflow-y-auto pb-24 relative z-10 scrollbar-hide">
          {children}
        </div>
        
        <BottomNav />
      </div>
    </div>
  );
}

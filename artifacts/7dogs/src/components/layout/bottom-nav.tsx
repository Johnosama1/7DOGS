import { Link, useLocation } from "wouter";
import { CircleDot, Users, Gift, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/user-context";

export function BottomNav() {
  const [location] = useLocation();
  const { user } = useUser();
  const isAdmin = user?.username === "J_O_H_N8" || user?.username === "demo_user"; // For demo purposes

  const navItems = [
    { href: "/", label: "Wheel", icon: CircleDot },
    { href: "/referrals", label: "Referrals", icon: Users },
    { href: "/gifts", label: "Gifts", icon: Gift },
    { href: "/account", label: "Account", icon: UserRound },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center w-full bg-background/80 backdrop-blur-xl border-t border-primary/20 pb-safe">
      <div className="flex w-full max-w-[375px] justify-around items-center px-2 py-3">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 cursor-pointer",
                isActive ? "text-primary gold-text-glow" : "text-muted-foreground hover:text-primary/60"
              )}>
                <Icon size={24} className={cn(isActive && "gold-glow rounded-full p-0.5")} />
                <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

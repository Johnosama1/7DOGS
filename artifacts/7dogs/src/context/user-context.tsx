import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";

interface TelegramUserData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

interface TelegramInitData {
  user: TelegramUserData | null;
  startParam: string | null;
}

function readTelegramData(): TelegramInitData {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return { user: null, startParam: null };
    const u = tg.initDataUnsafe?.user;
    const startParam = tg.initDataUnsafe?.start_param ?? null;
    const user = u?.id
      ? {
          id: String(u.id),
          firstName: u.first_name ?? "",
          lastName: u.last_name ?? "",
          username: u.username ?? "",
        }
      : null;
    return { user, startParam };
  } catch {
    return { user: null, startParam: null };
  }
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  telegramId: string;
  isReady: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  // Lazy init — reads Telegram data synchronously on first render
  const [tgData, setTgData] = useState<TelegramInitData>(() =>
    readTelegramData()
  );

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready?.();
      tg.expand?.();
    }

    // Re-read in case SDK wasn't ready on first render
    if (!tgData.user) {
      const data = readTelegramData();
      if (data.user) setTgData(data);
    }
  }, []);

  const tgUser = tgData.user;
  const telegramId = tgUser?.id ?? "";
  const isReady = !!telegramId;

  const { data: user, isLoading } = useGetMe(
    {
      telegramId,
      firstName: tgUser?.firstName ?? "User",
      lastName: tgUser?.lastName ?? "",
      username: tgUser?.username ?? "",
      // Pass start_param so referral is recorded when new user arrives via link
      referralCode: tgData.startParam ?? undefined,
    },
    { query: { enabled: isReady } as never }
  );

  return (
    <UserContext.Provider value={{ user: user || null, isLoading, telegramId, isReady }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

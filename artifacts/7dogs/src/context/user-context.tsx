import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";

interface TelegramUserData {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
}

function readTelegramUser(): TelegramUserData | null {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return null;
    const user = tg.initDataUnsafe?.user;
    if (!user?.id) return null;
    return {
      id: String(user.id),
      firstName: user.first_name ?? "",
      lastName: user.last_name ?? "",
      username: user.username ?? "",
    };
  } catch {
    return null;
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
  const [tgUser, setTgUser] = useState<TelegramUserData | null>(() =>
    readTelegramUser()
  );

  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      // Signal to Telegram that the Mini App is ready
      tg.ready?.();
      // Expand to full screen
      tg.expand?.();
    }

    // Re-read in case SDK wasn't ready on first render
    if (!tgUser) {
      const user = readTelegramUser();
      if (user) setTgUser(user);
    }
  }, []);

  const telegramId = tgUser?.id ?? "";
  const isReady = !!telegramId;

  const { data: user, isLoading } = useGetMe(
    {
      telegramId,
      firstName: tgUser?.firstName ?? "User",
      lastName: tgUser?.lastName ?? "",
      username: tgUser?.username ?? "",
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

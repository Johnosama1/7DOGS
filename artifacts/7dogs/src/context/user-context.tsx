import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "@workspace/api-client-react";
import { useGetMe } from "@workspace/api-client-react";

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  telegramId: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [telegramId, setTelegramId] = useState<string>("12345"); // Default mock
  const [firstName, setFirstName] = useState<string>("Demo");
  const [username, setUsername] = useState<string>("demo_user");

  useEffect(() => {
    // Try to get Telegram WebApp user
    const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
    if (tgUser) {
      setTelegramId(tgUser.id.toString());
      setFirstName(tgUser.first_name);
      setUsername(tgUser.username || "");
    }
  }, []);

  const { data: user, isLoading } = useGetMe(
    { telegramId, firstName, username },
    { query: { enabled: !!telegramId } as never }
  );

  return (
    <UserContext.Provider value={{ user: user || null, isLoading, telegramId }}>
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

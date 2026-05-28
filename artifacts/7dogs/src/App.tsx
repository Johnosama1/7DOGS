import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from "@/context/user-context";
import { LanguageProvider } from "@/context/language-context";
import { AppLayout } from "@/components/layout/app-layout";
import { ChannelGate } from "@/components/channel-gate";
import { WelcomeScreen } from "@/components/welcome-screen";

// Critical path — loaded immediately
import WheelPage from "@/pages/wheel";

// Secondary pages — lazy loaded on demand
const ReferralsPage = lazy(() => import("@/pages/referrals"));
const GiftsPage     = lazy(() => import("@/pages/gifts"));
const AccountPage   = lazy(() => import("@/pages/account"));
const MyGiftsPage   = lazy(() => import("@/pages/my-gifts"));
const AdminPage     = lazy(() => import("@/pages/admin"));
const NotFound      = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageFallback = () => (
  <div className="flex items-center justify-center h-32">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

function Router() {
  return (
    <WelcomeScreen>
      <ChannelGate>
        <AppLayout>
          <Suspense fallback={<PageFallback />}>
            <Switch>
              <Route path="/" component={WheelPage} />
              <Route path="/referrals" component={ReferralsPage} />
              <Route path="/gifts" component={GiftsPage} />
              <Route path="/account" component={AccountPage} />
              <Route path="/my-gifts" component={MyGiftsPage} />
              <Route path="/admin" component={AdminPage} />
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </AppLayout>
      </ChannelGate>
    </WelcomeScreen>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </UserProvider>
        <Toaster />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;

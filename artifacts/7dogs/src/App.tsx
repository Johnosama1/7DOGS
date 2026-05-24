import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/context/user-context";
import { AppLayout } from "@/components/layout/app-layout";

import NotFound from "@/pages/not-found";
import WheelPage from "@/pages/wheel";
import ReferralsPage from "@/pages/referrals";
import GiftsPage from "@/pages/gifts";
import AccountPage from "@/pages/account";
import MyGiftsPage from "@/pages/my-gifts";
import AdminPage from "@/pages/admin";

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={WheelPage} />
        <Route path="/referrals" component={ReferralsPage} />
        <Route path="/gifts" component={GiftsPage} />
        <Route path="/account" component={AccountPage} />
        <Route path="/my-gifts" component={MyGiftsPage} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UserProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
        </UserProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

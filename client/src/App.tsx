import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useEffect, useState } from "react";
import { TgTopLaunchScreen } from "./components/TgTopLaunchScreen";

function Router({ onHomeReady }: { onHomeReady: () => void }) {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}>{() => <Home onReady={onHomeReady} />}</Route>
      <Route path={"/privacy"} component={PrivacyPolicy} />
      <Route path={"/privacy-policy"} component={PrivacyPolicy} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

// Default fallback manifestUrl="https://tgtop.me/tonconnect-manifest.json"
const TONCONNECT_MANIFEST_URL =
  typeof window !== "undefined" && window.location?.origin
    ? `${window.location.origin}/tonconnect-manifest.json`
    : "https://tgtop.me/tonconnect-manifest.json";

function App() {
  const [isLaunching, setIsLaunching] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const isExternalPolicyRoute = typeof window !== "undefined" && ["/privacy", "/privacy-policy"].includes(window.location.pathname);

  useEffect(() => {
    // Safety fallback: if app takes more than 1.5s, signal ready so the user is never trapped
    const timer = setTimeout(() => {
      setAppReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <TonConnectUIProvider
        manifestUrl={TONCONNECT_MANIFEST_URL}
        actionsConfiguration={{ twaReturnUrl: "https://t.me/TG_TOPBOT" }}
      >
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router onHomeReady={() => setAppReady(true)} />
            {!isExternalPolicyRoute && isLaunching && <TgTopLaunchScreen ready={appReady} onComplete={() => setIsLaunching(false)} />}
          </TooltipProvider>
        </ThemeProvider>
      </TonConnectUIProvider>
    </ErrorBoundary>
  );
}

export default App;

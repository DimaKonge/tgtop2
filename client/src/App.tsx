import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { useState } from "react";
import { TgTopLaunchScreen } from "./components/TgTopLaunchScreen";

function Router({ onHomeReady }: { onHomeReady: () => void }) {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"}>{() => <Home onReady={onHomeReady} />}</Route>
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

function App() {
  const [isLaunching, setIsLaunching] = useState(true);
  const [appReady, setAppReady] = useState(false);

  return (
    <ErrorBoundary>
      <TonConnectUIProvider manifestUrl="https://tgtop.xyz/tonconnect-manifest.json">
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router onHomeReady={() => setAppReady(true)} />
            {isLaunching && <TgTopLaunchScreen ready={appReady} onComplete={() => setIsLaunching(false)} />}
          </TooltipProvider>
        </ThemeProvider>
      </TonConnectUIProvider>
    </ErrorBoundary>
  );
}

export default App;

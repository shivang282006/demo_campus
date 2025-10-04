import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import CameraStation from "@/pages/camera-station";
import NotFound from "@/pages/not-found";
import CameraTest from "@/components/CameraTest";
import CameraTestSimple from "@/components/CameraTestSimple";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/camera-station" component={CameraStation} />
      <Route path="/camera-test" component={CameraTest} />
      <Route path="/camera-test-simple" component={CameraTestSimple} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

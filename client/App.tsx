import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Trips from "./pages/Trips";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import FigmaApp from "./pages/FigmaApp";
import Splash from "./pages/Splash";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import RegisterName from "./pages/RegisterName";
import RegisterContact from "./pages/RegisterContact";
import UserOtp from "./pages/UserOtp";
import VehicleChoice from "./pages/VehicleChoice";
import UserRegisterName from "./pages/UserRegisterName";
import UserRegisterContact from "./pages/UserRegisterContact";
import UserPersonalDetails from "./pages/UserPersonalDetails";
import UserDocuments from "./pages/UserDocuments";
import PersonalDetails from "./pages/PersonalDetails";
import Documents from "./pages/Documents";
import DriverDetails from "./pages/DriverDetails";
import Search from "./pages/Search";
import TripSummary from "./pages/TripSummary";
import UserVerify from "./pages/UserVerify";
import UserDetails from "./pages/UserDetails";
import Safety from "./pages/Safety";
import { AppStoreProvider } from "./lib/store";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppStoreProvider>
        <BrowserRouter>
          <React.Suspense fallback={null}>
            <Routes>
              {/* Wrap routes with AuthGate to enforce login and inactivity expiry */}
            </Routes>
          </React.Suspense>
        </BrowserRouter>
      </AppStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

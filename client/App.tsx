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
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/splash" element={<Splash />} />
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register/name" element={<RegisterName />} />
            <Route path="/register/contact" element={<RegisterContact />} />
            <Route path="/user/register/name" element={<UserRegisterName />} />
            <Route path="/user/register/contact" element={<UserRegisterContact />} />
            <Route path="/user/register/details" element={<UserPersonalDetails />} />
            <Route path="/user/register/documents" element={<UserDocuments />} />
            <Route path="/user/otp" element={<UserOtp />} />
            <Route path="/vehicle" element={<VehicleChoice />} />
            <Route path="/register/details" element={<PersonalDetails />} />
            <Route path="/register/documents" element={<Documents />} />
            <Route path="/search" element={<Search />} />
            <Route path="/user/verify" element={<UserVerify />} />
            <Route path="/user/:id" element={<UserDetails />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/driver/:id" element={<DriverDetails />} />
            <Route path="/trip/summary" element={<TripSummary />} />
            <Route path="/app" element={<FigmaApp />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AppStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);

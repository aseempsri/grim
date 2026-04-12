import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { DashboardLayout } from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import PropertyList from "./pages/PropertyList";
import AddEditProperty from "./pages/AddEditProperty";
import PropertyPresentation from "./pages/PropertyPresentation";
import PropertiesShowcase from "./pages/PropertiesShowcase";
import InventoryHub from "./pages/InventoryHub";
import GarimaInventoryPublic from "./pages/GarimaInventoryPublic";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="properties" element={<PropertyList />} />
            <Route path="add" element={<AddEditProperty />} />
            <Route path="edit/:id" element={<AddEditProperty />} />
            <Route path="inventory" element={<InventoryHub />} />
          </Route>
          <Route path="/property/:id" element={<PropertyPresentation />} />
          <Route path="/properties" element={<PropertiesShowcase />} />
          <Route path="/garima-inventory" element={<GarimaInventoryPublic />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

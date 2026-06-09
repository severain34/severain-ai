import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import Info from "./pages/Info";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/severain-admin" element={<Admin />} />
        <Route path="/owner" element={<Admin />} />
        <Route path="/info/:slug" element={<Info />} />
        <Route path="/" element={<Chat />} />
        <Route path="*" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;

import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Chat from "./pages/Chat";
import Auth from "./pages/Auth";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/" element={<Chat />} />
        <Route path="*" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;

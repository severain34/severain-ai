import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Chat from "./pages/Chat";

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Chat />} />
        <Route path="*" element={<Chat />} />
      </Routes>
    </BrowserRouter>
  </>
);

export default App;

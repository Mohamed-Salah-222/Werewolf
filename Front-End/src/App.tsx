import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VoiceProvider } from "./contexts/VoiceConext";
// import { useSocketRejoin } from "./hooks/useSocketRejoin";
import HomePage from "./pages/HomePage";
import WaitingRoom from "./pages/WaitingRoom";
import RoleReveal from "./pages/RoleReveal";
import NightPhase from "./pages/NightPhase";
import Discussion from "./pages/Discussion";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import JoinPage from "./pages/JoinPage";
import { socketListners } from "./store/sockets";

function AppRoutes() {
  socketListners();
  // useSocketRejoin();
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/waiting/:gameCode" element={<WaitingRoom />} />
      <Route path="/role-reveal/:gameCode" element={<RoleReveal />} />
      <Route path="/night/:gameCode" element={<NightPhase />} />
      <Route path="/discussion/:gameCode" element={<Discussion />} />
      <Route path="/vote/:gameCode" element={<Vote />} />
      <Route path="/results/:gameCode" element={<Results />} />
      <Route path="/join/:gameCode" element={<JoinPage />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <VoiceProvider>
        <AppRoutes />
      </VoiceProvider>
    </BrowserRouter>
  );
}

export default App;

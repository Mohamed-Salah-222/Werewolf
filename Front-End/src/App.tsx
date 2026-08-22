import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import HomePage from "./pages/HomePage";
import WaitingRoom from "./pages/WaitingRoom";
import RoleReveal from "./pages/RoleReveal";
import NightPhase from "./pages/NightPhase";
import Discussion from "./pages/Discussion";
import Vote from "./pages/Vote";
import Results from "./pages/Results";
import JoinPage from "./pages/JoinPage";
import { connectSocket } from "./store/sockets";
import GlobalPhaseRouter from "./components/GlobalPhaseRouter";
import { useEffect } from "react";



function GameLayout() {
  useEffect(() => {
    connectSocket()
  }, []);

  return <Outlet />;
}

function AppRoutes() {
  return (
    <>
      <GlobalPhaseRouter />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<GameLayout />}>
          <Route path="/waiting/:gameCode" element={<WaitingRoom />} />
          <Route path="/role-reveal/:gameCode" element={<RoleReveal />} />
          <Route path="/night/:gameCode" element={<NightPhase />} />
          <Route path="/discussion/:gameCode" element={<Discussion />} />
          <Route path="/vote/:gameCode" element={<Vote />} />
          <Route path="/results/:gameCode" element={<Results />} />
          <Route path="/join/:gameCode" element={<JoinPage />} />
        </Route>
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;

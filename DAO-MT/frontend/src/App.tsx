import { useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import WalletBar from "./components/WalletBar";
import ServiceRequests from "./pages/ServiceRequests";
import Authenticity from "./pages/Authenticity";
import Dealers from "./pages/Dealers";
import DaoProposal from "./pages/DaoProposal";

export default function App() {
  const [account, setAccount] = useState<string | null>(null);

  return (
    <div className="layout">
      <nav className="nav">
        <h1>⚙️ SKF DAO</h1>
        <NavLink to="/service-requests">Service Requests</NavLink>
        <NavLink to="/dealers">Dealers</NavLink>
        <NavLink to="/dao">DAO</NavLink>
      </nav>
      <div className="main">
        <WalletBar account={account} setAccount={setAccount} />
        <Routes>
          <Route path="/" element={<Navigate to="/service-requests" />} />
          <Route path="/service-requests" element={<ServiceRequests />} />
          <Route path="/sr/:id" element={<Authenticity />} />
          <Route path="/dealers" element={<Dealers />} />
          <Route path="/dao" element={<DaoProposal account={account} />} />
        </Routes>
      </div>
    </div>
  );
}

export const API = "http://localhost:8080";

async function j(res: Response) {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  dealers: () => fetch(`${API}/api/dealers`).then(j),
  serviceRequests: () => fetch(`${API}/api/service-requests`).then(j),
  serviceRequest: (id: number | string) =>
    fetch(`${API}/api/service-requests/${id}`).then(j),
  scan: (id: number | string, region?: string) =>
    fetch(`${API}/api/service-requests/${id}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ region }),
    }).then(j),
  report: (serial: string, dealerId: string, severity: string) =>
    fetch(`${API}/api/reports`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serial, dealerId, severity }),
    }).then(j),
  proposals: () => fetch(`${API}/api/proposals`).then(j),
  proposal: (id: number | string) => fetch(`${API}/api/proposals/${id}`).then(j),
  resync: () => fetch(`${API}/api/sync`, { method: "POST" }).then(j),
};

export type Dealer = { id: string; name: string; status: string; signalScore: number };
export type ServiceRequest = {
  id: number;
  serial: string;
  region: string;
  status: string;
  verdict: string | null;
  confidence: number | null;
};
export type Attribution = { key: string; weight: number; passed: boolean };
export type ScanResult = {
  serviceRequestId: number;
  serial: string;
  region: string;
  verdict: string;
  confidence: number;
  score: number;
  dealerId: string | null;
  attributions: Attribution[];
};
export type Proposal = {
  id: number;
  dealerId: string;
  dealerName: string;
  action: string;
  actionCode: number;
  forVotes: number;
  againstVotes: number;
  quorum: number;
  status: string;
  statusCode: number;
};

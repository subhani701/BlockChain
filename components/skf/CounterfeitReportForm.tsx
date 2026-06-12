'use client';

import { useState } from 'react';
import { FileWarning } from 'lucide-react';
import { fileCounterfeitReport } from '@/lib/store/provenance';
import type { ReportSeverity } from '@/lib/store/types';
import { useApp } from '@/components/providers/app-provider';

const SEVERITIES: ReportSeverity[] = ['SUSPECTED', 'CONFIRMED_VISUAL', 'CONFIRMED_LAB'];
const FAILURE_MODES = [
  'premature_failure', 'dimensional_mismatch', 'material_mismatch',
  'marking_anomaly', 'packaging_anomaly', 'qr_invalid', 'qr_missing',
];

interface CounterfeitReportFormProps {
  srId: string;
  productSerial: string;
  sku: string;
  technicianDid: string;
  serviceCentre: string;
  defaultDealerDid: string;
  onSubmitted?: (reportId: string) => void;
}

export function CounterfeitReportForm({
  srId, productSerial, sku, technicianDid, serviceCentre, defaultDealerDid, onSubmitted,
}: CounterfeitReportFormProps) {
  const { showToast } = useApp();
  const [severity, setSeverity] = useState<ReportSeverity>('SUSPECTED');
  const [dealerDid, setDealerDid] = useState(defaultDealerDid);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [modes, setModes] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [notes, setNotes] = useState('');

  const toggleMode = (m: string) => {
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNo.trim() || modes.length === 0) {
      showToast('Complete required fields before submitting', 'warning');
      return;
    }
    const report = fileCounterfeitReport({
      sr_id: srId,
      dealer_did: dealerDid,
      product_serial: productSerial,
      sku,
      severity,
      failure_modes: modes,
      photos: [],
      lab_report_url: severity === 'CONFIRMED_LAB' ? '/docs/lab-upload.pdf' : null,
      technician_did: technicianDid,
      reporter_service_centre: serviceCentre,
      customer_consent_to_share: consent,
      technician_notes: notes,
      dealer_invoice_no: invoiceNo,
    });
    showToast(`Report filed. Tracking ID: ${report.report_id}. Brand-protection team notified.`, 'success');
    onSubmitted?.(report.report_id);
  };

  return (
    <form onSubmit={submit} className="ds-card">
      <div className="ds-card-header flex items-center gap-2.5">
        <span className="ds-card-icon"><FileWarning size={16} strokeWidth={1.75} /></span>
        <h3 className="ds-section-title mb-0">File counterfeit report</h3>
      </div>
      <div className="ds-card-body space-y-4">
        <div className="ds-form-field">
          <label className="ds-form-label">Severity *</label>
          <select className="ds-form-input" value={severity} onChange={(e) => setSeverity(e.target.value as ReportSeverity)}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="ds-form-field">
          <label className="ds-form-label">Dealer DID *</label>
          <input className="ds-form-input font-mono text-xs" value={dealerDid} onChange={(e) => setDealerDid(e.target.value)} required />
        </div>
        <div className="ds-form-field">
          <label className="ds-form-label">Dealer invoice no. *</label>
          <input className="ds-form-input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} required />
        </div>
        <div className="ds-form-field">
          <label className="ds-form-label">Failure modes *</label>
          <div className="flex flex-wrap gap-2">
            {FAILURE_MODES.map((m) => (
              <button key={m} type="button" onClick={() => toggleMode(m)}
                className={`ds-filter-chip ${modes.includes(m) ? 'ds-filter-chip-active' : ''}`}>
                {m.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span className="text-muted-foreground">Customer consent to share with regulator or public recall notice</span>
        </label>
        <div className="ds-form-field">
          <label className="ds-form-label">Technician notes</label>
          <textarea className="ds-form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
        </div>
        <div className="ds-actions">
          <button type="submit" className="ds-btn-md ds-btn-primary">Submit signed report</button>
        </div>
      </div>
    </form>
  );
}

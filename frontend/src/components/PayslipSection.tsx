import type { FormEvent } from "react";
import type { PayslipDocument } from "../types";
import { formatCurrency } from "../utils";

type PayslipSectionProps = {
  API_BASE_URL: string;
  payslipFile: File | null;
  setPayslipFile: (file: File | null) => void;
  isUploadingPayslip: boolean;
  handleUploadPayslip: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingPayslips: boolean;
  payslips: PayslipDocument[];
};

function PayslipSection({
  API_BASE_URL,
  payslipFile,
  setPayslipFile,
  isUploadingPayslip,
  handleUploadPayslip,
  isLoadingPayslips,
  payslips,
}: PayslipSectionProps) {
  return (
    <section className="payslip-panel">
      <h2>Payslip Upload</h2>
      <p>Upload PDF payslips for date/net-pay extraction and retrieval.</p>
      <form className="upload-form" onSubmit={(event) => void handleUploadPayslip(event)}>
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={(event) => setPayslipFile(event.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={isUploadingPayslip || !payslipFile}>
          {isUploadingPayslip ? "Uploading..." : "Upload Payslip"}
        </button>
      </form>
      {isLoadingPayslips ? (
        <p>Loading payslips...</p>
      ) : payslips.length === 0 ? (
        <p>No payslips uploaded yet.</p>
      ) : (
        <ul className="rules-list">
          {payslips.map((item) => (
            <li key={item.id} className="rules-item">
              <span>
                {item.fileName} | {item.parseStatus} | Pay date:{" "}
                {item.extractedPayDate ? new Date(item.extractedPayDate).toLocaleDateString() : "N/A"} | Net pay:{" "}
                {item.extractedNetPay ? formatCurrency(item.extractedNetPay) : "N/A"}
              </span>
              <a href={`${API_BASE_URL}/api/payslips/${item.id}/download`} target="_blank" rel="noreferrer">
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PayslipSection;

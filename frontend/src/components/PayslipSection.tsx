import type { FormEvent } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Payslip upload
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload PDF payslips for date and net-pay extraction and retrieval.
        </Typography>
        <Box component="form" onSubmit={(event) => void handleUploadPayslip(event)} sx={{ mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ alignItems: { sm: "center" } }}>
            <Button variant="outlined" component="label">
              Choose PDF
              <input
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={(event) => setPayslipFile(event.target.files?.[0] ?? null)}
              />
            </Button>
            <Typography variant="body2" color="text.secondary">
              {payslipFile ? payslipFile.name : "No file selected"}
            </Typography>
            <Button type="submit" variant="contained" disabled={isUploadingPayslip || !payslipFile}>
              {isUploadingPayslip ? "Uploading…" : "Upload payslip"}
            </Button>
          </Stack>
        </Box>
        {isLoadingPayslips ? (
          <Typography variant="body2">Loading payslips…</Typography>
        ) : payslips.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No payslips uploaded yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {payslips.map((item) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}>
                  <Typography variant="body2">
                    {item.fileName} · {item.parseStatus} · Pay date:{" "}
                    {item.extractedPayDate ? new Date(item.extractedPayDate).toLocaleDateString() : "N/A"} · Net:{" "}
                    {item.extractedNetPay ? formatCurrency(item.extractedNetPay) : "N/A"}
                  </Typography>
                  <Link href={`${API_BASE_URL}/api/payslips/${item.id}/download`} target="_blank" rel="noreferrer">
                    Open
                  </Link>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default PayslipSection;

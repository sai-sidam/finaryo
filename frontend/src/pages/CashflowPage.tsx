import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PageHeader from "../components/PageHeader";
import PaydaySection from "../components/PaydaySection";
import PayslipSection from "../components/PayslipSection";
import { useFinanceApp } from "../context/FinanceAppContext";

export default function CashflowPage() {
  const fin = useFinanceApp();
  return (
    <>
      <PageHeader
        title="Cashflow"
        subtitle="Map when money lands and keep payslips on file. Start with a calendar month; pay-cycle views can follow as we learn what works best."
      />
      <Stack spacing={5}>
        <PaydaySection
          activeMonth={fin.activeMonth}
          setActiveMonth={fin.setActiveMonth}
          loadPaydays={fin.loadPaydays}
          calendarCells={fin.calendarCells}
          selectedPaydayDate={fin.selectedPaydayDate}
          setSelectedPaydayDate={fin.setSelectedPaydayDate}
          paydaySet={fin.paydaySet}
          paydays={fin.paydays}
          editingPaydayId={fin.editingPaydayId}
          setEditingPaydayId={fin.setEditingPaydayId}
          paydayAmount={fin.paydayAmount}
          setPaydayAmount={fin.setPaydayAmount}
          paydayNote={fin.paydayNote}
          setPaydayNote={fin.setPaydayNote}
          paydayRecurrence={fin.paydayRecurrence}
          setPaydayRecurrence={fin.setPaydayRecurrence}
          handlePaydaySubmit={fin.handlePaydaySubmit}
          isLoadingPaydays={fin.isLoadingPaydays}
          handleDeletePayday={fin.handleDeletePayday}
        />

        <Stack component="section" spacing={2} aria-labelledby="payslips-heading">
          <Box sx={{ pt: 1 }}>
            <Typography id="payslips-heading" variant="h5" component="h2" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
              Payslips
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "56ch" }}>
              Upload PDF payslips for storage and reference alongside your cashflow calendar.
            </Typography>
          </Box>
          <PayslipSection
            API_BASE_URL={fin.API_BASE_URL}
            payslipFile={fin.payslipFile}
            setPayslipFile={fin.setPayslipFile}
            isUploadingPayslip={fin.isUploadingPayslip}
            handleUploadPayslip={fin.handleUploadPayslip}
            isLoadingPayslips={fin.isLoadingPayslips}
            payslips={fin.payslips}
          />
        </Stack>
      </Stack>
    </>
  );
}

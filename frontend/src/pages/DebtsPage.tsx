import PageHeader from "../components/PageHeader";
import DebtSection from "../components/DebtSection";
import { useFinanceApp } from "../context/FinanceAppContext";

export default function DebtsPage() {
  const fin = useFinanceApp();
  return (
    <>
      <PageHeader
        title="Debts & loans"
        subtitle="Credit cards and hand loans you track here. Bank-linked installment loans (mortgage, auto) aren’t available yet—add those manually as hand loans if you need the balance on your radar."
      />
      <DebtSection
        debtName={fin.debtName}
        setDebtName={fin.setDebtName}
        debtLender={fin.debtLender}
        setDebtLender={fin.setDebtLender}
        debtBalance={fin.debtBalance}
        setDebtBalance={fin.setDebtBalance}
        debtApr={fin.debtApr}
        setDebtApr={fin.setDebtApr}
        debtMinimumPayment={fin.debtMinimumPayment}
        setDebtMinimumPayment={fin.setDebtMinimumPayment}
        debtDueDay={fin.debtDueDay}
        setDebtDueDay={fin.setDebtDueDay}
        editingDebtId={fin.editingDebtId}
        setEditingDebtId={fin.setEditingDebtId}
        handleDebtSubmit={fin.handleDebtSubmit}
        isLoadingDebts={fin.isLoadingDebts}
        debts={fin.debts}
        handleDeleteDebt={fin.handleDeleteDebt}
        projectionStrategy={fin.projectionStrategy}
        setProjectionStrategy={fin.setProjectionStrategy}
        projectionBudget={fin.projectionBudget}
        setProjectionBudget={fin.setProjectionBudget}
        loadDebtProjection={fin.loadDebtProjection}
        isLoadingProjection={fin.isLoadingProjection}
        projection={fin.projection}
        loanDirection={fin.loanDirection}
        setLoanDirection={fin.setLoanDirection}
        loanCounterparty={fin.loanCounterparty}
        setLoanCounterparty={fin.setLoanCounterparty}
        loanPrincipal={fin.loanPrincipal}
        setLoanPrincipal={fin.setLoanPrincipal}
        loanDueDate={fin.loanDueDate}
        setLoanDueDate={fin.setLoanDueDate}
        loanStatus={fin.loanStatus}
        setLoanStatus={fin.setLoanStatus}
        loanNote={fin.loanNote}
        setLoanNote={fin.setLoanNote}
        editingLoanId={fin.editingLoanId}
        setEditingLoanId={fin.setEditingLoanId}
        handleHandLoanSubmit={fin.handleHandLoanSubmit}
        isLoadingHandLoans={fin.isLoadingHandLoans}
        handLoans={fin.handLoans}
        handleDeleteHandLoan={fin.handleDeleteHandLoan}
      />
    </>
  );
}

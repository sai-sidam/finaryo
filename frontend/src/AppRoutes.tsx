import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import AccountsPage from "./pages/AccountsPage";
import CashflowPage from "./pages/CashflowPage";
import ConnectPage from "./pages/ConnectPage";
import DebtsPage from "./pages/DebtsPage";
import InsightsPage from "./pages/InsightsPage";
import OverviewPage from "./pages/OverviewPage";
import SavingsPage from "./pages/SavingsPage";
import TransactionsPage from "./pages/TransactionsPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<OverviewPage />} />
        <Route path="connect" element={<ConnectPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="cashflow" element={<CashflowPage />} />
        <Route path="debts" element={<DebtsPage />} />
        <Route path="savings" element={<SavingsPage />} />
        <Route path="insights" element={<InsightsPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

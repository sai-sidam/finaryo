import { Suspense, lazy } from "react";
import LinearProgress from "@mui/material/LinearProgress";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";

// Route-level code splitting: each page loads on first visit.
const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const ConnectPage = lazy(() => import("./pages/ConnectPage"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage"));
const CashflowPage = lazy(() => import("./pages/CashflowPage"));
const DebtsPage = lazy(() => import("./pages/DebtsPage"));
const SavingsPage = lazy(() => import("./pages/SavingsPage"));
const InsightsPage = lazy(() => import("./pages/InsightsPage"));
const AccountsPage = lazy(() => import("./pages/AccountsPage"));

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <Suspense fallback={<LinearProgress />}>
              <OverviewPage />
            </Suspense>
          }
        />
        <Route
          path="connect"
          element={
            <Suspense fallback={<LinearProgress />}>
              <ConnectPage />
            </Suspense>
          }
        />
        <Route
          path="transactions"
          element={
            <Suspense fallback={<LinearProgress />}>
              <TransactionsPage />
            </Suspense>
          }
        />
        <Route
          path="cashflow"
          element={
            <Suspense fallback={<LinearProgress />}>
              <CashflowPage />
            </Suspense>
          }
        />
        <Route
          path="debts"
          element={
            <Suspense fallback={<LinearProgress />}>
              <DebtsPage />
            </Suspense>
          }
        />
        <Route
          path="savings"
          element={
            <Suspense fallback={<LinearProgress />}>
              <SavingsPage />
            </Suspense>
          }
        />
        <Route
          path="insights"
          element={
            <Suspense fallback={<LinearProgress />}>
              <InsightsPage />
            </Suspense>
          }
        />
        <Route
          path="accounts"
          element={
            <Suspense fallback={<LinearProgress />}>
              <AccountsPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

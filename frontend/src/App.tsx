import { BrowserRouter } from "react-router-dom";
import { FinanceAppProvider } from "./finance/FinanceAppProvider";
import AppRoutes from "./AppRoutes";

export default function App() {
  return (
    <FinanceAppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </FinanceAppProvider>
  );
}

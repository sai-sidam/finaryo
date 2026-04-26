const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function run() {
  const timestamp = Date.now();
  console.log("Smoke: health");
  await request("/api/health");

  console.log("Smoke: expense create/list");
  const expense = await request("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: `smoke-expense-${timestamp}`, amount: 12.34, category: "SmokeTest" }),
  });
  if (!expense?.data?.id) {
    throw new Error("Expense create did not return data.id");
  }
  await request("/api/expenses");

  console.log("Smoke: transactions list/update/delete");
  const transactions = await request("/api/transactions");
  const firstExpense = transactions?.data?.find?.((row) => row.sourceType === "expense");
  if (firstExpense) {
    await request(`/api/transactions/expense/${firstExpense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: "SmokeUpdated" }),
    });
  }

  console.log("Smoke: payday create/list/delete");
  const payday = await request("/api/paydays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date: new Date().toISOString(),
      expectedAmount: 1000,
      recurrence: "none",
      note: "smoke",
    }),
  });
  await request(`/api/paydays?month=${new Date().toISOString().slice(0, 7)}`);
  await request(`/api/paydays/${payday.data.id}`, { method: "DELETE" });

  console.log("Smoke: debt create/projection/delete");
  const debt = await request("/api/debts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Debt",
      lender: "Test Lender",
      balance: 500,
      apr: 12,
      minimumPayment: 50,
      dueDay: 15,
    }),
  });
  await request("/api/debts/projection?strategy=avalanche");
  await request(`/api/debts/${debt.data.id}`, { method: "DELETE" });

  console.log("Smoke: hand-loan create/delete");
  const loan = await request("/api/hand-loans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      direction: "borrowed",
      counterparty: "Smoke Friend",
      principal: 100,
      status: "active",
    }),
  });
  await request(`/api/hand-loans/${loan.data.id}`, { method: "DELETE" });

  console.log("Smoke: rule create/list/delete");
  const rule = await request("/api/categorization-rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: "smoke-keyword", category: "SmokeCategory" }),
  });
  await request("/api/categorization-rules");
  await request(`/api/categorization-rules/${rule.data.id}`, { method: "DELETE" });
  await request("/api/transactions/recurring");

  console.log("Smoke: savings goal create/contribution/delete");
  const goal = await request("/api/savings-goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Goal", targetAmount: 200 }),
  });
  await request(`/api/savings-goals/${goal.data.id}/contributions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 25, sourceType: "manual" }),
  });
  await request("/api/savings-goals");
  await request(`/api/savings-goals/${goal.data.id}`, { method: "DELETE" });

  console.log("Smoke: monthly insights and payslip list");
  await request(`/api/insights/monthly?month=${new Date().toISOString().slice(0, 7)}`);
  await request("/api/payslips");

  console.log("Smoke test passed.");
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

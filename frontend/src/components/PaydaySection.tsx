import type { FormEvent } from "react";
import { alpha, useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import type { PaydayEvent } from "../types";
import { formatCurrency } from "../utils";

type PaydaySectionProps = {
  activeMonth: Date;
  setActiveMonth: (month: Date) => void;
  loadPaydays: (targetMonth?: Date) => Promise<void>;
  calendarCells: Array<{ date: Date; inCurrentMonth: boolean }>;
  selectedPaydayDate: string;
  setSelectedPaydayDate: (value: string) => void;
  paydaySet: Set<string>;
  paydays: PaydayEvent[];
  editingPaydayId: string | null;
  setEditingPaydayId: (value: string | null) => void;
  paydayAmount: string;
  setPaydayAmount: (value: string) => void;
  paydayNote: string;
  setPaydayNote: (value: string) => void;
  paydayRecurrence: "none" | "biweekly" | "monthly";
  setPaydayRecurrence: (value: "none" | "biweekly" | "monthly") => void;
  handlePaydaySubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  isLoadingPaydays: boolean;
  handleDeletePayday: (id: string) => Promise<void>;
};

function PaydaySection({
  activeMonth,
  setActiveMonth,
  loadPaydays,
  calendarCells,
  selectedPaydayDate,
  setSelectedPaydayDate,
  paydaySet,
  paydays,
  editingPaydayId,
  setEditingPaydayId,
  paydayAmount,
  setPaydayAmount,
  paydayNote,
  setPaydayNote,
  paydayRecurrence,
  setPaydayRecurrence,
  handlePaydaySubmit,
  isLoadingPaydays,
  handleDeletePayday,
}: PaydaySectionProps) {
  const theme = useTheme();

  return (
    <Card component="section" variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Payday calendar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Click a date to log your payday amount, notes, and recurrence.
        </Typography>
        <Stack direction="row" sx={{ mb: 2, alignItems: "center", justifyContent: "space-between" }}>
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={() => {
              const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
              setActiveMonth(nextMonth);
              void loadPaydays(nextMonth);
            }}
          >
            Prev
          </Button>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {activeMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
          </Typography>
          <Button
            type="button"
            variant="outlined"
            size="small"
            onClick={() => {
              const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
              setActiveMonth(nextMonth);
              void loadPaydays(nextMonth);
            }}
          >
            Next
          </Button>
        </Stack>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            gap: 0.5,
            mb: 3,
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <Typography key={day} variant="caption" color="text.secondary" sx={{ textAlign: "center", fontWeight: 600 }}>
              {day}
            </Typography>
          ))}
          {calendarCells.map((cell) => {
            const isoDate = cell.date.toISOString().slice(0, 10);
            const isSelected = selectedPaydayDate === isoDate;
            const hasPayday = paydaySet.has(isoDate);
            return (
              <Button
                key={isoDate}
                type="button"
                variant="text"
                onClick={() => {
                  setSelectedPaydayDate(isoDate);
                  const selected = paydays.find((payday) => payday.date.startsWith(isoDate));
                  if (selected) {
                    setEditingPaydayId(selected.id);
                    setPaydayAmount(String(selected.expectedAmount));
                    setPaydayNote(selected.note ?? "");
                    setPaydayRecurrence(selected.recurrence);
                  } else {
                    setEditingPaydayId(null);
                    setPaydayAmount("");
                    setPaydayNote("");
                    setPaydayRecurrence("none");
                  }
                }}
                sx={{
                  minWidth: 0,
                  py: 0.75,
                  px: 0,
                  borderRadius: 1,
                  border: 1,
                  borderColor: isSelected ? "primary.main" : "divider",
                  bgcolor: hasPayday ? alpha(theme.palette.primary.main, 0.1) : "background.paper",
                  opacity: cell.inCurrentMonth ? 1 : 0.45,
                  fontWeight: isSelected ? 700 : 400,
                }}
              >
                {cell.date.getDate()}
              </Button>
            );
          })}
        </Box>

        <Box component="form" onSubmit={(event) => void handlePaydaySubmit(event)}>
          <Stack spacing={2}>
            <TextField
              label="Selected date"
              type="date"
              value={selectedPaydayDate}
              onChange={(event) => setSelectedPaydayDate(event.target.value)}
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Expected amount"
              type="number"
              value={paydayAmount}
              onChange={(event) => setPaydayAmount(event.target.value)}
              required
              size="small"
              slotProps={{ htmlInput: { min: "0.01", step: "0.01" } }}
            />
            <FormControl size="small">
              <InputLabel id="recurrence-label">Recurrence</InputLabel>
              <Select
                labelId="recurrence-label"
                label="Recurrence"
                value={paydayRecurrence}
                onChange={(event) => setPaydayRecurrence(event.target.value as "none" | "biweekly" | "monthly")}
              >
                <MenuItem value="none">One-time</MenuItem>
                <MenuItem value="biweekly">Biweekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Note"
              value={paydayNote}
              onChange={(event) => setPaydayNote(event.target.value)}
              placeholder="Employer / comment"
              size="small"
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained">
                {editingPaydayId ? "Update payday" : "Save payday"}
              </Button>
              {editingPaydayId ? (
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => {
                    setEditingPaydayId(null);
                    setPaydayAmount("");
                    setPaydayNote("");
                    setPaydayRecurrence("none");
                  }}
                >
                  Cancel edit
                </Button>
              ) : null}
            </Stack>
          </Stack>
        </Box>

        {isLoadingPaydays ? (
          <Typography variant="body2" sx={{ mt: 3 }}>
            Loading paydays…
          </Typography>
        ) : paydays.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            No paydays saved for this month.
          </Typography>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {paydays.map((payday) => (
              <Paper key={payday.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="subtitle2">{new Date(payday.date).toLocaleDateString()}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {payday.recurrence}
                      {payday.note ? ` · ${payday.note}` : ""}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{formatCurrency(payday.expectedAmount)}</Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        setSelectedPaydayDate(payday.date.slice(0, 10));
                        setEditingPaydayId(payday.id);
                        setPaydayAmount(String(payday.expectedAmount));
                        setPaydayNote(payday.note ?? "");
                        setPaydayRecurrence(payday.recurrence);
                      }}
                    >
                      Edit
                    </Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => void handleDeletePayday(payday.id)}>
                      Delete
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default PaydaySection;

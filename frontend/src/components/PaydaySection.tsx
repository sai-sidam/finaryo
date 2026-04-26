import type { FormEvent } from "react";
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
  return (
    <section className="payday-panel">
      <h2>Payday Calendar</h2>
      <p>Click a date to log your payday amount, notes, and recurrence.</p>
      <div className="calendar-header">
        <button
          type="button"
          onClick={() => {
            const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
            setActiveMonth(nextMonth);
            void loadPaydays(nextMonth);
          }}
        >
          Prev
        </button>
        <strong>
          {activeMonth.toLocaleString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button
          type="button"
          onClick={() => {
            const nextMonth = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
            setActiveMonth(nextMonth);
            void loadPaydays(nextMonth);
          }}
        >
          Next
        </button>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <span key={day} className="calendar-weekday">
            {day}
          </span>
        ))}
        {calendarCells.map((cell) => {
          const isoDate = cell.date.toISOString().slice(0, 10);
          const isSelected = selectedPaydayDate === isoDate;
          const hasPayday = paydaySet.has(isoDate);
          return (
            <button
              key={isoDate}
              type="button"
              className={`calendar-day ${!cell.inCurrentMonth ? "calendar-day-muted" : ""} ${
                isSelected ? "calendar-day-selected" : ""
              } ${hasPayday ? "calendar-day-payday" : ""}`}
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
            >
              {cell.date.getDate()}
            </button>
          );
        })}
      </div>
      <form className="payday-form" onSubmit={(event) => void handlePaydaySubmit(event)}>
        <label>
          Selected Date
          <input type="date" value={selectedPaydayDate} onChange={(event) => setSelectedPaydayDate(event.target.value)} />
        </label>
        <label>
          Expected Amount
          <input
            type="number"
            value={paydayAmount}
            onChange={(event) => setPaydayAmount(event.target.value)}
            min="0.01"
            step="0.01"
            placeholder="0.00"
            required
          />
        </label>
        <label>
          Recurrence
          <select
            value={paydayRecurrence}
            onChange={(event) => setPaydayRecurrence(event.target.value as "none" | "biweekly" | "monthly")}
          >
            <option value="none">One-time</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label>
          Note
          <input
            type="text"
            value={paydayNote}
            onChange={(event) => setPaydayNote(event.target.value)}
            placeholder="Employer / comment"
            maxLength={200}
          />
        </label>
        <div className="payday-actions">
          <button type="submit">{editingPaydayId ? "Update Payday" : "Save Payday"}</button>
          {editingPaydayId && (
            <button
              type="button"
              onClick={() => {
                setEditingPaydayId(null);
                setPaydayAmount("");
                setPaydayNote("");
                setPaydayRecurrence("none");
              }}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
      {isLoadingPaydays ? (
        <p>Loading paydays...</p>
      ) : paydays.length === 0 ? (
        <p>No paydays saved for this month.</p>
      ) : (
        <ul className="payday-list">
          {paydays.map((payday) => (
            <li key={payday.id} className="payday-item">
              <div>
                <strong>{new Date(payday.date).toLocaleDateString()}</strong>
                <small>
                  {payday.recurrence} {payday.note ? `- ${payday.note}` : ""}
                </small>
              </div>
              <div className="payday-item-actions">
                <span>{formatCurrency(payday.expectedAmount)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPaydayDate(payday.date.slice(0, 10));
                    setEditingPaydayId(payday.id);
                    setPaydayAmount(String(payday.expectedAmount));
                    setPaydayNote(payday.note ?? "");
                    setPaydayRecurrence(payday.recurrence);
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void handleDeletePayday(payday.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default PaydaySection;

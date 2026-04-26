type StatPillProps = {
  label: string;
  value: string;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <span className="stat-pill">
      <strong>{label}:</strong> {value}
    </span>
  );
}

export default StatPill;

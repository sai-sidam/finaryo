import Chip from "@mui/material/Chip";

type StatPillProps = {
  label: string;
  value: string;
};

function StatPill({ label, value }: StatPillProps) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={`${label}: ${value}`}
      sx={{ fontVariantNumeric: "tabular-nums" }}
    />
  );
}

export default StatPill;

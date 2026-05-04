import Typography from "@mui/material/Typography";

type EmptyStateProps = {
  message: string;
};

function EmptyState({ message }: EmptyStateProps) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
      {message}
    </Typography>
  );
}

export default EmptyState;

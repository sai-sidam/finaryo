import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <Stack component="header" spacing={0.5} sx={{ mb: 2 }}>
      <Typography variant="h5" component="h2" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: "min(48rem, 100%)" }}>
          {subtitle}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default SectionHeader;

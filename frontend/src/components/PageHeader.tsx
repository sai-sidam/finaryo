import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mt: 0, mb: subtitle ? 0.75 : 0 }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 0, maxWidth: "min(56rem, 100%)", lineHeight: 1.55 }}>
          {subtitle}
        </Typography>
      ) : null}
      <Divider sx={{ mt: subtitle ? 2 : 2.5 }} />
    </Box>
  );
}

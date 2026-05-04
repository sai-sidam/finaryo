import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";

export type SectionCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  /** Extra props for the Card root */
  sx?: SxProps<Theme>;
};

/**
 * Consistent bordered section used across dashboard-style pages (MD3-style grouping).
 */
export default function SectionCard({ title, description, children, sx }: SectionCardProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, ...sx }}>
      <CardContent sx={{ "&:last-child": { pb: 2.5 } }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600, letterSpacing: "0.01em", mb: description ? 0.5 : 2 }}>
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: "72ch" }}>
            {description}
          </Typography>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

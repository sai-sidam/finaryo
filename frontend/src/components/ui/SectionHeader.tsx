type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

function SectionHeader({ title, subtitle }: SectionHeaderProps) {
  return (
    <>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
    </>
  );
}

export default SectionHeader;

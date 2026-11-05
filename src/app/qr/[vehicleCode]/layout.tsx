export function generateStaticParams() {
  return [{ vehicleCode: "_placeholder" }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

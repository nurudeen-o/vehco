export function generateStaticParams() {
  return [{ id: "_placeholder" }];
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

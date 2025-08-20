import ClientHeader from "@/components/ClientHeader";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientHeader />
      <main>{children}</main>
    </>
  );
}
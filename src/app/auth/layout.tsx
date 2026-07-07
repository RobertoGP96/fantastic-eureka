export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grad-confirm flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">{children}</div>
    </div>
  );
}

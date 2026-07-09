import { BrandMark } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grad-confirm flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-5 flex justify-center">
          <BrandMark className="size-14" />
        </div>
        {children}
      </div>
    </div>
  );
}

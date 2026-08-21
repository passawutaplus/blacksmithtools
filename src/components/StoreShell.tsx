import { StoreChrome } from "@/components/StoreChrome";
import { getBrandsAndCategories, getSettings } from "@/lib/db";

export async function StoreShell({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const { brands, categories } = await getBrandsAndCategories();

  return (
    <StoreChrome settings={settings} brands={brands} categories={categories}>
      {children}
    </StoreChrome>
  );
}

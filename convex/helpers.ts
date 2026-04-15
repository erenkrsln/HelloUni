export async function getImageUrl(ctx: any, imageValue: string | null | undefined): Promise<string | undefined> {
  if (!imageValue || imageValue.startsWith("http")) return imageValue || undefined;
  try {
    return await ctx.storage.getUrl(imageValue as any) || undefined;
  } catch {
    return undefined;
  }
}

export function shouldDeleteR2File(oldUrl: string | null | undefined, newUrl: string | null | undefined): oldUrl is string {
  return !!(oldUrl && oldUrl.startsWith("http") && oldUrl !== newUrl);
}

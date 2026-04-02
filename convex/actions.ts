import { action } from "./_generated/server";
import { v } from "convex/values";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

function extractR2Key(url: string): string | null {
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
  if (!publicUrl || !url?.startsWith(publicUrl)) return null;
  return url.slice(publicUrl.length + 1) || null;
}

export const deleteR2File = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const key = extractR2Key(args.url);
    if (!key) return;

    try {
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
          Key: key,
        })
      );
    } catch (error) {
      console.error("R2 delete failed:", error);
    }
  },
});

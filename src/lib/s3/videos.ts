import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface VideoRecording {
  key: string;
  url: string;
  lastModified: string;
  size: number;
}

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function listUserVideos(prefix: string): Promise<VideoRecording[]> {
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_BUCKET_NAME!,
    Prefix: prefix,
  });

  const listData = await s3Client.send(listCommand);

  if (!listData.Contents || listData.Contents.length === 0) {
    return [];
  }

  const sortedContents = listData.Contents.sort((a, b) => {
    return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
  });

  const videos = await Promise.all(
    sortedContents.map(async (item) => {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: item.Key!,
        ResponseContentDisposition: `attachment; filename="recording-${item.Key!.split("/").pop()}"`,
      });

      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      return {
        key: item.Key!,
        url,
        lastModified: item.LastModified?.toISOString() || new Date(0).toISOString(),
        size: item.Size || 0,
      };
    })
  );

  return videos;
}

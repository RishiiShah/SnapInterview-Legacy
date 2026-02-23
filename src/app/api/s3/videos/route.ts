import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export async function GET() {
    try {
        const session = await getServerSession();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const username = session.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
        const prefix = `${username}/`;

        const listCommand = new ListObjectsV2Command({
            Bucket: process.env.S3_BUCKET_NAME!,
            Prefix: prefix,
        });

        const listData = await s3Client.send(listCommand);

        if (!listData.Contents || listData.Contents.length === 0) {
            return NextResponse.json({ videos: [] });
        }

        // Sort by LastModified (newest first)
        const sortedContents = listData.Contents.sort((a, b) => {
            return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
        });

        // Generate get signed URLs for each object
        const videoPromises = sortedContents.map(async (item) => {
            const getCommand = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME!,
                Key: item.Key!,
            });
            const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
            return {
                key: item.Key,
                url,
                lastModified: item.LastModified,
                size: item.Size,
            };
        });

        const videos = await Promise.all(videoPromises);

        return NextResponse.json({ videos });
    } catch (error) {
        console.error("Error fetching videos from S3:", error);
        return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
    }
}

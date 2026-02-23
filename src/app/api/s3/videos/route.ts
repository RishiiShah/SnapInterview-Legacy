import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
                ResponseContentDisposition: `attachment; filename="recording-${item.Key!.split('/').pop()}"`,
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

export async function DELETE(req: Request) {
    try {
        const session = await getServerSession();

        if (!session || !session.user || !session.user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { key } = await req.json();

        if (!key) {
            return NextResponse.json({ error: "Missing key" }, { status: 400 });
        }

        // Ensure user can only delete their own videos
        const username = session.user.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
        if (!key.startsWith(`${username}/`)) {
            return NextResponse.json({ error: "Unauthorized access to key" }, { status: 403 });
        }

        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: key,
        });

        await s3Client.send(deleteCommand);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting video from S3:", error);
        return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
    }
}

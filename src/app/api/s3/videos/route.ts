import { csrfRejectIfInvalid } from "@/lib/csrf";
import { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSessionUserIdentity } from "@/lib/server-auth";
import { apiError, apiJson, badRequestError, internalServerError, unauthorizedError } from "@/lib/api-response";
import { requireAwsS3Env } from "@/lib/env";

const aws = requireAwsS3Env();

const s3Client = new S3Client({
    region: aws.region,
    credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
    },
});

export async function GET() {
    try {
        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const prefix = `${authUser.userId}/`;

        const listCommand = new ListObjectsV2Command({
            Bucket: aws.bucketName,
            Prefix: prefix,
        });

        const listData = await s3Client.send(listCommand);

        if (!listData.Contents || listData.Contents.length === 0) {
            return apiJson({ videos: [] });
        }

        // Sort by LastModified (newest first)
        const sortedContents = listData.Contents.sort((a, b) => {
            return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
        });

        // Generate get signed URLs for each object
        const videoPromises = sortedContents.map(async (item) => {
            const getCommand = new GetObjectCommand({
                Bucket: aws.bucketName,
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

        return apiJson({ videos });
    } catch (error) {
        console.error("Error fetching videos from S3:", error);
        return internalServerError("Failed to fetch videos");
    }
}

export async function DELETE(req: Request) {
    try {
        const csrfError = csrfRejectIfInvalid(req);
        if (csrfError) return csrfError;

        const authUser = await getSessionUserIdentity();
        if (!authUser) {
            return unauthorizedError();
        }

        const { key } = await req.json();

        if (!key) {
            return badRequestError("Missing key");
        }

        // Ensure user can only delete their own videos
        if (!key.startsWith(`${authUser.userId}/`)) {
            return apiError("Unauthorized access to key", 403);
        }

        const deleteCommand = new DeleteObjectCommand({
            Bucket: aws.bucketName,
            Key: key,
        });

        await s3Client.send(deleteCommand);

        return apiJson({ success: true });
    } catch (error) {
        console.error("Error deleting video from S3:", error);
        return internalServerError("Failed to delete video");
    }
}

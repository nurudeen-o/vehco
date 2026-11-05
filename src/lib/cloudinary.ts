import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(
  file: File,
  folder: string = "faco/vehicles"
): Promise<{ url: string; publicId: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 1200, height: 800, crop: "limit", quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Upload failed"));
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export async function uploadLocalImageToCloudinary(
  filePath: string,
  folder: string = "faco/vehicles"
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "image",
    transformation: [
      { width: 1200, height: 800, crop: "limit", quality: "auto" },
    ],
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function uploadLocalDocumentToCloudinary(
  filePath: string,
  folder: string = "faco/documents"
): Promise<{ url: string; publicId: string }> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto",
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function extractPublicIdFromUrl(url: string): string | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.(?:jpg|jpeg|png|gif|webp|avif)/i);
  return match ? match[1] : null;
}

/**
 * Abstracción de almacenamiento de archivos.
 * Netlify NO tiene filesystem persistente: todo upload va a un
 * servicio externo. El flujo recomendado es upload firmado directo
 * del navegador al proveedor (el archivo nunca pasa por la función).
 */

export interface SignedUpload {
  /** URL a la que el navegador sube el archivo */
  uploadUrl: string;
  /** Campos extra del form (firma, timestamp, etc.) */
  fields: Record<string, string>;
  /** URL pública resultante del asset */
  publicUrl: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Genera credenciales de upload firmado para el cliente. */
  createSignedUpload(params: {
    folder: string;
    filename: string;
    contentType: string;
  }): Promise<SignedUpload>;
  deleteFile(publicUrl: string): Promise<void>;
}

class MockStorageProvider implements StorageProvider {
  readonly name = "mock";

  async createSignedUpload(params: {
    folder: string;
    filename: string;
  }): Promise<SignedUpload> {
    // En mock, el "upload" apunta a un endpoint que responde 200 y
    // la URL pública es un placeholder determinístico.
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      uploadUrl: `${base}/api/uploads/mock`,
      fields: {},
      publicUrl: `${base}/api/uploads/mock/${params.folder}/${encodeURIComponent(params.filename)}`,
    };
  }

  async deleteFile(): Promise<void> {
    // no-op
  }
}

class CloudinaryStorageProvider implements StorageProvider {
  readonly name = "cloudinary";

  async createSignedUpload(params: {
    folder: string;
    filename: string;
  }): Promise<SignedUpload> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME ?? "";
    const apiKey = process.env.CLOUDINARY_API_KEY ?? "";
    const apiSecret = process.env.CLOUDINARY_API_SECRET ?? "";
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `thepractice/${params.folder}`;

    // Firma según spec de Cloudinary: sha1 de params ordenados + secret
    const { createHash } = await import("crypto");
    const toSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = createHash("sha1").update(toSign).digest("hex");

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
      fields: {
        api_key: apiKey,
        timestamp: String(timestamp),
        folder,
        signature,
      },
      // La URL final la devuelve Cloudinary tras el upload; este placeholder
      // se reemplaza en el cliente con secure_url de la respuesta.
      publicUrl: "",
    };
  }

  async deleteFile(): Promise<void> {
    // Implementar destroy por public_id cuando se necesite.
  }
}

let provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (provider) return provider;
  switch (process.env.UPLOAD_PROVIDER) {
    case "cloudinary":
      provider = new CloudinaryStorageProvider();
      break;
    default:
      provider = new MockStorageProvider();
  }
  return provider;
}

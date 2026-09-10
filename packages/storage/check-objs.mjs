import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
const client = new S3Client({
  endpoint: "https://t3.storageapi.dev",
  region: "auto",
  forcePathStyle: false,
  credentials: {
    accessKeyId: "tid_rWchAMfevTjcUWcguFzUTkIsbvEPYOpiaFxHTqiRrGLVjSdPtG",
    secretAccessKey: "tsec_BITHJ1vcg43XSDCFu+JObBaPHq-5UAyXI88GuJOJJQCYM4IaO_MbFTSkaLQEB-k7z+y_Jf",
  },
});
const res = await client.send(new ListObjectsV2Command({ Bucket: "videos-fn-nfujwaqq6ohkxrs", Prefix: "videos/" }));
console.log((res.Contents ?? []).map(o => `${o.Key} ${o.Size} ${o.LastModified}`).join("\n") || "(empty)");

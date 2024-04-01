'use client'
import { useEffect, useState, useRef } from "react";

import {
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
    S3Client,
  } from "@aws-sdk/client-s3";
  import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
  const twentyFiveMB = 25 * 1024 * 1024;
  
  export const createString = (size = twentyFiveMB) => {
    return "x".repeat(size);
  };

  const client = new S3Client({
    region: '',
    credentials: fromCognitoIdentityPool({
      clientConfig: { region: "" },
      identityPoolId: "",
    }),
    // credentials: {

    // },
  });

  
const bucketConnectors = [
    {
      bucket: "",
      link: "",
    },
    {
      bucket: "",
      link: "",
    },
    {
      bucket: "",
      link: "",
    },
    {
      bucket: "",
      link: "",
    },
  ];
export default function LargeUploader(){
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const settingFile = (event) => {
    setFile(event.target.files[0]);
  };



  const handleUpload = async () => {
    if (!file) {
        console.error("No file selected");
        return;
    }

    const bucketName = "getstartedbucket-01";
    const key = file.name;
    const reader = new FileReader();
    const bufferPromise = new Promise((resolve, reject) => {
        reader.onload = () => {
            resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });

    try {
        await bufferPromise; // Wait for the buffer to be loaded

        const buffer = Buffer.from(reader.result);
        let uploadId;

        const multipartUpload = await client.send(
            new CreateMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
            })
        );

        uploadId = multipartUpload.UploadId;

        const uploadPromises = [];
        const partSize = Math.max(5 * 1024 * 1024, Math.ceil(buffer.byteLength / 10000)); // Minimum 5 MB part size, up to 10000 parts
        const numParts = Math.ceil(buffer.byteLength / partSize);

        for (let i = 0; i < numParts; i++) {
            const start = i * partSize;
            const end = Math.min(start + partSize, buffer.byteLength);
            uploadPromises.push(
                client
                    .send(
                        new UploadPartCommand({
                            Bucket: bucketName,
                            Key: key,
                            UploadId: uploadId,
                            Body: buffer.slice(start, end),
                            PartNumber: i + 1,
                        })
                    )
                    .then((data) => {
                        console.log("Part", i + 1, "uploaded");
                        return { ETag: data.ETag, PartNumber: i + 1 };
                    })
            );
        }

        const uploadResults = await Promise.all(uploadPromises);

        await client.send(
            new CompleteMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: uploadResults,
                },
            })
        );

        setUploadStatus("Upload completed successfully.");
    } catch (err) {
        console.error(err);

        if (uploadId) {
            const abortCommand = new AbortMultipartUploadCommand({
                Bucket: bucketName,
                Key: key,
                UploadId: uploadId,
            });

            await client.send(abortCommand);
        }

        setUploadStatus("Upload failed.");
    }
};

  // const readFileAsBuffer = (file) => {
  //   return new Promise((resolve, reject) => {
  //     const reader = new FileReader();
  //     reader.onload = () => {
  //       resolve(reader.result);
  //     };
  //     reader.onerror = reject;
  //     reader.readAsArrayBuffer(file);
  //   });
  // };
  //   // useEffect(() => { }, []);
  //    const main = async () => {
  //       const s3Client = new S3Client({});
  //       const bucketName = "test-bucket";
  //       const key = "multipart.txt";
  //       const str = createString();
  //       const buffer = Buffer.from(str, "utf8");
      
  //       let uploadId;
      
  //       try {
  //         const multipartUpload = await s3Client.send(
  //           new CreateMultipartUploadCommand({
  //             Bucket: bucketName,
  //             Key: key,
  //           }),
  //         );
      
  //         uploadId = multipartUpload.UploadId;
      
  //         const uploadPromises = [];
  //         // Multipart uploads require a minimum size of 5 MB per part.
  //         const partSize = Math.ceil(buffer.length / 5);
      
  //         // Upload each part.
  //         for (let i = 0; i < 5; i++) {
  //           const start = i * partSize;
  //           const end = start + partSize;
  //           uploadPromises.push(
  //             s3Client
  //               .send(
  //                 new UploadPartCommand({
  //                   Bucket: bucketName,
  //                   Key: key,
  //                   UploadId: uploadId,
  //                   Body: buffer.subarray(start, end),
  //                   PartNumber: i + 1,
  //                 }),
  //               )
  //               .then((d) => {
  //                 console.log("Part", i + 1, "uploaded");
  //                 return d;
  //               }),
  //           );
  //         }
      
  //         const uploadResults = await Promise.all(uploadPromises);
      
  //         return await s3Client.send(
  //           new CompleteMultipartUploadCommand({
  //             Bucket: bucketName,
  //             Key: key,
  //             UploadId: uploadId,
  //             MultipartUpload: {
  //               Parts: uploadResults.map(({ ETag }, i) => ({
  //                 ETag,
  //                 PartNumber: i + 1,
  //               })),
  //             },
  //           }),
  //         );
      
  //         // Verify the output by downloading the file from the Amazon Simple Storage Service (Amazon S3) console.
  //         // Because the output is a 25 MB string, text editors might struggle to open the file.
  //       } catch (err) {
  //         console.error(err);
      
  //         if (uploadId) {
  //           const abortCommand = new AbortMultipartUploadCommand({
  //             Bucket: bucketName,
  //             Key: key,
  //             UploadId: uploadId,
  //           });
      
  //           await s3Client.send(abortCommand);
  //         }
  //       }
  //     };
      
    return(
        <>
 
    <main >
                {/* Your UI components */}
                <input type="file" onChange={settingFile} />
                <button onClick={handleUpload}>Upload</button>
                {uploadStatus && <div>{uploadStatus}</div>}
            </main>
        </>
    )
} 
        //  <main className={styles.main}>
//       {user ? (
//         <>
//           <div className={styles.grid}>
//             {/* {objects.map((o) => (
//           <div key={o.Key}>
//             <h6>{o.Key}</h6>
//           </div>
//         ))} */}
//           </div>
//           <div>
//             <select value={selectedBucket} onChange={handleBucketChange}>
//               <option value="">Please select an option</option>
//               {bucketConnectors.map((bucket) => (
//                 <option key={bucket.bucket} value={bucket.bucket}>
//                   {bucket.bucket}
//                 </option>
//               ))}
//             </select>
//             <input type="file" onChange={settingFile} ref={fileInputRef} />
//             {uploadStatus !== "" && <> <div>Progress: {progress.toFixed(2)}%</div><p>{uploadStatus}</p></>}
//             {uploadStatus !== "Uploading" ||
//               ("" && (
//                 <div>
//                   {/* Upload status */}
//                   <p>{uploadStatus}</p>
//                 </div>
//               ))}
//             {userLink ? (
//               <>
//                 <CopyToClipboard text={userLink} onCopy={() => setCopied(true)}>
//                   <button>
//                     {" "}
//                     <FaCopy /> Copy the Link
//                   </button>
//                 </CopyToClipboard>
//                 {copied ? <span style={{ color: "red" }}>Copied.</span> : <></>}
//                 <p></p>
//               </>
//             ) : (
//               <></>
//             )}
//             <button onClick={handleUpload} disabled={buttonDisabled}>
//               Upload
//             </button>
//             <button onClick={resetUploadStatus}>Reset</button>
//             <Logout/>
//           </div>
//         </>
//       ): <Login/>}
      
//     </main>
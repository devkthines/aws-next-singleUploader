"use client";
import Image from "next/image";
import styles from "./page.module.css";
import { useEffect, useState, useRef } from "react";
import {
  ListBucketsCommand,
  ListObjectsCommand,
  ListObjectsCommandOutput,
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-providers";
import { FaCopy } from "react-icons/fa";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useUser } from "@auth0/nextjs-auth0/client";
import Login from "@/components/login";
import Logout from "@/components/logout";
import LargeUploader from "@/components/largeUpload";
const client = new S3Client({
  region: "",
  credentials: fromCognitoIdentityPool({
    clientConfig: { region: "" },
    identityPoolId: "",
  }),
  // credentials: {

  // },
});

const bucketConnectors = {{
  
    bucket: "",
    link: "",
  },

];

export default function Home() {
  const [objects, setObjects] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [selectedBucket, setSelectedBucket] = useState("");
  const [cloudFrontLink, setCloudFrontLink] = useState("");
  const [userLink, setUserLink] = useState("");
  const [buttonDisabled, setButtonDisabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const { user, error, isLoading } = useUser();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const command = new ListObjectsCommand({ Bucket: "" });
    client.send(command).then(({ Contents }) => setObjects(Contents));
  }, []);

  const resetUploadStatus = () => {
    setUploadStatus("");
    setUserLink("");
    setCloudFrontLink("");
    setSelectedBucket("");
    setCopied(false);
    setFile(null); // Reset file state to null
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset the value of the file input element
    }
    setButtonDisabled(true);
  };
  const handleBucketChange = (event) => {
    const selectedBucketName = event.target.value;
    setSelectedBucket(selectedBucketName);

    // Find the corresponding link for the selected bucket name
    const selectedLink = bucketConnectors.find(
      (connector) => connector.bucket === selectedBucketName
    )?.link;

    if (selectedLink) {
      setCloudFrontLink(selectedLink);
      console.log(cloudFrontLink);
    }
    setButtonDisabled(!selectedBucketName || !file);
  };

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const settingFile = (e) => {
    const file = e.target.files[0];
    setFile(file);
    setButtonDisabled(!selectedBucket || !file);
    setUploadStatus("");
    setCopied(false);
    console.log(file);
  };

  async function handleUpload(e) {
    // const file = e.target.files[0];
    // setFile(file);
    setUploadStatus("Uploading " + file.name);
    // console.log(file);
    // Set CORS headers
    // const headers = {
    //   'Origin': 'http://localhost:3000/',
    //   'Access-Control-Request-Method': 'POST',
    //   'Access-Control-Request-Headers': 'x-amz-meta-custom'
    // };

    // const videoTypes = ['video/mp4'];

    // if(!videoTypes.includes(file.type)) {
    //   alert('Only mp4 video files are allowed');
    //   return;
    // }
    // Before upload
    try {
      const command = new PutObjectCommand({
        Bucket: selectedBucket,
        Key: file.name,
        Body: file,
        ACL: "public-read",
        ContentType: file.type, // Set the ContentType header to match the file being uploaded
        // Metadata: {
        //   'Content-Type': 'video/mp4'
        // }
      });
      const totalBytes = file.size;
      const uploadProgress = (progress) => {
        setProgress((prevProgress) => (progress.loaded / totalBytes) * 100);
        console.log("Progress: ", progress);
      };
      await client.send(command, {
        partSize: 5 * 1024 * 1024,
        onUploadProgress: uploadProgress,
      });
      setObjects((prevObjects) => [
        ...prevObjects,
        {
          Key: file.name,
          // other props like Size, LastModified, etc
        },
      ]);
      // On success
      setUploadStatus("Success");
      setUserLink(cloudFrontLink + file.name);
      setSelectedBucket("");
      setFile(null); // Reset file state to null
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the value of the file input element
      }
      setButtonDisabled(true);
      console.log(uploadStatus);
      // await delay(1000);
      // resetUploadStatus();
    } catch (err) {
      // On error
      setSelectedBucket("");
      setFile(null); // Reset file state to null
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Reset the value of the file input element
      }
      setUploadStatus("Error");
      setButtonDisabled(true);
      // await delay(1000);
      // resetUploadStatus();
    }
  }

  if (isLoading)
    return (
      <main className={styles.main}>
        <div>Loading...</div>
      </main>
    );
  if (error)
    return (
      <main className={styles.main}>
        <div>{error.message}</div>
      </main>
    );

  return (
    <main className={styles.main}>
      {user ? (
        <>
          <div className={styles.grid}>
            {/* {objects.map((o) => (
          <div key={o.Key}>
            <h6>{o.Key}</h6>
          </div>
        ))} */}
          </div>
          <div>
            <select value={selectedBucket} onChange={handleBucketChange}>
              <option value="">Please select an option</option>
              {bucketConnectors.map((bucket) => (
                <option key={bucket.bucket} value={bucket.bucket}>
                  {bucket.bucket}
                </option>
              ))}
            </select>
            <input type="file" onChange={settingFile} ref={fileInputRef} />
            {uploadStatus !== "" && (
              <>
                {" "}
                <div>Progress: {progress.toFixed(2)}%</div>
                <p>{uploadStatus}</p>
              </>
            )}
            {uploadStatus !== "Uploading" ||
              ("" && (
                <div>
                  {/* Upload status */}
                  <p>{uploadStatus}</p>
                </div>
              ))}
            {userLink ? (
              <>
                <CopyToClipboard text={userLink} onCopy={() => setCopied(true)}>
                  <button>
                    {" "}
                    <FaCopy /> Copy the Link
                  </button>
                </CopyToClipboard>
                {copied ? <span style={{ color: "red" }}>Copied.</span> : <></>}
                <p></p>
              </>
            ) : (
              <></>
            )}
            <button onClick={handleUpload} disabled={buttonDisabled}>
              Upload
            </button>
            <button onClick={resetUploadStatus}>Reset</button>
            <Logout />
          </div>
        </>
      ) : (
        <Login />
      )}
    </main>
    // <LargeUploader/>
  );
}

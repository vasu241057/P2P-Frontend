import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { X, Upload, Download, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useParams } from "react-router-dom";

interface SendingReceivingPageProps {
  webSocket: WebSocket | null;
}

export function SendingReceivingPage({ webSocket }: SendingReceivingPageProps) {
  const { passcode } = useParams<{ passcode: string }>();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "complete" | "error"
  >("idle");
  const [downloadStatus, setDownloadStatus] = useState<
    "idle" | "downloading" | "complete" | "error"
  >("idle");
  const [fileName, setFileName] = useState("");
  const [transferId, setTransferId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const totalChunksRef = useRef(0);
  const receivedChunksRef = useRef<string[]>([]);
  const [fileType, setFileType] = useState("");

  useEffect(() => {
    if (!webSocket) {
      console.error("WebSocket not available");
      setErrorMessage("Connection error. Please try again.");
      return;
    }

    webSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received message:", message.type);

      if (message.type === "FILE_TRANSFER_INIT") {
        console.log("FILE_TRANSFER_INIT", message);
        setDownloadStatus("downloading");
        setFileName(message.fileName);
        setFileType(message.fileType);
        setTransferId(message.transferId);
        totalChunksRef.current = message.totalChunks;
        console.log("message.totalChunks", message.totalChunks);
        receivedChunksRef.current = [];
        console.log("totalChunksRef.current", totalChunksRef.current);
      } else if (message.type === "FILE_CHUNK_RECEIVED") {
        console.log("inside FILE_CHUNK_RECEIVED");
        receivedChunksRef.current.push(message.chunkData);
        const progress = Math.round(
          (receivedChunksRef.current.length / totalChunksRef.current) * 100
        );
        setDownloadProgress(progress);
        console.log(
          "Chunk received:",
          receivedChunksRef.current.length,
          "of",
          totalChunksRef.current
        );

        if (receivedChunksRef.current.length + 1 === totalChunksRef.current) {
          console.log("All chunks received, processing file...");
          setDownloadStatus("complete");
          processCompletedFile();
        }
      } else if (message.type === "FILE_TRANSFER_INIT_RECEIVED") {
        setTransferId(message.transferId);
        console.log("FILE_TRANSFER_INIT_RECEIVED");
      } else if (message.type === "ERROR") {
        console.error("Error:", message.message);
        setErrorMessage(
          message.message || "An error occurred during transfer."
        );
      }
    };

    return () => {
      // Cleanup logic if needed
    };
  }, [passcode, webSocket]);

  const processCompletedFile = () => {
    try {
      console.log("Processing completed file...");
      console.log("Number of chunks:", receivedChunksRef.current.length);
      console.log(
        "First chunk preview:",
        receivedChunksRef.current[0]?.slice(0, 50)
      );

      const completeBase64 = receivedChunksRef.current.join("");
      console.log("Complete base64 length:", completeBase64.length);

      const arrayBuffer = base64ToArrayBuffer(completeBase64);
      console.log("ArrayBuffer length:", arrayBuffer.byteLength);

      const blob = new Blob([arrayBuffer], { type: fileType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      console.log("File processing complete");
    } catch (error) {
      console.error("Error processing file:", error);
      setErrorMessage("Error processing file. Please try again.");
    }
  };

  // Helper function to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string) => {
    try {
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error("Error in base64ToArrayBuffer:", error);
      throw new Error("Failed to decode base64 string");
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setFileName(file.name);
      setUploadStatus("uploading");
      sendFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const sendFile = async (file: File) => {
    const CHUNK_SIZE = 1024 * 1024; // 1MB chunks
    totalChunksRef.current = Math.ceil(file.size / CHUNK_SIZE);

    try {
      // Send TRANSFER_FILE message
      await webSocket?.send(
        JSON.stringify({
          type: "TRANSFER_FILE",
          targetPasscode: passcode,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          totalChunks: totalChunksRef.current,
        })
      );

      const reader = new FileReader();
      let currentChunk = 0;

      reader.onload = (event) => {
        if (event.target?.readyState === FileReader.DONE) {
          const chunkData = event.target.result as ArrayBuffer;
          const uint8Array = new Uint8Array(chunkData);
          let binary = "";
          const len = uint8Array.byteLength;
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          const base64ChunkData = btoa(binary);

          // Send FILE_CHUNK message
          webSocket?.send(
            JSON.stringify({
              type: "FILE_CHUNK",
              targetPasscode: passcode,
              chunkData: base64ChunkData,
              transferId,
              chunkNumber: currentChunk,
            })
          );

          const progress = Math.round(
            ((currentChunk + 1) / totalChunksRef.current) * 100
          );
          setUploadProgress(progress);
          currentChunk++;

          if (currentChunk < totalChunksRef.current) {
            const nextSlice = file.slice(
              currentChunk * CHUNK_SIZE,
              (currentChunk + 1) * CHUNK_SIZE
            );
            reader.readAsArrayBuffer(nextSlice);
          } else {
            setUploadStatus("complete");
            setTimeout(() => {
              setUploadStatus("idle");
            }, 1200);
          }
        }
      };

      const firstSlice = file.slice(0, CHUNK_SIZE);
      console.log("firstSlice", firstSlice);
      reader.readAsArrayBuffer(firstSlice);
    } catch (error) {
      console.error("Error sending file:", error);
      setUploadStatus("error");
      setErrorMessage("An error occurred during upload.");
    }
  };

  const resetUpload = () => {
    setUploadStatus("idle");
    setUploadProgress(0);
    setFileName("");
  };

  const resetDownload = () => {
    setDownloadStatus("idle");
    setDownloadProgress(0);
    // setReceivedChunks([]);
    receivedChunksRef.current = [];
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-lg shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          P2P File Sharing
        </h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Send File
            </h2>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-blue-500 bg-blue-500 bg-opacity-10"
                  : "border-gray-600 hover:border-gray-500"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-300">
                Drag &amp; drop a file here, or click to select a file
              </p>
            </div>
            <AnimatePresence>
              {uploadStatus !== "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">{fileName}</span>
                    <span className="text-gray-400">{uploadProgress}%</span>
                  </div>
                  <Progress
                    value={uploadProgress}
                    className="h-2 bg-gray-700"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-gray-300">
                      {uploadStatus === "uploading"
                        ? "Uploading..."
                        : "Upload complete"}
                    </span>
                    <Button
                      onClick={resetUpload}
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:bg-opacity-10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              Receive File
            </h2>
            {downloadStatus === "idle" ? (
              <div className="border-2 border-gray-600 rounded-lg p-8 text-center">
                <FileIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-300 mb-4">
                  Waiting for incoming file...
                </p>
                <Button
                  // onClick={simulateDownload}
                  className="w-full py-2 text-lg"
                >
                  <Download className="h-6 w-6 mr-2" />
                  Simulate Incoming File
                </Button>
              </div>
            ) : (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">incoming_file.zip</span>
                    <span className="text-gray-400">{downloadProgress}%</span>
                  </div>
                  <Progress
                    value={downloadProgress}
                    className="h-2 bg-gray-700"
                  />
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-gray-300">
                      {downloadStatus === "downloading"
                        ? "Downloading..."
                        : "Download complete"}
                    </span>
                    <Button
                      onClick={resetDownload}
                      variant="outline"
                      size="sm"
                      className="text-red-500 border-red-500 hover:bg-red-500 hover:bg-opacity-10"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
          {errorMessage && (
            <div className="text-red-500 text-center mt-4">{errorMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
